import { defineStore } from 'pinia';
import { api } from "../plugins/api";
import router from "../router/index";
import { useWindowStore } from './windows';
import { syncService } from '../services/syncService';

import {
    userRepository,
    occupationRepository,
    medalRepository,
    syncQueueRepository
} from '../services/localData';

export const useAuthStore = defineStore('auth', {
    // --- State ---
    state: () => ({
        user: {},
        isAuthenticated: null,
    }),

    // --- Getters ---
    getters: {
        isLoggedIn: (state) => state.isAuthenticated === true,
    },

    // --- Actions ---
    actions: {

        // --- 1. Funções de Autenticação (Core Auth) ---

        async login(email, password) {
            try {
                const response = await api.post('/auth/login', { email, password });
                await this._saveUserData(response.data.returnObj);
                return response;
            } catch (error) {
                this.user = {};
                this.isAuthenticated = false;
                throw error;
            }
        },

        async register(userData) {
            try {
                let response = await api.post('/auth/register', userData);
                return response;
            } catch (error) {
                throw error;
            }
        },

        async logout() {
            const windowStore = useWindowStore();
            const userIdToClear = this.user?.id;

            try {
                await api.post('/auth/logout');
            } catch (error) {
                console.warn('Erro ao chamar API de logout, deslogando localmente.', error);
            } finally {
                if (userIdToClear) {
                    windowStore.clearWindowsForUser(userIdToClear);
                }

                await Promise.all([
                    userRepository.clearLocalProfile(),
                    occupationRepository.clearLocalUserOccupations(),
                    medalRepository.clearLocalMedals(),
                    syncQueueRepository.clearSyncQueue()
                ]);

                this.user = {};
                this.isAuthenticated = false;
                router.push("/auth");
            }
        },

        // --- 2. Funções de Sincronização e Status (Data Flow) ---

        async checkAuthStatus() {
            if (this.isAuthenticated !== null) {
                return;
            }

            try {
                const localUser = await userRepository.getLocalUserProfile();

                if (localUser) {
                    const localOccupations = await occupationRepository.getLocalUserOccupations();
                    const localMedals = await medalRepository.getLocalMedals();

                    this.user = {
                        ...localUser,
                        occupations: localOccupations,
                        medals: localMedals
                    };
                    this.isAuthenticated = true;

                    if (navigator.onLine) {
                        try {
                            // PUSH PRIMEIRO (Front -> Back)
                            await syncService.processSyncQueue();
                            // PULL DEPOIS (Back -> Front)
                            this.syncProfile();
                        } catch (syncError) {
                            console.error("Falha na orquestração PUSH-PULL:", syncError);
                            this.syncProfile();
                        }
                    }
                } else {
                    const response = await api.get('/users/profile');
                    await this._saveUserData(response.data.returnObj);
                }

            } catch (error) {
                this.user = {};
                this.isAuthenticated = false;
            }
        },

        async syncProfile() {
            try {
                const response = await api.get('/users/profile');
                await this._saveUserData(response.data.returnObj);
            } catch (error) {
                console.log('Falha ao sincronizar perfil em background. Usando dados locais.');
            }
        },

        async _saveUserData(apiUserData) {
            const { occupations, medals, ...profileData } = apiUserData;

            await userRepository.saveLocalUserProfile(profileData);
            await occupationRepository.mergeApiOccupations(occupations || []);
            await medalRepository.setLocalMedals(medals || []);

            const mergedOccupations = await occupationRepository.getLocalUserOccupations();
            const mergedMedals = await medalRepository.getLocalMedals();

            this.user = {
                ...profileData,
                occupations: mergedOccupations,
                medals: mergedMedals
            };
            this.isAuthenticated = true;
        },

        // --- 3. Funções de Mutação de Dados do Usuário (Offline PUSH) ---

        async updateUserBio(newBio) {
            const currentUser = this.user;
            const { occupations, medals, ...profileData } = currentUser;

            const recordLastUpdated = profileData.updated_at;

            const updatedProfileData = { ...profileData, bio: newBio };
            const updatedUserForState = { ...updatedProfileData, occupations, medals };

            try {
                await userRepository.saveLocalUserProfile(updatedProfileData);
                this.setUser(updatedUserForState);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'UPDATE_USER_BIO',
                    payload: {
                        newBio: newBio,
                        recordLastUpdated: recordLastUpdated
                    },
                    userId: currentUser.id,
                    timestamp: new Date().toISOString()
                });

                syncService.processSyncQueue();
            } catch (error) {
                console.error("Falha ao salvar bio localmente:", error);
            }
        },

        async addNewOccupation(occupationName) {
            if (!occupationName || occupationName.trim() === '') return;

            const newOccupationData = {
                name: occupationName,
                user_id: this.user.id,
                id: null
            };

            try {
                const newLocalId = await occupationRepository.addLocalUserOccupation(newOccupationData);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_OCCUPATION',
                    payload: {
                        name: occupationName,
                        user_id: this.user.id
                    },
                    timestamp: new Date().toISOString()
                });

                this.user.occupations.push({
                    ...newOccupationData,
                    localId: newLocalId
                });

                syncService.processSyncQueue();
            } catch (error) {
                console.error("Falha ao adicionar ocupação local:", error);
            }
        },

        async removeOccupation(occupation) {
            try {
                await occupationRepository.deleteLocalUserOccupation(occupation.localId);

                if (occupation.id) {
                    await syncQueueRepository.addSyncQueueTask({
                        type: 'DELETE_OCCUPATION',
                        payload: {
                            id: occupation.id
                        },
                        timestamp: new Date().toISOString()
                    });
                }

                this.user.occupations = this.user.occupations.filter(
                    o => o.localId !== occupation.localId
                );

                syncService.processSyncQueue();
            } catch (error) {
                console.error("Falha ao remover ocupação local:", error);
            }
        },

        async updateUserProfile(dataToUpdate) {
            const currentUser = this.user;

            // Separa os dados para salvar corretamente
            const { occupations, medals, ...profileData } = currentUser;
            const updatedProfileData = { ...profileData, ...dataToUpdate };
            const updatedUserForState = { ...updatedProfileData, occupations, medals };

            const recordLastUpdated = profileData.updatedAt;

            await userRepository.saveLocalUserProfile(updatedProfileData);
            this.setUser(updatedUserForState);

            await syncQueueRepository.addSyncQueueTask({
                type: 'UPDATE_USER_PROFILE',
                payload: {
                    newData: dataToUpdate,
                    recordLastUpdated: recordLastUpdated
                },
                userId: currentUser.id,
                timestamp: new Date().toISOString()
            });

            syncService.processSyncQueue();
        },

        // --- 4. Funções de Mutação de Estado (Setters) ---

        setUser(user) {
            this.user = user;
        },
    }
});