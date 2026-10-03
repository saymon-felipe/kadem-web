import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia, setActivePinia } from "pinia";

// O grafo de stores importa o router, que exige window/history; o teste so precisa do kanban.
const STUB_ROUTER_ID = "\0stub-router";
const stubRouter = {
  name: "stub-router",
  enforce: "pre",
  resolveId(id) {
    if ((id.startsWith("@/") || id.startsWith(".")) && /router(\/index(\.js)?)?$/.test(id)) return STUB_ROUTER_ID;
  },
  load(id) {
    if (id === STUB_ROUTER_ID) return "export default { push() {}, replace() {}, currentRoute: { value: {} } };";
  },
};

const installMemoryStorage = () => {
  const items = new Map();
  globalThis.localStorage = {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    clear: () => items.clear(),
  };
};

const createViteServer = () =>
  createServer({
    configFile: false,
    plugins: [stubRouter, vue()],
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });

const PROJECT_ID = 1;

// Quadro com duas colunas e uma tarefa na primeira, tudo offline (a fila nao e enviada).
const loadBoard = async (server) => {
  installMemoryStorage();
  setActivePinia(createPinia());
  const { db } = await server.ssrLoadModule("/src/db.js");
  const { useKanbanStore } = await server.ssrLoadModule("/src/stores/kanban.js");
  const { kanbanRepository } = await server.ssrLoadModule("/src/services/localData/kanbanRepository.js");
  const { syncQueueRepository } = await server.ssrLoadModule("/src/services/localData/syncQueueRepository.js");

  await kanbanRepository.clearLocalKanban();
  await syncQueueRepository.clearSyncQueue();

  const columnA = await kanbanRepository.add_column({ id: 11, project_id: PROJECT_ID, title: "A fazer", order: 0 });
  const columnB = await kanbanRepository.add_column({ id: 12, project_id: PROJECT_ID, title: "Feito", order: 1 });
  const task = await kanbanRepository.add_task({
    id: 101,
    project_id: PROJECT_ID,
    column_id: columnA.local_id,
    order: 0,
    title: "",
    description: "Tarefa de teste",
    priority: "Normal",
    size: "M - Médio",
    comments: [],
  });

  const store = useKanbanStore();
  await store.loadBoardFromLocal(PROJECT_ID);

  return { db, store, kanbanRepository, syncQueueRepository, columnA, columnB, task };
};

// O vuedraggable com `:list` faz splice no array da coluna de origem e insere o MESMO objeto
// no array de destino (clone padrao e identidade); depois emite `removed` e `added`, e a coluna
// chama updateTasksForColumn com o array da propria coluna.
const dragTask = async (store, task, fromColumn, toColumn) => {
  const source = store.tasks[fromColumn.local_id];
  const [moved] = source.splice(
    source.findIndex((t) => t.local_id === task.local_id),
    1,
  );
  store.tasks[toColumn.local_id].push(moved);

  await store.updateTasksForColumn({
    columnId: fromColumn.local_id,
    tasks: store.tasks[fromColumn.local_id],
    event: { removed: { element: moved } },
  });
  await store.updateTasksForColumn({
    columnId: toColumn.local_id,
    tasks: store.tasks[toColumn.local_id],
    event: { added: { element: moved } },
  });
};

// O TaskDetailForm trabalha numa copia da tarefa clicada (snapshot_task) e e ela que chega
// em deleteTask/updateTask.
const openInModal = (task) => JSON.parse(JSON.stringify(task));

