<template>
    <p class="title">Encerrar conta permanentemente?</p>
    <p class="message">
        Esta ação é irreversível. Para confirmar, digite sua Senha Mestra. Todos os
        seus dados locais e remotos serão excluídos.
    </p>

    <div class="form-group password-group">
        <input type="password" v-model="masterPasswordInput" placeholder=" " @keyup.enter="handleConfirmDelete"
            ref="passwordInput" />
        <label>Senha Mestra</label>
    </div>

    <LoadingResponse :msg="response" :type="responseType" styletype="small" :loading="loading" />

    <div class="modal-actions">
        <button class="btn" @click="$emit('close')" :disabled="loading">
            Cancelar
        </button>
        <button class="btn btn-red" @click="handleConfirmDelete" :disabled="loading || !masterPasswordInput">
            {{ isLoading ? 'Encerrando...' : 'Encerrar Conta' }}
        </button>
    </div>
</template>

<script>
import { useAuthStore } from '@/stores/auth';
import { useVaultStore } from '@/stores/vault';
import { api } from '@/plugins/api';
import LoadingResponse from '@/components/loadingResponse.vue';

export default {
    name: 'DeleteAccountForm',
    components: {
        LoadingResponse,
    },
    emits: ['close'],
    data() {
        return {
            masterPasswordInput: '',
            authStore: useAuthStore(),
            vaultStore: useVaultStore(),
        }
    },
    mounted() {
        this.$refs.passwordInput?.focus();
    },
    methods: {
        async handleConfirmDelete() {
            const passwordToVerify = this.masterPasswordInput.trim();

            if (!passwordToVerify) {
                this.setResponse("error", 'A Senha Mestra é obrigatória.', false);
                this.masterPasswordInput = '';
                return;
            }

            const userSalt = this.authStore.user?.email;
            if (!userSalt) {
                this.setResponse("error", 'Ocorreu um erro. Tente relogar.', false);
                return;
            }

            try {
                this.setResponse("", "", true);

                const isPasswordCorrect = await this.vaultStore.checkMasterPassword(
                    passwordToVerify,
                    userSalt
                )

                if (!isPasswordCorrect) {
                    throw new Error('Senha Mestra incorreta.');
                }

                await api.delete('/users/close_account');

                this.setResponse("success", 'Conta encerrada com sucesso. Redirecionando...', false);

                setTimeout(() => {
                    this.authStore.logout(true);
                    this.$emit('close');
                }, 1500)
            } catch (err) {
                console.error('Falha ao encerrar conta:', err);

                this.setResponse("error", err.message, false);

                this.masterPasswordInput = '';
            }
        },
    },
}
</script>

<style scoped>
.title {
    font-size: var(--fontsize-md);
    color: var(--deep-blue);
    font-weight: 600;
    margin: 0;
}

.message {
    font-size: var(--fontsize-sm);
    color: var(--text-gray);
    line-height: 1.5;
    margin-bottom: var(--space-4);
}

.modal-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    margin-top: var(--space-4);
}

.form-group {
    margin: 0;
}
</style>