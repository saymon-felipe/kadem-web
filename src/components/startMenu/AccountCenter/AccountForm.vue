<template>
    <div class="account-form" @click.stop>
        <h3>{{ isEditMode ? 'Editar Conta' : 'Adicionar Nova Conta' }}</h3>
        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <input id="type" v-model="form.type" type="text" placeholder=" " required />
                <label for="type">Tipo (Ex: Google, Facebook)</label>
            </div>
            <img :src="accountTypeImage" :alt="form.type" class="avatar avatar-md">
            <div class="form-group">
                <input id="name" v-model="form.name" type="text" placeholder=" " required />
                <label for="name">Nome</label>
            </div>
            <div class="form-group">
                <input id="user" v-model="form.user" type="text" placeholder=" " required />
                <label for="user">Usuário ou Email</label>
            </div>
            <div class="form-group">
                <input id="password" v-model="form.password" type="text" placeholder=" " :required="!isEditMode" />
                <label for="password">Senha</label>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-small btn-cancel" @click="closeForm">Cancelar</button>
                <button type="submit" class="btn-small btn-save">{{ isEditMode ? 'Salvar Edição' : 'Salvar' }}</button>
            </div>
        </form>
    </div>
</template>

<script>
import defaultAccount from "@/assets/images/kadem-default-account.jpg";

export default {
    name: "AccountForm",
    emits: ["close", "save"],
    props: {
        accountToEdit: {
            type: Object,
            default: null
        }
    },
    data() {
        return {
            form: {
                type: "",
                name: "",
                user: "",
                password: "",
                localId: null,
                id: null,
                lastAccess: null
            },
        };
    },
    computed: {
        isEditMode() {
            return !!this.accountToEdit;
        },
        accountTypeImage() {
            if (this.form.type.trim() == "") {
                return defaultAccount;
            }

            return 'https://img.logo.dev/' + this.form.type.toLowerCase().split(' ')[0] + '.com?token=pk_PAz0kI4nRd6KqTrziA6zdw';
        }
    },
    watch: {
        accountToEdit: {
            handler(newVal) {
                if (newVal) {
                    this.form = {
                        type: newVal.type || "",
                        name: newVal.name || "",
                        user: newVal.user || "",
                        password: newVal.password,
                        localId: newVal.localId,
                        id: newVal.id,
                        lastAccess: newVal.lastAccess
                    };
                } else {
                    this.form = {
                        type: "",
                        name: "",
                        user: "",
                        password: "",
                        localId: null,
                        id: null,
                        lastAccess: null
                    };
                }
            },
            immediate: true
        }
    },
    methods: {
        closeForm() {
            this.$emit("close");
        },

        handleSubmit() {
            const dataToSave = {
                type: this.form.type,
                name: this.form.name,
                user: this.form.user,
                lastAccess: this.form.lastAccess || new Date().toISOString()
            };

            if (this.isEditMode) {
                dataToSave.password = this.form.password;
                this.$emit("save", dataToSave, this.form.localId);
            } else {
                dataToSave.password = this.form.password;
                this.$emit("save", dataToSave);
            }
        },
    },
};
</script>

<style scoped>
.account-form {
    padding: var(--space-6);
}

.avatar {
    margin: var(--space-3) 0;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
    margin-top: var(--space-6);
}
</style>