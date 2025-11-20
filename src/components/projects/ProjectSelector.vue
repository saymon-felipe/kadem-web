<template>
    <div class="project-selector" v-click-outside="closeDropdown">
        <button class="selector-trigger" @click="toggleDropdown" :class="{ 'active': is_open }">
            <div class="current-project-info">
                <img :src="currentProject?.image || defaultProjectImage" class="project-icon-sm" />
                <span class="project-name">{{ currentProject?.name || 'Selecione um Projeto' }}</span>
            </div>
            <font-awesome-icon icon="chevron-down" class="chevron" :class="{ 'rotate': is_open }" />
        </button>

        <transition name="dropdown-fade">
            <div v-if="is_open" class="selector-dropdown">
                <div class="dropdown-header">
                    <small>Meus Projetos</small>
                </div>

                <ul class="project-list scroll-custom">
                    <li v-for="proj in projects" :key="proj.localId" class="project-item"
                        :class="{ 'selected': proj.localId === currentProjectId }" @click="selectProject(proj)">
                        <div class="item-left">
                            <img :src="proj.image || defaultProjectImage" class="project-icon-md" />
                            <div class="item-details">
                                <span class="item-name">{{ proj.name }}</span>
                                <span class="item-meta">Atualizado há 2h</span>
                            </div>
                        </div>

                        <div class="item-members">
                            <div class="member-stack">
                                <img :src="defaultAccountImage" class="avatar-xs" title="Membro 1" />
                                <img :src="defaultAccountImage" class="avatar-xs" title="Membro 2" />
                                <div class="avatar-xs more">+2</div>
                            </div>
                        </div>

                        <font-awesome-icon v-if="proj.localId === currentProjectId" icon="check" class="check-icon" />
                    </li>
                </ul>

                <div class="dropdown-footer" @click="$emit('back-to-home')">
                    <font-awesome-icon icon="table-cells-large" /> Ver todos os projetos
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
import { mapState } from 'pinia';
import { useProjectStore } from '@/stores/projects';
import defaultProjectImage from "@/assets/images/kadem-default-project.jpg";
import defaultAccountImage from "@/assets/images/kadem-default-account.jpg";

export default {
    name: 'ProjectSelector',
    props: {
        currentProjectId: {
            type: [String, Number],
            required: true
        }
    },
    emits: ['switch-project', 'back-to-home'],

    directives: {
        'click-outside': {
            mounted(el, binding) {
                el.clickOutsideEvent = function (event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        binding.value(event);
                    }
                };
                document.body.addEventListener('click', el.clickOutsideEvent);
            },
            unmounted(el) {
                document.body.removeEventListener('click', el.clickOutsideEvent);
            }
        }
    },

    data() {
        return {
            is_open: false,
            defaultProjectImage,
            defaultAccountImage
        };
    },
    computed: {
        ...mapState(useProjectStore, ['projects']),

        currentProject() {
            return this.projects.find(p => p.localId === this.currentProjectId);
        }
    },
    methods: {
        toggleDropdown() {
            this.is_open = !this.is_open;
        },
        closeDropdown() {
            this.is_open = false;
        },
        selectProject(project) {
            if (project.localId !== this.currentProjectId) {
                this.$emit('switch-project', project.localId);
            }
            this.closeDropdown();
        }
    }
}
</script>

<style scoped>
.project-selector {
    position: relative;
}

.selector-trigger {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: transparent;
    border: 1px solid transparent;
    padding: 6px 12px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    color: var(--deep-blue);
}

.selector-trigger:hover,
.selector-trigger.active {
    background: rgba(0, 0, 0, 0.05);
}

.current-project-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}

.project-name {
    font-weight: 700;
    font-size: var(--fontsize-lg);
    white-space: nowrap;
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.project-icon-sm {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    object-fit: cover;
}

.chevron {
    font-size: 0.8rem;
    color: var(--gray-300);
    transition: transform 0.2s;
}

.chevron.rotate {
    transform: rotate(180deg);
}

.selector-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 340px;
    background: var(--white);
    border-radius: var(--radius-md);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(0, 0, 0, 0.05);
    z-index: 100;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.dropdown-header {
    padding: var(--space-3) var(--space-4);
    background: #f8f9fa;
    border-bottom: 1px solid var(--gray-300);
    color: var(--gray-100);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.project-list {
    list-style: none;
    padding: var(--space-2);
    margin: 0;
    max-height: 300px;
    overflow-y: auto;
}

.project-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.2s;
    gap: var(--space-3);
}

.project-item:hover {
    background-color: #f0f2f5;
}

.project-item.selected {
    background-color: #eef2ff;
}

.item-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-grow: 1;
    min-width: 0;
}

.project-icon-md {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
}

.item-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.item-name {
    font-weight: 600;
    font-size: var(--fontsize-sm);
    color: var(--deep-blue);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-meta {
    font-size: 0.7rem;
    color: var(--gray-100);
}

.member-stack {
    display: flex;
    align-items: center;
    margin-right: var(--space-2);
}

.avatar-xs {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--white);
    margin-left: -8px;
    object-fit: cover;
}

.avatar-xs.more {
    background: var(--gray-300);
    color: var(--white);
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
}

.member-stack img:first-child {
    margin-left: 0;
}

.check-icon {
    color: var(--deep-blue);
    font-size: 0.9rem;
}

.dropdown-footer {
    padding: var(--space-3);
    border-top: 1px solid var(--gray-300);
    text-align: center;
    font-size: var(--fontsize-sm);
    color: var(--gray-100);
    cursor: pointer;
    transition: color 0.2s;
    background: #fbfbfc;
}

.dropdown-footer:hover {
    color: var(--deep-blue);
    background: #f0f0f0;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>