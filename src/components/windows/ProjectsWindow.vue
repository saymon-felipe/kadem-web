<template>
    <div class="projects-window-content">
        <h3>Meus Projetos</h3>
        <p>Este é o conteúdo da janela de projetos.</p>
        <ul>
            <li>Projeto Kadem</li>
            <li>Projeto Secreto</li>
        </ul>
    </div>
</template>

<script>
export default {
    mounted() {
        console.log('Janela de Projetos montada!');
    }
}
</script>

<style scoped>
.projects-window-content {
    color: #333;
}
</style>
