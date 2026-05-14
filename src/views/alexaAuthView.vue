<template>
    <section class="auth">
        <div class="glass auth-container">
            <div class="auth-header">
                <div class="alexa-badge">Conectar Alexa</div>
                <img src="../assets/images/kadem-logo.png" alt="Kadem" />
            </div>

            <div class="auth-body">
                <form v-if="!success" @submit.prevent="handleAlexaLogin">
                    <h2>Entre com sua conta Kadem</h2>

                    <LoadingResponse :msg="error" type="error" styletype="small" :loading="loading" />

                    <div class="form-group" v-if="isPairingMode">
                        <input
                            type="text"
                            id="pairing-code"
                            v-model="pairingCode"
                            placeholder=""
                            inputmode="numeric"
                            maxlength="6"
                            required
                        />
                        <label for="pairing-code">Codigo da Alexa</label>
                    </div>

                    <div class="form-group">
                        <input type="email" id="email" v-model="email" placeholder="" required />
                        <label for="email">E-mail</label>
                    </div>

                    <div class="form-group password-group">
                        <input :type="passwordFieldType" id="password" v-model="password" placeholder="" required />
                        <label for="password">Senha</label>
                        <font-awesome-icon
                            :icon="passwordFieldType === 'password' ? 'eye' : 'eye-slash'"
                            class="password-icon"
                            @click="togglePassword"
                        />
                    </div>

                    <button type="submit" class="btn btn-primary" :disabled="loading">
                        {{ loading ? "Vinculando..." : "Vincular Conta" }}
                    </button>
                </form>

                <div v-else class="success-state">
                    <h2>Conta vinculada</h2>
                    <p>{{ success }}</p>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
import LoadingResponse from "@/components/loadingResponse.vue";
import { api } from "../plugins/api";

export default {
    name: "AlexaAuthView",
    components: {
        LoadingResponse,
    },
    data() {
        return {
            email: "",
            password: "",
            error: "",
            loading: false,
            passwordFieldType: "password",
            redirectUri: "",
            stateParam: "",
            clientId: "",
            responseType: "",
            scope: "",
            pairingCode: "",
            success: "",
        };
    },
    computed: {
        isOAuthMode() {
            return !!this.redirectUri || !!this.stateParam;
        },
        isPairingMode() {
            return !this.isOAuthMode;
        },
    },
    mounted() {
        const params = new URLSearchParams(window.location.search);

        this.redirectUri = params.get("redirect_uri") || "";
        this.stateParam = params.get("state") || "";
        this.clientId = params.get("client_id") || "";
        this.responseType = params.get("response_type") || "";
        this.scope = params.get("scope") || "";
        this.pairingCode = (params.get("code") || "").replace(/\D/g, "").slice(0, 6);

        console.log("[Alexa Auth Params]", {
            redirectUri: this.redirectUri,
            state: this.stateParam,
            clientId: this.clientId,
            responseType: this.responseType,
            scope: this.scope,
            pairingCode: this.pairingCode ? "present" : "missing",
        });

        if (this.isPairingMode) {
            return;
        }

        if (!this.redirectUri || !this.stateParam) {
            this.error = "Parametros de vinculo ausentes. Inicie pelo app da Alexa.";
            return;
        }

        if (this.clientId !== "alexa") {
            this.error = "client_id invalido.";
            return;
        }

        if (this.responseType !== "code") {
            this.error = "response_type invalido.";
        }
    },
    methods: {
        togglePassword() {
            this.passwordFieldType = this.passwordFieldType === "password" ? "text" : "password";
        },
        async handleAlexaLogin() {
            if (this.isOAuthMode && (!this.redirectUri || !this.stateParam)) return;

            if (this.isPairingMode) {
                this.pairingCode = this.pairingCode.replace(/\D/g, "").slice(0, 6);

                if (this.pairingCode.length !== 6) {
                    this.error = "Informe o codigo de 6 digitos que a Alexa mostrou.";
                    return;
                }
            }

            this.loading = true;
            this.error = "";

            try {
                const response = await api.post("/auth/login", {
                    email: this.email,
                    password: this.password,
                    is_alexa: this.isOAuthMode,
                });

                const { token } = response.data;

                if (!token) {
                    this.error = "Login OK, mas nenhum token foi retornado.";
                    return;
                }

                if (this.isPairingMode) {
                    await api.post("/alexa/link", {
                        code: this.pairingCode,
                        token,
                    });

                    this.success = "Agora volte para a Alexa e peca a musica novamente.";
                    return;
                }

                const amazonUrl = new URL(this.redirectUri);
                amazonUrl.searchParams.set("state", this.stateParam);
                amazonUrl.searchParams.set("code", token);

                window.location.href = amazonUrl.toString();
            } catch (err) {
                this.error = err.response?.data?.message || "Erro ao vincular.";
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>

<style scoped>
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

    & .auth-container {
        padding: var(--space-6);
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
        width: 99%;
        height: fit-content;
        max-width: 50dvw;

        & .auth-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-8);
            user-select: none;

            & img {
                width: calc(5rem + 5vw);
                pointer-events: none;
            }
        }

        & .auth-body {
            & form {
                display: flex;
                flex-direction: column;
                transition: opacity 0.3s ease-in-out;

                & h2 {
                    margin-bottom: var(--space-6);
                }
            }
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

.success-state {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
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

.alexa-badge {
    background: #00CAFF;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: var(--fontsize-xs);
    margin-bottom: var(--space-4);
    font-weight: bold;
}
</style>
