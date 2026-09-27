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

                <form @submit.prevent="continueToSessions" v-if="!isValidating && isTokenValid && step === 'password'"
                    v-animate-height>
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

                    <button type="submit" class="btn btn-primary" :disabled="loadingDevices || loading">
                        {{ loadingDevices ? "Carregando..." : "Continuar" }}
                    </button>

                    <LoadingResponse :msg="response" :type="responseType" styletype="small" :loading="loading" />
                </form>

                <form @submit.prevent="submitReset" v-if="!isValidating && isTokenValid && step === 'sessions'"
                    v-animate-height>
                    <h2>E os outros dispositivos?</h2>
                    <p class="subtitle">
                        A senha só muda quando você confirmar abaixo. Escolha o que acontece com quem está conectado à
                        sua conta.
                    </p>

                    <fieldset class="session-choices" :disabled="loading || done">
                        <label class="choice" :class="{ active: scope === 'all' }">
                            <input v-model="scope" type="radio" value="all">
                            <span class="choice-text">
                                Desconectar todos os dispositivos
                                <small>Recomendado. Todos precisarão entrar de novo com a nova senha.</small>
                            </span>
                        </label>

                        <label v-if="devices.length" class="choice" :class="{ active: scope === 'selected' }">
                            <input v-model="scope" type="radio" value="selected">
                            <span class="choice-text">
                                Escolher quais dispositivos desconectar
                                <small>Os demais continuam conectados.</small>
                            </span>
                        </label>

                        <div v-if="scope === 'selected'" class="device-list">
                            <label v-for="device in devices" :key="device.id" class="device">
                                <input v-model="selectedDevices" type="checkbox" :value="device.id">
                                <span class="device-text">
                                    <span>{{ device.label }}<em v-if="device.is_current"> (este dispositivo)</em></span>
                                    <small>{{ deviceLine(device) }}</small>
                                </span>
                            </label>
                        </div>

                        <label class="choice" :class="{ active: scope === 'none' }">
                            <input v-model="scope" type="radio" value="none">
                            <span class="choice-text">
                                Manter todos conectados
                                <small>Não recomendado se você suspeita que a senha vazou.</small>
                            </span>
                        </label>
                    </fieldset>

                    <p v-if="devicesError" class="hint">{{ devicesError }}</p>
                    <p v-if="scope !== 'none'" class="hint">
                        Os dispositivos desconectados também deixam de ser confiáveis e voltam a pedir a verificação
                        em duas etapas.
                    </p>

                    <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
                        {{ loading ? "Redefinindo..." : "Redefinir Senha" }}
                    </button>
                    <button type="button" class="btn" :disabled="loading || done" @click="backToPassword">Voltar</button>

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
import { securityService } from "@/services/securityService";

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
            // Passo 1: nova senha. Passo 2: o que fazer com os dispositivos conectados (a senha só muda no final).
            step: "password",
            // Por segurança começa em "todos": quem redefine por e-mail costuma suspeitar do acesso à conta.
            scope: "all",
            devices: [],
            selectedDevices: [],
            devicesError: "",
            loadingDevices: false,
            done: false,
            response: "",
            responseType: "",
            loading: false
        }
    },
    computed: {
        canSubmit() {
            if (this.loading || this.done) return false;
            return this.scope !== "selected" || this.selectedDevices.length > 0;
        },
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
        passwordError() {
            if (this.password.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
            if (this.password !== this.repeatPassword) return "As senhas não conferem.";
            if (this.checkPasswordStrength(this.password).class !== 'strong') {
                return "Sua senha não é forte. Deve conter maiúscula, minúscula, número e caractere especial (!@#$%&*).";
            }
            return "";
        },
        deviceLine(device) {
            const status = device.connected ? "conectado" : "desconectado";
            const parts = [status + (device.trusted ? " · confiável" : "")];
            if (device.location) parts.push(device.location);
            if (device.last_seen_at) parts.push(new Date(device.last_seen_at).toLocaleString("pt-BR"));
            return parts.join(" · ");
        },
        // Valida a senha e mostra a escolha das sessões. A senha ainda NÃO foi alterada aqui: tudo vai numa
        // única requisição no final, então nunca existe um momento com a senha nova e as sessões antigas vivas.
        async continueToSessions() {
            this.resetResponse();

            const problem = this.passwordError();
            if (problem) {
                this.setResponse("error", problem, false);
                return;
            }

            this.loadingDevices = true;
            this.devicesError = "";

            try {
                this.devices = await securityService.getResetDevices({ email: this.email, token: this.token });
            } catch (error) {
                this.devices = [];
                if (error.response?.status === 400) {
                    this.setResponse("error", error.response?.data?.message || "Token inválido ou expirado.", false);
                    return;
                }
                this.devicesError = "Não foi possível carregar a lista de dispositivos; só é possível desconectar todos ou nenhum.";
            } finally {
                this.loadingDevices = false;
            }

            // Sem dispositivos conectados ou confiáveis não há o que perguntar.
            if (!this.devices.length && !this.devicesError) {
                this.scope = "all";
                await this.submitReset();
                return;
            }

            this.selectedDevices = this.devices.map((device) => device.id);
            this.step = "sessions";
        },
        backToPassword() {
            this.resetResponse();
            this.step = "password";
        },
        // O dispositivo em que esta página está aberta perde a sessão se a escolha o inclui.
        endsCurrentSession() {
            if (this.scope === "all") return true;
            if (this.scope !== "selected") return false;

            const current = this.devices.find((device) => device.is_current);
            return Boolean(current) && this.selectedDevices.includes(current.id);
        },
        async submitReset() {
            this.resetResponse();

            const problem = this.passwordError();
            if (problem) {
                this.step = "password";
                this.setResponse("error", problem, false);
                return;
            }

            this.setResponse("", "", true);

            try {
                const payload = {
                    email: this.email,
                    token: this.token,
                    password: this.password,
                    revoke_scope: this.scope,
                };
                if (this.scope === "selected") payload.device_ids = this.selectedDevices;

                const endsSession = this.endsCurrentSession();
                const response = await api.post('/auth/reset_password', payload);

                this.done = true;
                this.setResponse(
                    "success",
                    response.data.message + " Ao entrar de novo, o Kadem vai pedir seu Código de Recuperação (Senha Mestra) para migrar o Cofre.",
                    false,
                );

                setTimeout(() => {
                    // Se esta sessão foi encerrada, limpa o app local. Se foi mantida, volta para dentro (quem não está
                    // conectado neste navegador cai na tela de login pelo guard do router).
                    if (endsSession) this.logout(true);
                    else this.$router.push("/");
                }, 3500);

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

    & .form-group label {
        color: var(--black);
    }

    & .btn {
        background-color: var(--background-gray);
        color: var(--black);
    }

    & .btn.btn-primary {
        background-image: var(--deep-blue-gradient);
        color: var(--white);
    }
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

.hint {
    margin: var(--space-3) 0 0;
    color: var(--gray-100);
    font-size: var(--fontsize-xs);
    line-height: 1.5;
}

.session-choices {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
    margin: 0;
    padding: 0;
    border: none;
}

.choice,
.device {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    color: var(--black);
    cursor: pointer;
}

.choice {
    padding: var(--space-4);
    border: 1.5px solid rgba(31, 39, 76, 0.16);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.55);
    transition: border-color 0.15s ease, background 0.15s ease;
}

.choice.active {
    border-color: var(--deep-blue);
    background: rgba(31, 39, 76, 0.07);
}

.choice-text,
.device-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: var(--fontsize-xs);
    font-weight: 600;
    overflow-wrap: anywhere;
}

.choice-text small,
.device-text small {
    color: var(--gray-100);
    font-size: 0.72rem;
    font-weight: 400;
    line-height: 1.45;
}

.device-text em {
    color: var(--deep-blue);
    font-style: normal;
    font-weight: 600;
}

.device-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0 0 0 var(--space-8);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-sm);
    background: rgba(31, 39, 76, 0.05);
}

/* O CSS global de formulários estica todo <input>: radios e checkboxes precisam voltar ao tamanho nativo. */
.choice input[type="radio"],
.device input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    box-sizing: border-box;
    display: grid;
    flex: 0 0 20px;
    place-content: center;
    width: 20px;
    height: 20px;
    margin: 0;
    padding: 0;
    border: 2px solid var(--deep-blue);
    background: var(--white);
    box-shadow: none;
    cursor: pointer;
}

.choice input[type="radio"] {
    margin-top: 1px;
    border-radius: 50%;
}

.choice input[type="radio"]:checked {
    background: radial-gradient(circle, var(--deep-blue) 0 45%, var(--white) 50%);
}

.device input[type="checkbox"] {
    border-radius: 4px;
}

.device input[type="checkbox"]:checked {
    background: var(--deep-blue);
}

.device input[type="checkbox"]:checked::after {
    width: 8px;
    height: 4px;
    border: solid var(--white);
    border-width: 0 0 2px 2px;
    content: "";
    transform: rotate(-45deg) translate(1px, -1px);
}

.choice input:focus-visible,
.device input:focus-visible {
    outline: 2px solid var(--deep-blue);
    outline-offset: 2px;
}

form .btn + .btn {
    margin-top: var(--space-3);
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
