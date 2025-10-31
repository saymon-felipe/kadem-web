import { defineStore } from 'pinia';
import { api } from "../plugins/api";
import router from "../router/index";
import { useWindowStore } from './windows';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: {},
        isAuthenticated: null,
    }),
    getters: {
        isLoggedIn: (state) => state.isAuthenticated === true,
    },
    actions: {
        setUser(user) {
            this.user = user;
        },
        async login(email, password) {
            try {
                const response = await api.post('/auth/login', { email, password });
                this.user = response.data.returnObj;
                this.isAuthenticated = true;
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

                this.user = {};
                this.isAuthenticated = false;
                router.push("/login");
            }
        },
        async checkAuthStatus() {
            if (this.isAuthenticated !== null) {
                return;
            }

            try {
                const response = await api.get('/users/profile');
                this.user = response.data.returnObj;
                this.isAuthenticated = true;
            } catch (error) {
                this.user = {};
                this.isAuthenticated = false;
            }
        },
    }
});
