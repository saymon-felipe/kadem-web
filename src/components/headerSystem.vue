<template>
    <header class="glass">
        <button class="header-button home">
            <img src="../assets/images/icons/system.png" alt="Iniciar">
        </button>
        <button class="header-button">
            <img src="../assets/images/icons/projects-icon.png" alt="Projetos">
        </button>
        <button class="header-button">
            <img src="../assets/images/icons/productivity-icon.png" alt="Produtividade">
        </button>
    </header>
</template>
<script>
export default {

}
</script>
<style scoped>
header {
    background: rgba(206, 179, 134, 0.24) !important;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    min-width: fit-content;
    width: 65%;
    margin: 0 auto;
    user-select: none;

    & button {
        width: 54px;
        height: 54px;
        min-width: 54px;
        min-height: 54px;
        max-width: 54px;
        max-height: 54px;
        padding: var(--space-3);
        cursor: pointer;
        background: none;
        border-radius: var(--radius-md);
        border: none;
        margin: var(--space-2);
        transition: all 0.2s ease-in-out;
        position: relative;
        display: grid;
        place-items: center;

        &:hover,
        &.opened,
        &.active {
            background: #D4CBBC;
        }

        &:not(.home).opened::after,
        &:not(.home).active::after {
            content: "";
            width: 40%;
            height: 4px;
            border-radius: 2px;
            background: var(--gray-300);
            position: absolute;
            bottom: 5px;
            left: 0;
            right: 0;
            margin: auto;
        }

        &.active::after {
            background: var(--deep-blue-2);
        }
    }

    & img {
        width: 80%;
    }
}
</style>