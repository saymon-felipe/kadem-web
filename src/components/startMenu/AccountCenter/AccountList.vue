<template>
    <div class="account-list">
        <div v-if="!vault.accounts.length" class="empty-state">
            <p>Nenhuma conta salva. Clique em "Adicionar Conta" para começar.</p>
        </div>
        <div v-for="account in accounts" :key="account.localId" class="account-item">
            <div class="account-info">
                <img :src="returnAccountTypeImage(account)" class="avatar avatar-md">
                <strong>{{ account.name }}</strong>
                <span class="account-field">
                    Usuário: {{ account.user }}
                </span>
                <span class="account-field">
                    Senha:
                    <span v-if="vault.revealedPasswords[account.localId]" class="password-revealed">
                        {{ vault.revealedPasswords[account.localId] }}
                    </span>
                    <span v-else class="password-hidden">
                        ••••••••••••
                    </span>
                </span>
            </div>
            <div class="account-actions">
                <button @click="toggleReveal(account.localId)">
                    {{ vault.revealedPasswords[account.localId] ? 'Esconder' : 'Ver' }}
                </button>
                <button @click="vault.deleteAccount(account.localId)">
                    Excluir
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import defaultAccount from "@/assets/images/kadem-default-account.jpg";
import { useVaultStore } from "@/stores/vault";

export default {
    name: "AccountList",
    props: {
        accounts: {
            type: Array,
            required: true,
        },
    },
    setup() {
        const vault = useVaultStore();
        return { vault };
    },
    methods: {
        returnAccountTypeImage(account) {
            if (account.type.trim() == "") {
                return defaultAccount;
            }

            //return 'https://logo.clearbit.com/' + account.type + ".com"
            return 'https://img.logo.dev/' + account.type + '.com?token=pk_PAz0kI4nRd6KqTrziA6zdw';
        },
        toggleReveal(localId) {
            if (this.vault.revealedPasswords[localId]) {
                this.vault.hidePassword(localId);
            } else {
                this.vault.revealPassword(localId);
            }
        },
    },
};
</script>

<style scoped>
.account-item {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.empty-state {
    text-align: center;
    font-style: italic;
    margin: var(--space-6) auto;
}

.account-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.account-field {
    font-size: 0.9em;
    opacity: 0.8;
}

.password-revealed {
    font-family: monospace;
}

.account-actions {
    display: flex;
    gap: 8px;
}
</style>
