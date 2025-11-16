<template>
    <section class="auth">
        <div class="glass auth-container">
            <div class="auth-header">
                <img src="../assets/images/kadem-logo.png" alt="Kadem">
            </div>
            <div class="auth-body">

                <div v-if="isValidating" class="loading-container">
                    <LoadingSpinner />
                    <p>Validando token...</p>
                </div>

                <form @submit.prevent="submitReset" v-if="!isValidating && isTokenValid" v-animate-height>
                    <h2>Redefinir Senha</h2>

                    <div class="form-group password-group">
                        <input :type="passwordFieldType" id="password" v-model="password"
                            @input="updatePasswordStrength" maxlength="255" placeholder="" required minlength="6">
                        <label for="password">Nova Senha</label>
                        <font-awesome-icon icon="eye" class="password-icon" @mousedown="showPassword"
                            @mouseup="hidePassword" @mouseleave="hidePassword" />
                    </div>

                    <div v-if="password.length > 0" class="strength-meter">
                        <div class="strength-bar" :class="passwordStrength.class"></div>
                        <span>Força: <strong>{{ passwordStrength.text }}</strong></span>
                    </div>

                    <div class="form-group password-group">
                        <input :type="repeatPasswordFieldType" id="repeat-password" v-model="repeatPassword"
                            maxlength="255" placeholder="" required>
                        <label for="repeat-password">Repita a nova senha</label>
                        <font-awesome-icon icon="eye" class="password-icon" @mousedown="showRepeatPassword"
                            @mouseup="hideRepeatPassword" @mouseleave="hideRepeatPassword" />
                    </div>

                    <button type="submit" class="btn btn-primary">Redefinir Senha</button>

                    <LoadingResponse :msg="response" :type="responseType" styletype="small" :loading="loading" />
                </form>

                <div v-if="!isValidating && !isTokenValid" class="error-container">
                    <LoadingResponse :msg="response" type="error" :loading="false" />
                    <button class="btn" @click="logout(true);">
                        Voltar para Login
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
import LoadingResponse from "@/components/loadingResponse.vue";
import LoadingSpinner from "@/components/loadingSpinner.vue";
import { mapActions } from 'pinia';
import { api } from '@/plugins/api';
import { useAuthStore } from "@/stores/auth";

