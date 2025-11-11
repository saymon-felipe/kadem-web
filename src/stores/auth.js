import { defineStore } from 'pinia';
import { api } from "../plugins/api";
import router from "../router/index";
import { useWindowStore } from './windows';
import { useUtilsStore } from './utils';
import { syncService } from '../services/syncService';
import { useProjectStore } from './projects';

import {
    userRepository,
    occupationRepository,
    medalRepository,
    syncQueueRepository,
    projectRepository
} from '../services/localData';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: {},
        isAuthenticated: null,
    }),
    getters: {
        isLoggedIn: (state) => state.isAuthenticated === true,
    },
    actions: {
        async login(email, password) {
            try {
                const response = await api.post('/auth/login', { email, password });
                await this._saveUserData(response.data);
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

        async logout(force = false) {
            const windowStore = useWindowStore();
            const projectStore = useProjectStore();
            const userIdToClear = this.user?.id;

            try {
                if (!force) {
                    await api.post('/auth/logout');
                }
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
                    syncQueueRepository.clearSyncQueue(),
                    projectRepository.clearLocalProjects()
                ]);

                this.user = {};
                this.isAuthenticated = false;
                projectStore.projects = [];

                router.push("/auth");
            }
        },
        async checkAuthStatus() {
            if (this.isAuthenticated !== null) {
                return;
            }

            try {
                const localUser = await userRepository.getLocalUserProfile();
                const projectStore = useProjectStore();
                const utilsStore = useUtilsStore();

                if (utilsStore.connection.connected) {
                    try {
                        await syncService.processSyncQueue();
                        this.syncProfile();
                        projectStore.pullProjects();
                    } catch (syncError) {
                        console.error("Falha na orquestração PUSH-PULL:", syncError);
                        this.syncProfile();
                        projectStore.pullProjects();
                    }
                } else {
                    await projectStore._loadProjectsFromDB();
                }

                if (localUser) {
                    const localOccupations = await occupationRepository.getLocalUserOccupations();
                    const localMedals = await medalRepository.getLocalMedals();

                    this.user = {
                        ...localUser,
                        occupations: localOccupations,
                        medals: localMedals
                    };

                    this.isAuthenticated = true;
                }
            } catch (error) {
                this.user = {};
                this.isAuthenticated = false;
            }
        },
        async syncProfile() {
            try {
                const response = await api.get('/users/profile');
                await this._saveUserData(response.data);
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
        async updateUserBio(newBio) {
            const currentUser = this.user;
            const { occupations, medals, ...profileData } = currentUser;
            const updatedProfileData = { ...profileData, bio: newBio };
            const updatedUserForState = { ...updatedProfileData, occupations, medals };

            try {
                await userRepository.saveLocalUserProfile(updatedProfileData);
                this.setUser(updatedUserForState);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'SYNC_PROFILE_CHANGE',
                    payload: {
                        field: 'bio',
                        value: newBio,
                        timestamp: new Date().toISOString()
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
                id: null
            };

            try {
                const newLocalId = await occupationRepository.addLocalUserOccupation(newOccupationData);

                await syncQueueRepository.addSyncQueueTask({
                    type: 'CREATE_OCCUPATION',
                    payload: {
                        name: occupationName
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
        setUser(user) {
            this.user = user;
        },
    }
});