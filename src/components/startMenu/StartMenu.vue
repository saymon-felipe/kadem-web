<template>
    <div class="start-menu glass" @mousedown.stop>
        <div class="start-menu-content">
            <h3>Menu Iniciar</h3>
            <p>Seus aplicativos e arquivos aqui.</p>
        </div>
    </div>
</template>

<script>
export default {

}
</script>

<style scoped>
.start-menu {
    position: absolute;
    z-index: 9000;
    top: 70px;
    left: 0;
    right: 0;
    margin: auto;
    transform: translateX(-80px);
    width: 60%;
    max-width: 450px;
    height: 70vh;
    max-height: 550px;
    padding: var(--space-4);
    overflow: hidden;
    transform-origin: top left;
}

.start-menu-content {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    color: var(--deep-blue);
}

@media (max-width: 768px) {
    .start-menu {
        margin: initial;
        height: calc(100dvh - 82px);
        max-height: calc(100dvh - 82px);
        width: 100% !important;
        max-width: 100% !important;
        transform: translateX(0);
        left: 0 !important;
    }
}
</style>