test("carregar quadro lê tarefas/anexos uma vez e preserva colunas, ordem e arquivos", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  let repository;
  let originalGetTasks;
  try {
    const board = await loadBoard(server);
    db = board.db;
    repository = board.kanbanRepository;
    const { store, columnA, columnB, task } = board;
    const later = await repository.add_task({ project_id: PROJECT_ID, column_id: columnA.local_id, order: 5, description: "Depois" });
    const earlier = await repository.add_task({ project_id: PROJECT_ID, column_id: columnA.local_id, order: 1, description: "Antes" });
    const other = await repository.add_task({ project_id: PROJECT_ID, column_id: columnB.local_id, order: 0, description: "Outra coluna" });
    const attachment = await repository.add_attachment({
      task_local_id: task.local_id, project_id: PROJECT_ID,
      name: "arquivo.txt", blob: new Blob(["Conteúdo offline"]), upload_status: "pending",
    });
    let reads = 0;
    originalGetTasks = repository.get_tasks_by_project;
    repository.get_tasks_by_project = async (projectId) => {
      reads++;
      return originalGetTasks.call(repository, projectId);
    };
    await store.loadBoardFromLocal(PROJECT_ID);
    assert.equal(reads, 1, "Não pode reler todos os anexos para cada coluna");
    assert.deepEqual(store.getTasks(columnA.local_id).map((item) => item.local_id), [task.local_id, earlier.local_id, later.local_id]);
    assert.deepEqual(store.getTasks(columnB.local_id).map((item) => item.local_id), [other.local_id]);
    const [loadedAttachment] = store.getTasks(columnA.local_id)[0].attachments;
    assert.equal(loadedAttachment.local_id, attachment.local_id);
    assert.equal(loadedAttachment.upload_status, "pending");
    assert.equal(await loadedAttachment.blob.text(), "Conteúdo offline");
  } finally {
    if (originalGetTasks) repository.get_tasks_by_project = originalGetTasks;
    db?.close();
    await server.close();
  }
});

test("excluir tarefa sem mover de coluna remove ela da interface", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const board = await loadBoard(server);
    db = board.db;
    const { store, columnA, task } = board;

    await store.deleteTask(openInModal(store.getTasks(columnA.local_id)[0]));

    assert.equal(store.getTasks(columnA.local_id).length, 0);
    assert.equal(await board.kanbanRepository.get_task_by_local_id(task.local_id), undefined);
  } finally {
    db?.close();
    await server.close();
  }
});

test("excluir tarefa arrastada para outra coluna remove ela da interface sem precisar de F5", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const board = await loadBoard(server);
    db = board.db;
    const { store, columnA, columnB, task } = board;

    await dragTask(store, store.getTasks(columnA.local_id)[0], columnA, columnB);
    assert.equal(store.getTasks(columnB.local_id).length, 1);

    await store.deleteTask(openInModal(store.getTasks(columnB.local_id)[0]));

    assert.equal(store.getTasks(columnB.local_id).length, 0, "a tarefa excluida continua na coluna de destino");
    assert.equal(store.getTasks(columnA.local_id).length, 0);
    assert.equal(await board.kanbanRepository.get_task_by_local_id(task.local_id), undefined);

    const queued = await board.syncQueueRepository.getPendingTasksByType("DELETE_TASK");
    assert.equal(queued.length, 1);
    assert.equal(queued[0].payload.id, 101);
  } finally {
    db?.close();
    await server.close();
  }
});

test("tarefa arrastada para outra coluna guarda a coluna nova na memoria", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const board = await loadBoard(server);
    db = board.db;
    const { store, columnA, columnB } = board;

    await dragTask(store, store.getTasks(columnA.local_id)[0], columnA, columnB);

    const [moved] = store.getTasks(columnB.local_id);
    assert.equal(moved.column_id, columnB.local_id);
    assert.equal(moved.order, 0);
  } finally {
    db?.close();
    await server.close();
  }
});

test("editar tarefa arrastada para outra coluna nao devolve ela para a coluna antiga", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const board = await loadBoard(server);
    db = board.db;
    const { store, columnA, columnB, task } = board;

    await dragTask(store, store.getTasks(columnA.local_id)[0], columnA, columnB);

    const editable = openInModal(store.getTasks(columnB.local_id)[0]);
    editable.description = "Descricao editada";
    await store.updateTask(editable);

    const stored = await board.kanbanRepository.get_task_by_local_id(task.local_id);
    assert.equal(stored.column_id, columnB.local_id, "o Dexie nao pode voltar a tarefa para a coluna antiga");
    assert.equal(store.getTasks(columnB.local_id)[0].description, "Descricao editada");
  } finally {
    db?.close();
    await server.close();
  }
});
