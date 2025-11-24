<template>
    <div class="auth-container">
        <div class="card">
            <h2>Processando convite...</h2>
            <p v-if="loading">Verificando validade...</p>
            <LoadingResponse :msg="response" :type="responseType" styletype="small" :loading="false" />
        </div>
    </div>
</template>

<script>
import { api } from '@/plugins/api';
import LoadingResponse from "@/components/loadingResponse.vue";

export default {
    data() { return { loading: true }; },
    components: { LoadingResponse },
    async mounted() {
        const token = this.$route.query.token;
        if (!token) return this.$router.push({ name: 'home' });

        this.resetResponse();

        try {
            const res = await api.get(`/projects/invite/validate/${token}`);
            const { has_account, email, is_valid } = res.data;

            if (is_valid) {
                if (has_account) {
                    this.$router.push({
                        name: 'Auth',
                        query: { authtype: 'login', invite_token: token }
                    });
                } else {
                    this.$router.push({
                        name: 'Auth',
                        query: {
                            authtype: 'register',
                            email: email,
                            invite_token: token
                        }
                    });
                }
            } else {
                this.setResponse("error", "Convite inválido ou expirado.", false);
            }
        } catch (error) {
            this.setResponse("error", "Convite inválido ou expirado.", false);
        }
    }
};
</script>