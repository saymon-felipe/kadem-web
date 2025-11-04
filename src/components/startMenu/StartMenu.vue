<template>
    <div class="start-menu glass" @mousedown.stop>
        <div class="start-menu-content">
            <div class="start-menu-header">
                <avatarComponent :user="user" />
                <div class="ui-hover" @click="logout">
                    <font-awesome-icon icon="right-from-bracket" class="logout" />
                </div>
            </div>

            <nav class="tab-navigation">
                <button v-for="(tab, index) in tabs" :key="tab.id"
                    :class="['tab-button', { active: activeTabIndex === index }]" @click="setActiveTab(tab.id, index)">
                    {{ tab.name }}
                </button>
            </nav>

            <div class="tab-viewport">
                <div class="tabs-track" :style="trackStyle" ref="tabsTrack">
                    <div class="tab-pane" v-for="(tab, index) in tabs" :key="tab.id" role="tabpanel"
                        :aria-hidden="activeTabIndex !== index">
                        <component :is="tab.component" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import avatarComponent from "../avatarComponent.vue";
import { mapState } from 'pinia';
import { useAuthStore } from '@/stores/auth';

import MainInformations from './MainInformations.vue';
import Configuration from './Configuration.vue';
import AccountCenter from './AccountCenter.vue';

export default {
    components: {
        avatarComponent,
        MainInformations,
        Configuration,
        AccountCenter
    },
    data() {
        return {
            activeTab: 'main',
            activeTabIndex: 0,
            tabs: [
                { id: 'main', name: 'Informações principais', component: MainInformations },
                { id: 'config', name: 'Configurações', component: Configuration },
                { id: 'accounts', name: 'Central de contas', component: AccountCenter },
            ],
            animationDuration: 350 // ms
        };
    },
    computed: {
        ...mapState(useAuthStore, ['user']),
        trackWidth() {
            return `${this.tabs.length * 100}%`;
        },
        translatePercent() {
            const step = 100 / this.tabs.length;
            return -(this.activeTabIndex * step);
        },
        trackStyle() {
            return {
                width: this.trackWidth,
                transform: `translateX(${this.translatePercent}%)`,
                transition: `transform ${this.animationDuration}ms cubic-bezier(.22,.9,.36,1)`,
            };
        }
    },
    methods: {
        logout() {
            this.$router.push("/logout");
        },
        setActiveTab(tabId, newIndex) {
            if (this.activeTabIndex === newIndex) return;
            this.activeTab = tabId;
            this.activeTabIndex = newIndex;
        }
    }
};
</script>

<style scoped>
.start-menu {
    position: fixed;
    z-index: 9000;
    top: 82px;
    left: .5dvw !important;
    height: calc(100dvh - 90px);
    max-height: calc(100dvh - 90px);
    width: 99dvw !important;
    max-width: 99dvw !important;
    padding: var(--space-4);
    overflow: hidden;
}

.start-menu-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
    color: var(--deep-blue);
}

.start-menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
}

.start-menu-header .ui-hover {
    transform: translateX(-10px);
}

.start-menu-header .ui-hover .logout {
    font-size: var(--fontsize-md);
}

.tab-navigation {
    display: flex;
    gap: var(--space-6);
    margin-top: var(--space-8);
    margin-bottom: var(--space-6);
    border-bottom: 1px solid var(--gray-700);
}

.tab-button {
    background: none;
    border: none;
    padding: var(--space-4) 0;
    font-size: var(--fontsize-sm);
    color: var(--gray-100);
    cursor: pointer;
    position: relative;
    transition: color 0.15s ease;
}

.tab-button.active {
    color: var(--deep-blue);
    font-weight: 500;
}

.tab-button.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--deep-blue);
}

.tab-button:hover {
    color: var(--deep-blue);
}

.tab-viewport {
    position: relative;
    width: 100%;
    height: calc(100% - 140px);
    /* ajuste conforme seu layout */
    overflow: hidden;
}

.tabs-track {
    display: flex;
    height: 100%;
    will-change: transform;
}

.tab-pane {
    width: calc(100% / 1);
    flex: 0 0 calc(100% / 1);
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-right: var(--space-4);
    box-sizing: border-box;
}

.tabs-track>.tab-pane {
    width: calc(100% / 3);
    flex: 0 0 calc(100% / 3);
}

.tab-pane::-webkit-scrollbar {
    width: 8px;
}

.tab-pane::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.08);
    border-radius: 4px;
}
</style>
