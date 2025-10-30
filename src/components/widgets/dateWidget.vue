<template>
    <div class="clock-widget">
        <div class="time">{{ formattedTime }}</div>
        <div class="date">{{ formattedDate }}</div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            now: new Date(),
            intervalId: null
        };
    },
    computed: {
        formattedTime() {
            return this.now.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        formattedDate() {
            const options = {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            };

            return new Intl.DateTimeFormat('pt-BR', options).format(this.now);
        }
    },
    methods: {
        updateClock() {
            this.now = new Date();
        }
    },
    mounted() {
        this.updateClock();
        this.intervalId = setInterval(this.updateClock, 1000);
    },
    unmounted() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
};
</script>

<style scoped>
.clock-widget {
    color: var(--white);
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
    line-height: 1.2;
    text-align: center;
}

.time {
    font-size: calc(5vw + 5rem);
    font-weight: 300;
}

.date {
    font-size: calc(1.5vw + 1rem);
    font-weight: 400;
}
</style>