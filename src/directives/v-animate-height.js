const onTransitionEnd = (e) => {
    if (e.propertyName === 'height') {
        e.target.style.height = 'auto';
    }
};

const vAnimateHeight = {
    mounted(el) {
        const existingTransition = getComputedStyle(el).transition;
        const heightTransition = 'height 0.3s ease-in-out';

        if (existingTransition && existingTransition !== 'all 0s ease 0s' && !existingTransition.includes('height')) {
            el.style.transition = `${existingTransition}, ${heightTransition}`;
        } else {
            el.style.transition = heightTransition;
        }

        el.addEventListener('transitionend', onTransitionEnd);
    },

    beforeUpdate(el) {
        if (el.style.height === 'auto' || el.style.height === '') {
            el.dataset.oldHeight = el.offsetHeight;
        }
    },

    updated(el) {
        const oldHeight = el.dataset.oldHeight;
        if (!oldHeight) return;

        requestAnimationFrame(() => {
            const newHeight = el.scrollHeight;
            if (oldHeight == newHeight) return;

            el.style.height = `${oldHeight}px`;
            void el.offsetHeight;
            el.style.height = `${newHeight}px`;
        });
    },

    unmounted(el) {
        el.removeEventListener('transitionend', onTransitionEnd);
    }
};

export default vAnimateHeight;