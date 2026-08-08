# Agent Instructions

O contexto de IA deste workspace (documentação técnica e skills operacionais) vive em um repositório separado: `kadem-ai-context/`, irmão deste projeto.

Leia estes arquivos antes de modificar o frontend:

1. `D:/Workspace/ws-github/kadem/kadem-ai-context/AGENTS.md`
2. `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/README.md`
3. `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/workspace-overview.md`
4. `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/frontend-architecture.md`
5. `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/engineering-conventions.md`

Leia também os docs de domínio quando a mudança tocar essas áreas:

- `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/auth.md`
- `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/offline-sync.md`
- `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/finance.md`
- `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/deploy.md`
- `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/media-engine.md`
- `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/public-site.md`
- `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/database.md`
- `D:/Workspace/ws-github/kadem/kadem-ai-context/docs/api-reference.md`

Se a tarefa for uma classe conhecida (feature nova como janela do shell, mudança de sync offline, mudança do Nexo, etc.), leia também a skill correspondente em `D:/Workspace/ws-github/kadem/kadem-ai-context/skills/`.

Iteração:

- Novas instruções de projeto devem ser atualizadas em `kadem-ai-context/docs/`, criando e/ou alterando arquivos existentes — não crie documentação técnica dentro deste repositório (`kadem-web`).
- `kadem-ai-context` é commitado automaticamente quando alterado (skill `context-commit`), mas nunca dê `git push` nele sem o usuário pedir.

Regra de trabalho:

- Se houver conflito entre docs e código atual, leia o código, trate os docs como guia e atualize a documentação no mesmo pacote quando a divergência ficar clara.
