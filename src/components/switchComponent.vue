<template>
    <div class="glass switch-container" :style="containerStyle">
        <div class="switch-indicator" :style="indicatorStyle"></div>
        <button v-for="option in options" :key="option.code" class="switch-option" :ref="option.code"
            :class="{ 'is-active': option.code === modelValue }" @click="selectOption(option.code)">
            {{ option.name }}
        </button>
    </div>
</template>

<script>
export default {
    name: 'StyledSwitch',
    props: {
        options: {
            type: Array,
            required: true,
            validator: (value) => {
                return value.every(opt => 'code' in opt && 'name' in opt);
            }
        },
        modelValue: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            indicatorStyle: ""
        }
    },
    watch: {
        modelValue: {
            handler() {
                this.setIndicatorStyle();
            }
        }
    },
    emits: ['update:modelValue'],
    computed: {
        activeIndex() {
            return this.options.findIndex(opt => opt.code === this.modelValue);
        },
        optionsCount() {
            return this.options.length || 1;
        },
        containerStyle() {
            return {
                '--options-count': this.optionsCount
            };
        }
    },
    methods: {
        selectOption(optionCode) {
            if (this.modelValue !== optionCode) {
                this.$emit('update:modelValue', optionCode);
            }
        },
        setIndicatorStyle() {
            let optionWidth = (this.$refs[this.modelValue][0].offsetWidth - 10) + "px";
            let optionLeft = (this.$refs[this.modelValue][0].offsetLeft + 5) + "px";

            const columnWidth = optionWidth;
            const columnLeft = optionLeft;

            this.indicatorStyle = {
                width: columnWidth,
                left: columnLeft
            };
        }
    },
    mounted() {
        setTimeout(() => {
            this.setIndicatorStyle();
        }, 70)
    }
}
</script>

<style scoped>
.switch-container {
    display: grid;
    grid-template-columns: repeat(var(--options-count), 1fr);
    position: relative;
    overflow: hidden;
    width: fit-content;
    background: rgba(255, 255, 255, 0.4) !important;
    backdrop-filter: none !important;
}

.switch-indicator {
    position: absolute;
    top: var(--space-2);
    bottom: var(--space-2);
    margin: auto;
    background-color: var(--white);
    border-radius: var(--radius-sm);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.switch-option {
    position: relative;
    z-index: 1;
    padding: var(--space-5) var(--space-6);
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: var(--fontsize-sm);
    color: var(--text-gray);
    border-radius: var(--radius-md);
    transition: color 0.3s ease-in-out;
    text-align: center;
    white-space: nowrap;
}

.switch-option.is-active {
    color: var(--deep-blue);
}

.switch-option:focus-visible {
    outline: 2px solid var(--deep-blue);
    outline-offset: 2px;
}
</style>