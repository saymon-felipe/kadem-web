<template>
    <div class="account-center-container">
        <div v-if="!vault.isUnlocked" class="vault-lock-screen">
            <h3>Cofre Trancado</h3>
            <p>Digite sua Senha para desbloquear a Central de Contas.</p>

            <div class="form-group password-group">
                <div class="form-group">
                    <input :type="passwordFieldType" v-model="masterPasswordInput" placeholder=""
                        @keyup.enter="handleUnlock" />
                    <label>Senha</label>
                    <p v-if="error" class="error-message">{{ error }}</p>
                </div>
                <font-awesome-icon icon="eye" class="password-icon" @mousedown="showPassword" @mouseup="hidePassword"
                    @mouseleave="hidePassword" />
            </div>
            <button @click="handleUnlock" :disabled="isLoading" class="btn-small btn-save">
                {{ isLoading ? "Desbloqueando..." : "Desbloquear" }}
            </button>
        </div>
        <div v-else class="vault-unlocked-screen">
            <div class="form-group">
                <input type="text" placeholder="" class="search-bar" v-model="searchQuery" />
                <label>Filtrar Nome ou email</label>
            </div>
            <AccountList :accounts="filteredAccounts" class="mt-4" />
            <div class="buttons">
                <button @click="showAddModal = true" class="btn-small btn-cancel">
                    Adicionar Conta
                </button>
                <button @click="vault.lockVault()" class="btn-small btn-save">
                    Trancar Cofre
                </button>
            </div>
            <SideModal v-model="showAddModal" @close="showAddModal = false">
                <AccountForm @close="showAddModal = false" @save="handleSaveNewAccount" />
            </SideModal>
        </div>
    </div>
</template>

<script>
import { useVaultStore } from "@/stores/vault";
import { useAuthStore } from "@/stores/auth";
import AccountList from "./AccountList.vue";
import AccountForm from "./AccountForm.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import SideModal from "@/components/SideModal.vue";

export default {
    name: "AccountCenter",
    components: {
        SideModal,
        AccountList,
        AccountForm,
        FontAwesomeIcon,
    },
    setup() {
        const vault = useVaultStore();
        const auth = useAuthStore();
        return { vault, auth };
    },
    data() {
        return {
            masterPasswordInput: "",
            passwordFieldType: "password",
            isLoading: false,
            error: null,
            showAddModal: false,
            searchQuery: "",
        };
    },
    computed: {
        filteredAccounts() {
            if (!this.searchQuery) {
                return this.vault.accounts;
            }
            const q = this.searchQuery.toLowerCase();
            return this.vault.accounts.filter(
                (acc) =>
                    acc.name.toLowerCase().includes(q) ||
                    acc.user.toLowerCase().includes(q)
            );
        },
    },
    mounted: function () {
    },
    methods: {
        showPassword() {
            this.passwordFieldType = "text";
        },
        hidePassword() {
            this.passwordFieldType = "password";
        },

        async handleUnlock() {
            if (this.isLoading || !this.masterPasswordInput) return;

            this.isLoading = true;
            this.error = null;

            try {
                const userSalt = this.auth.user.email;
                await this.vault.unlockVault(this.masterPasswordInput, userSalt);
            } catch (err) {
                this.error = err.message;
            } finally {
                this.isLoading = false;
                this.masterPasswordInput = "";
            }
        },

        async handleSaveNewAccount(accountData) {
            try {
                await this.vault.createAccount(accountData);
                this.showAddModal = false;
            } catch (err) {
                console.error("Erro ao salvar conta:", err);
            }
        },
    },
};
</script>

<style scoped>
.password-group {
    position: relative;
    width: 100%;

    & .error-message {
        position: absolute;
        top: 120%;
        right: 0;
        color: var(--red);
    }
}

.password-icon {
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    color: #333;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
    user-select: none;
}

.password-icon:hover {
    opacity: 1;
}

.buttons {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
}
</style>
