<template>
    <div class="loading-overlay" :class="{ 'fade-out': !isLoading }">
        <loadingSpinner type="yellow" />
    </div>

    <div class="main" :style="background">
        <headerSystem />
        <homeWidgets />
    </div>
</template>
<script>
import { mapState, mapActions } from 'pinia';
import { useGlobalStore } from '@/stores/global';
import headerSystem from "../components/headerSystem.vue";
import homeWidgets from "../components/homeWidgets.vue";
import loadingSpinner from "../components/loadingSpinner.vue";
import systemBackground from "../assets/images/system-background.webp";

export default {
    components: {
        headerSystem,
        homeWidgets,
        loadingSpinner
    },
    computed: {
        ...mapState(useGlobalStore, ['user', 'system']),
        finalImageUrl() {
            if (this.system && this.system.background && this.system.background != "") {
                return this.system.background;
            }

            return this.defaultBackground;
        },
        background() {
            if (!this.isImageReady) {
                return '';
            }
            return `background-image: url(${this.finalImageUrl});`;
        }
    },
    data() {
        return {
            defaultBackground: systemBackground,
            isLoading: true,
            isImageReady: false
        }
    },
    watch: {
        finalImageUrl: {
            handler(newUrl) {
                if (!newUrl) {
                    this.isLoading = false;
                    this.isImageReady = false;
                    return;
                }

                this.isLoading = true;
                this.isImageReady = false;

                const img = new Image();

                img.onload = () => {
                    this.isImageReady = true;
                    this.$nextTick(() => {
                        requestAnimationFrame(() => {
                            this.isLoading = false;
                        });
                    });
                };

                img.onerror = () => {
                    console.error('Falha ao carregar imagem de fundo:', newUrl);
                    this.isLoading = false;
                    this.isImageReady = false;
                };

                img.src = newUrl;
            },
            immediate: true
        }
    },
    methods: {
        ...mapActions(useGlobalStore, ['setUser', 'setSystem']),
        returnUser: function () {
            let user = {
                id: 1,
                name: "Zeno",
                avatar: "https://cademint.s3.amazonaws.com/2025-08-25T15_22_33.528ZWhatsApp_Image%202025-08-16%20at%2022.13.02.jpeg",
                email: "zeno@gmail.com",
                bio: "Sou desenvolvedor da Kadem",
                accounts: [
                    {
                        id: 1,
                        type: "Google",
                        avatar: "https://logo.clearbit.com/Google.com",
                        name: "Kadem"
                    }
                ],
                level: 32,
                level_progress: 20,
                groups: [
                    {
                        id: 1,
                        name: "Grupo de fulano",
                        owner: 2,
                        members: [
                            {
                                name: "Fulano",
                                avatar: "https://coretest-cademint-0012d7964dfd.herokuapp.com/public/default-user-image.png"
                            },
                            {
                                name: "Zeno",
                                avatar: "https://cademint.s3.amazonaws.com/2025-08-25T15_22_33.528ZWhatsApp_Image%202025-08-16%20at%2022.13.02.jpeg"
                            }
                        ],
                        task_count: 23,
                        banner: "https://cademint.s3.amazonaws.com/2025-08-01T00_02_16.103ZFrame_122%20%281%29.png"
                    }
                ],
                medals: [
                    {
                        id: 1,
                        name: "Usuário ativo",
                        description: "Essa pessoa fica online frequentemente na Kadem"
                    }
                ],
                occupations: [
                    {
                        id: 1,
                        name: "Desenvolvedor"
                    }
                ]
            }

            this.setUser(user);
        },
        returnSystem: function () {
            let system = {
                background: "",
                version: "2.0.0"
            }

            this.setSystem(system);
        },
        initConnectionMonitor() {
            const globalStore = useGlobalStore();
            globalStore.initConnectionMonitor();
        }
    },
    mounted: function () {
        this.returnUser();
        this.returnSystem();
        //this.initConnectionMonitor();

        console.log(this.user)
        console.log(this.system)
    }
}
</script>
<style scoped>
.main {
    width: 100%;
    height: 100%;
    background-position: center center;
    background-size: cover;
    background-repeat: no-repeat;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-3);
}
</style>