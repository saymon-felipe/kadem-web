<template>
    <div class="account-form" @click.stop>
        <h3>Adicionar Nova Conta</h3>
        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <input v-model="form.type" type="text" required />
                <label>Tipo (Ex: Google, Facebook)</label>
            </div>
            <img :src="accountTypeImage" class="avatar avatar-md">
            <div class="form-group">
                <input v-model="form.name" type="text" required />
                <label>Nome</label>
            </div>
            <div class="form-group">
                <input v-model="form.user" type="text" required />
                <label>Usuário ou Email</label>
            </div>
            <div class="form-group">
                <input v-model="form.password" type="password" required />
                <label>Senha</label>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-small btn-cancel" @click="closeForm">Cancelar</button>
                <button type="submit" class="btn-small btn-save">Salvar</button>
            </div>
        </form>
    </div>
</template>

<script>
import defaultAccount from "@/assets/images/kadem-default-account.jpg";

export default {
    name: "AccountForm",
    emits: ["close", "save"],
    data() {
        return {
            form: {
                type: "",
                name: "",
                user: "",
                password: "",
            },
        };
    },
    computed: {
        accountTypeImage() {
            if (this.form.type.trim() == "") {
                return defaultAccount;
            }

            //return 'https://logo.clearbit.com/' + this.form.type + ".com"
            return 'https://img.logo.dev/' + this.form.type + '.com?token=pk_PAz0kI4nRd6KqTrziA6zdw';
        }
    },
    methods: {
        closeForm() {
            this.$emit("close");
        },

        handleSubmit() {
            this.$emit("save", { ...this.form });
        },
    },
};
</script>

<style scoped>
.account-form {
    padding: var(--space-4);
}

.avatar {
    margin: var(--space-3) 0;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
}
</style>
