<template>
    <div class="productivity-window-content">
        <h3>Minha Produtividade</h3>
        <p>Este é o conteúdo da janela de produtividade.</p>
        <ul>
            <li>Lista de Tarefas</li>
            <li>Técnica Pomodoro</li>
            <li>Metas Diárias</li>
        </ul>
    </div>
</template>

<script>
export default {
    mounted() {
        console.log('Janela de Produtividade montada!');
    }
}
</script>

<style scoped>
.productivity-window-content {
    color: #333;
}
</style>
