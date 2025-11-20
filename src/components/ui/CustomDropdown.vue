<template>
    <div class="custom-dropdown" v-click-outside="close">
        <div class="dropdown-trigger" @click="toggle" :class="{ 'is-open': is_open }">
            <div class="trigger-content">
                <slot name="trigger" :selected="modelValue" :placeholder="placeholder">
                    <span v-if="!modelValue" class="placeholder">{{ placeholder }}</span>
                    <span v-else>{{ label_getter(modelValue) }}</span>
                </slot>
            </div>
            <font-awesome-icon icon="chevron-down" class="arrow-icon" :class="{ 'rotated': is_open }" />
        </div>

        <transition name="dropdown-fade">
            <div v-if="is_open" class="dropdown-menu glass">
                <ul class="dropdown-list">
                    <li v-for="(option, index) in options" :key="index" class="dropdown-item"
                        :class="{ 'is-selected': is_selected(option) }" @click="select_option(option)">
                        <slot name="option" :option="option">
                            {{ label_getter(option) }}
                        </slot>
                    </li>
                </ul>
            </div>
        </transition>
    </div>
</template>

<script>
export default {
    name: 'CustomDropdown',
    props: {
        modelValue: {
            type: [Object, String, Number, null],
            default: null
        },
        options: {
            type: Array,
            required: true,
            default: () => []
        },
        placeholder: {
            type: String,
            default: 'Selecione...'
        },
        labelKey: {
            type: String,
            default: 'name'
        }
    },
    emits: ['update:modelValue', 'change'],
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
            is_open: false
        };
    },
    methods: {
        toggle() {
            this.is_open = !this.is_open;
        },
        close() {
            this.is_open = false;
        },
        select_option(option) {
            this.$emit('update:modelValue', option);
            this.$emit('change', option);
            this.close();
        },
        label_getter(option) {
            if (typeof option === 'object' && option !== null) {
                return option[this.labelKey] || JSON.stringify(option);
            }
            return option;
        },
        is_selected(option) {
            if (typeof option === 'object' && this.modelValue && typeof this.modelValue === 'object') {
                return JSON.stringify(option) === JSON.stringify(this.modelValue);
            }
            return option === this.modelValue;
        }
    }
};
</script>

<style scoped>
.custom-dropdown {
    position: relative;
    width: 100%;
    user-select: none;
}

.dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 42px;
    padding: 8px 12px;
    background-color: var(--white);
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.dropdown-trigger:hover {
    border-color: var(--gray-100);
}

.dropdown-trigger.is-open {
    border-color: var(--deep-blue);
    box-shadow: 0 0 0 3px rgba(31, 39, 76, 0.1);
}

.trigger-content {
    flex-grow: 1;
    display: flex;
    align-items: center;
    overflow: hidden;
}

.arrow-icon {
    margin-left: 8px;
    font-size: 0.75rem;
    color: var(--gray-300);
    transition: transform 0.3s ease;
}

.arrow-icon.rotated {
    transform: rotate(180deg);
}

.placeholder {
    color: var(--gray-300);
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    max-height: 220px;
    overflow-y: auto;
    background-color: var(--white);
    border-radius: var(--radius-sm);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 100;
    padding: 4px 0;
    border: 1px solid var(--gray-700);
}

.dropdown-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.dropdown-item {
    padding: 10px 12px;
    cursor: pointer;
    transition: background-color 0.15s;
    display: flex;
    align-items: center;
    font-size: var(--fontsize-sm);
    color: var(--deep-blue);
}

.dropdown-item:hover {
    background-color: var(--gray-700);
}

.dropdown-item.is-selected {
    background-color: rgba(31, 39, 76, 0.05);
    font-weight: 500;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
    opacity: 0;
    transform: translateY(-5px);
}
</style>