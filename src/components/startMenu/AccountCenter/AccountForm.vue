<template>
  <div class="account-form" @click.stop>
    <h3>{{ isEditMode ? "Editar Conta" : "Adicionar Nova Conta" }}</h3>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <input id="type" v-model="form.type" type="text" placeholder=" " required />
        <label for="type">Tipo (Ex: Google, Facebook)</label>
      </div>
      <img :src="accountTypeImage" :alt="form.type" class="avatar avatar-md" />
      <div class="form-group">
        <input id="name" v-model="form.name" type="text" placeholder=" " required />
        <label for="name">Nome</label>
      </div>
      <div class="form-group">
        <input id="user" v-model="form.user" type="text" placeholder=" " required />
        <label for="user">Usuário ou Email</label>
      </div>
      <div class="form-group">
        <input
          id="password"
          v-model="form.password"
          type="text"
          placeholder=" "
          :required="!isEditMode"
        />
        <label for="password">Senha</label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-small btn-cancel" @click="closeForm">
          Cancelar
        </button>
        <button type="submit" class="btn-small btn-save">
          {{ isEditMode ? "Salvar Edição" : "Salvar" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import defaultAccount from "@/assets/images/kadem-default-account.jpg";
import { api } from "@/plugins/api";

export default {
  name: "AccountForm",
  emits: ["close", "save"],
  props: {
    accountToEdit: {
      type: Object,
      default: null,
    },
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
        lastAccess: null,
        logo_url: "",
      },
      search_timer: null,
      api_secret_key: "pk_PAz0kI4nRd6KqTrziA6zdw",
    };
  },
  computed: {
    isEditMode() {
      return !!this.accountToEdit;
    },
    accountTypeImage() {
      if (!this.form.logo_url) {
        return defaultAccount;
      }

      return this.form.logo_url;
    },
  },
  watch: {
    "form.type": function (new_val) {
      clearTimeout(this.search_timer);

      this.search_timer = setTimeout(() => {
        this.fetch_logo_domain(new_val);
      }, 600);
    },
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
            lastAccess: newVal.lastAccess,
            domain: newVal.domain || "",
          };
        } else {
          this.form = {
            type: "",
            name: "",
            user: "",
            password: "",
            localId: null,
            id: null,
            lastAccess: null,
          };
        }
      },
      immediate: true,
    },
  },
  methods: {
    async fetch_logo_domain(query) {
      if (!query || query.length < 2) return;

      try {
        const response = await api.get("/system/proxy-search-logo", {
          params: { q: query },
        });

        const result_data = response.data;

        if (result_data && result_data.length > 0 && result_data[0].logo_url) {
          this.form.logo_url = result_data[0].logo_url;
        }
      } catch (error) {
        console.warn("[AccountForm] Não foi possível buscar o domínio da logo:", error);
      }
    },
    closeForm() {
      this.$emit("close");
    },

    handleSubmit() {
      const dataToSave = {
        type: this.form.type,
        name: this.form.name,
        user: this.form.user,
        lastAccess: this.form.lastAccess || new Date().toISOString(),
        domain: this.form.domain,
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