export default {
    components: {
        LoadingResponse,
        LoadingSpinner
    },
    data() {
        return {
            isValidating: true,
            isTokenValid: false,
            token: null,
            email: null,
            password: "",
            repeatPassword: "",
            passwordFieldType: "password",
            repeatPasswordFieldType: "password",
            passwordStrength: { text: "", class: "" },
            response: "",
            responseType: "",
            loading: false
        }
    },
    mounted() {
        const urlToken = this.$route.query.token;
        const urlEmail = this.$route.query.email;

        if (!urlToken || !urlEmail) {
            this.setResponse("error", "Link de redefinição inválido ou incompleto.", false);
            this.isValidating = false;
            this.isTokenValid = false;
            return;
        }

        this.token = urlToken;
        this.email = decodeURIComponent(urlEmail);

        this.validateToken();
    },
    methods: {
        ...mapActions(useAuthStore, ['logout']),
        showPassword() { this.passwordFieldType = 'text'; },
        hidePassword() { this.passwordFieldType = 'password'; },
        showRepeatPassword() { this.repeatPasswordFieldType = 'text'; },
        hideRepeatPassword() { this.repeatPasswordFieldType = 'password'; },
        checkPasswordStrength: (password) => {
            let score = 0;
            if (!password) return { text: "", class: "" };
            if (password.length >= 6) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[a-z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[!@#$%&*]/.test(password)) score++;
            if (score <= 2) return { text: "Fraca", class: "weak" };
            if (score <= 4) return { text: "Média", class: "medium" };
            return { text: "Forte", class: "strong" };
        },
        updatePasswordStrength() {
            this.passwordStrength = this.checkPasswordStrength(this.password);
        },
        setResponse(type, msg, loading) {
            this.responseType = type;
            this.response = msg;
            this.loading = loading;
        },
        resetResponse() {
            this.setResponse("", "", false);
        },
        async validateToken() {
            this.isValidating = true;
            this.resetResponse();

            try {
                const payload = {
                    email: this.email,
                    token: this.token
                };

                await api.post('/auth/validate_reset_token', payload);

                this.isTokenValid = true;

            } catch (error) {
                const errorMsg = error.response?.data?.message || "Token inválido ou expirado.";
                this.setResponse("error", errorMsg, false);
                this.isTokenValid = false;
            } finally {
                this.isValidating = false;
            }
        },
        async submitReset() {
            this.resetResponse();

            //
            if (this.password.length < 6) {
                this.setResponse("error", "A senha deve ter no mínimo 6 caracteres.", false);
                return;
            }
            if (this.password !== this.repeatPassword) {
                this.setResponse("error", "As senhas não conferem.", false);
                return;
            }
            const strength = this.checkPasswordStrength(this.password);
            if (strength.class !== 'strong') {
                this.setResponse("error", "Sua senha não é forte. Deve conter maiúscula, minúscula, número e caractere especial (!@#$%&*).", false);
                return;
            }

            this.setResponse("", "", true);

            try {
                const payload = {
                    email: this.email,
                    token: this.token,
                    password: this.password
                };

                const response = await api.post('/auth/reset_password', payload);

                this.setResponse("success", response.data.message, false);

                setTimeout(() => {
                    this.logout(true);
                }, 2500);

            } catch (error) {
                const errorMsg = error.response?.data?.message || error.message || "Ocorreu um erro desconhecido.";
                this.setResponse("error", errorMsg, false);
            }
        }
    }
}
</script>

<style scoped>
.loading-container,
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    padding: var(--space-8);
    text-align: center;
}

.error-container .btn {
    width: 100%;
}

.subtitle {
    font-size: var(--fontsize-sm);
    color: var(--text-gray);
    margin-bottom: var(--space-4);
    text-align: center;
}

form {
    & button[type="submit"] {
        margin-top: var(--space-3);
    }
}

.auth {
    overflow: hidden;
    width: 100dvw;
    height: 100dvh;
    display: grid;
    place-items: center;
    background-image: url("../assets/images/fundo-auth.webp");
    background-position: center center;
    background-size: cover;
    background-repeat: no-repeat;
}

.auth-container {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    width: 99%;
    height: fit-content;
    max-width: 50dvw;
}

.auth-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    user-select: none;

    & img {
        width: calc(5rem + 5vw);
        pointer-events: none;
    }
}

.auth-body {
    & form {
        display: flex;
        flex-direction: column;
        transition: opacity 0.3s ease-in-out;

        & h2 {
            margin-bottom: var(--space-6);
        }
    }
}

.password-group {
    position: relative;
}

.password-icon {
    position: absolute;
    top: 50%;
    right: 15px;
    transform: translateY(-50%);
    color: var(--black);
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
    user-select: none;
}

.password-icon:hover {
    opacity: 1;
}

.strength-meter {
    margin: var(--space-2);
    font-size: var(--fontsize-xs);
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--black);
}

.strength-bar {
    flex-grow: 1;
    height: 6px;
    border-radius: 3px;
    background-color: var(--background-gray);
    width: 100%;
}

.strength-bar.weak {
    background-color: var(--red);
}

.strength-bar.medium {
    background-color: var(--orange);
}

.strength-bar.strong {
    background-color: var(--green);
}

.strength-meter span {
    white-space: nowrap;
}

@media (max-width: 960px) {
    .auth-container {
        max-width: 75dvw !important;
    }
}

@media (max-width: 570px) {
    .auth-header {
        flex-direction: column-reverse;
    }

    .auth-container {
        max-width: 99dvw !important;
        min-height: 99dvh !important;
    }
}
</style>