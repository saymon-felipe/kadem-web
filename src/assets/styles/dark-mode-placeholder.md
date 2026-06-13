# Como configurar o Background do Modo Escuro no Kadem

No Kadem, o sistema suporta troca de background dinâmica baseada no tema ativo.

## Configuração

Quando o Modo Escuro está ativado, o aplicativo busca um campo `background_dark` no objeto `system` do banco de dados local. Se este campo estiver vazio ou não definido, o sistema usará o background padrão (`system-background.webp`).

Para personalizar a imagem de fundo do Modo Escuro:

1. Adicione a sua imagem de background escuro preferida (por exemplo, `system-background-dark.webp`) ao diretório `src/assets/images/`.
2. Configure a URL ou caminho no seu profile local (`db.js` ou sincronizado pelo back-end) definindo o valor de `system.background_dark`.

A reatividade de troca de background já está implementada em [homeView.vue](file:///d:/Workspace/ws-github/kadem/kadem-web/src/views/homeView.vue).
