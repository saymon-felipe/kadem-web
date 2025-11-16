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

    <LoadingResponse :msg="error" type="error" styletype="small" :loading="isLoading" />

    <div class="modal-actions">
        <button class="btn" @click="$emit('close')" :disabled="isLoading">
            Cancelar
        </button>
        <button class="btn btn-red" @click="handleConfirmDelete" :disabled="isLoading || !masterPasswordInput">
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
            isLoading: false,
            error: null,
            authStore: useAuthStore(),
            vaultStore: useVaultStore(),
        }
    },
    mounted() {
        this.$refs.passwordInput?.focus();
    },
    methods: {
        async handleConfirmDelete() {
            const passwordToVerify = this.masterPasswordInput.trim()

            if (!passwordToVerify) {
                this.error = 'A Senha Mestra é obrigatória.'
                this.masterPasswordInput = ''
                return
            }

            this.isLoading = true
            this.error = null

            const userSalt = this.authStore.user?.email
            if (!userSalt) {
                this.error = 'Erro: Saldo do usuário não encontrado. Tente relogar.'
                this.isLoading = false
                return
            }

            try {
                const isPasswordCorrect = await this.vaultStore.checkMasterPassword(
                    passwordToVerify,
                    userSalt
                )

                if (!isPasswordCorrect) {
                    throw new Error('Senha Mestra incorreta.')
                }

                await api.post('/users/close_account')

                await this.authStore.logout(true)

                this.$emit('close')
            } catch (err) {
                console.error('Falha ao encerrar conta:', err)
                this.error =
                    err.response?.data?.message ||
                    err.message ||
                    'Ocorreu um erro desconhecido.'

                this.isLoading = false
                this.masterPasswordInput = ''
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