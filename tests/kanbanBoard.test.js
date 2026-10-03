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

test('tipo e nome são independentes; status acompanha configuração e movimento offline', { timeout: 30000 }, async () => withHierarchyBoard(async ({ store, columnA, columnB, kanbanRepository: repo, syncQueueRepository: queue }) => {
  await store.updateColumn({ local_id: columnA.local_id, title: 'Publicado 🚀', type: 'WAITING' });
  assert.equal(store.getTasks(columnA.local_id)[0].status, 'WAITING');
  assert.equal(store.getColumns(PROJECT_ID)[0].name, 'Publicado 🚀');
  await store.updateColumn({ local_id: columnA.local_id, title: 'Aguardando cliente' });
  assert.equal((await repo.get_column_by_local_id(columnA.local_id)).type, 'WAITING');
  const edits = await queue.getPendingTasksByType('UPDATE_COLUMN');
  assert.equal(edits.at(-1).payload.type, undefined, 'Renomear não deve reenviar o tipo anterior.');
  await store.updateColumn({ local_id: columnB.local_id, type: 'DONE' });
  await dragTask(store, store.getTasks(columnA.local_id)[0], columnA, columnB);
  assert.equal(store.getTasks(columnB.local_id)[0].status, 'DONE');
  await store.loadBoardFromLocal(PROJECT_ID);
  assert.equal(store.getTasks(columnB.local_id)[0].status, 'DONE');
  await store.updateColumn({ local_id: columnB.local_id, type: 'BLOCKED' });
  assert.equal(store.getTasks(columnB.local_id)[0].status, 'BLOCKED');
  await assert.rejects(store.updateColumn({ local_id: columnB.local_id, type: 'INVALID' }));
  assert.equal((await repo.get_column_by_local_id(columnB.local_id)).type, 'BLOCKED');
}));

test('pull preserva tipo e movimento pendentes, inclusive retry futuro, e recebe o nome remoto', { timeout: 30000 }, async () => withHierarchyBoard(async ({ store, columnA, columnB, kanbanRepository: repo, db }) => {
  await store.updateColumn({ local_id: columnA.local_id, type: 'WAITING' });
  await store.moveTaskToColumn(store.getTasks(columnA.local_id)[0], columnB.local_id);
  await db.syncQueue.toCollection().modify({ status: 'RETRY', next_attempt_at: Date.now() + 60000 });
  await repo.mergeServerData(PROJECT_ID, [
    { id: 11, name: 'Nome remoto', type: 'TODO', position: 0 },
    { id: 12, name: 'Publicado 🚀', type: 'DONE', position: 1 },
  ], [{ id: 101, column_id: 11, description: 'Snapshot remoto antigo', order: 0 }]);
  await store.loadBoardFromLocal(PROJECT_ID);
  assert.equal(store.getColumns(PROJECT_ID)[0].type, 'WAITING');
  assert.equal(store.getColumns(PROJECT_ID)[0].name, 'Nome remoto');
  assert.equal(store.getTasks(columnA.local_id).length, 0);
  assert.equal(store.getTasks(columnB.local_id)[0].status, 'DONE');
}));

test('reconectar envia tipo na criação e edição, e timestamp no movimento', { timeout: 30000 }, async () => withHierarchyBoard(async ({ store, columnA, columnB, syncQueueRepository: queue }, server) => {
  const { api } = await server.ssrLoadModule('/src/plugins/api.js');
  const { syncService } = await server.ssrLoadModule('/src/services/syncService.js');
  const { useUtilsStore } = await server.ssrLoadModule('/src/stores/utils.js');
  const { projectRepository } = await server.ssrLoadModule('/src/services/localData/projectRepository.js');
  await projectRepository.saveLocalProject({ localId: PROJECT_ID, id: 8, name: 'Teste' });
  await store.createColumn(PROJECT_ID, 'Publicado 🚀', 'DONE');
  await store.updateColumn({ local_id: columnA.local_id, type: 'WAITING' });
  await store.moveTaskToColumn(store.getTasks(columnA.local_id)[0], columnB.local_id);
  const oldPost = api.post, oldPut = api.put, oldGet = api.get;
  const writes = [];
  try {
    api.post = async (url, payload) => { writes.push({ url, payload }); return { data: { id: 99 } }; };
    api.put = async (url, payload) => { writes.push({ url, payload }); return { data: {} }; };
    api.get = async () => ({ data: { changes: [], next_cursor: 0, has_more: false } });
    useUtilsStore().is_network_online = true;
    useUtilsStore().is_kadem_api_available = true;
    await syncService.processSyncQueue();
    assert.equal(writes.find(write => write.url === '/kanban/columns').payload.type, 'DONE');
    assert.deepEqual(writes.find(write => write.url === '/kanban/columns/11').payload.changes.map(change => [change.field, change.value]), [['type', 'WAITING']]);
    assert.equal(typeof writes.find(write => write.url.endsWith('/reorder-tasks')).payload.timestamp, 'number');
    assert.equal((await queue.getPendingTasks()).length, 0);
  } finally {
    api.post = oldPost; api.put = oldPut; api.get = oldGet;
    useUtilsStore().is_network_online = false;
    useUtilsStore().is_kadem_api_available = false;
  }
}));

test('upgrade Dexie v23 → v24 acrescenta tipo e aliases sem inferir pelo nome nem perder a fila', { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db, oldDb;
  try {
    installMemoryStorage();
    ({ db } = await server.ssrLoadModule('/src/db.js'));
    const oldSchema = Object.fromEntries(db.tables.map(table => [table.name,
      [table.schema.primKey.src, ...table.schema.indexes.map(index => index.src)].join(', ')
    ]));
    await db.delete();
    oldDb = new db.constructor(db.name);
    oldDb.version(23).stores(oldSchema);
    await oldDb.open();
    await oldDb.table('kanban_columns').add({ local_id: 90, title: 'Publicado 🚀', order: 4, project_id: PROJECT_ID });
    await oldDb.table('syncQueue').add({ type: 'UPDATE_COLUMN', entity_id: 90, payload: { title: 'Nome pendente' }, status: 'FAILED' });
    oldDb.close();
    await db.open();
    const column = await db.kanban_columns.get(90);
    assert.equal(column.type, 'TODO');
    assert.equal(column.name, 'Publicado 🚀');
    assert.equal(column.position, 4);
    assert.equal((await db.syncQueue.toArray())[0].payload.title, 'Nome pendente');
    assert.equal((await db.syncQueue.toArray())[0].status, 'FAILED');
  } finally { oldDb?.close(); db?.close(); await server.close(); }
});

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

const withHierarchyBoard = async (run) => {
  const server = await createViteServer();
  let board;
  try {
    board = await loadBoard(server);
    const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js');
    useAuthStore().user = { id: 1, name: 'Teste' };
    await run(board, server);
  } finally {
    board?.db.close();
    await server.close();
  }
};

test('criar, vincular e desvincular filhas offline persiste após recarregar', { timeout: 30000 }, () => withHierarchyBoard(async ({ store, task, columnB, kanbanRepository: repo, syncQueueRepository: queue }) => {
  const child = await store.createTask(columnB.local_id, { project_id: PROJECT_ID, description: 'Filha offline', parent_task_local_id: task.local_id });
  assert.equal(child.parent_task_local_id, task.local_id);
  assert.equal(child.id, null);
  await store.loadBoardFromLocal(PROJECT_ID);
  assert.equal(store.taskHierarchy.children.get(task.local_id)[0].local_id, child.local_id);
  await store.setTaskParent(child, null);
  assert.equal(store.taskHierarchy.children.get(task.local_id), undefined);
  await store.setTaskParent(child, task.local_id);
  assert.equal((await repo.get_task_by_local_id(child.local_id)).parent_task_local_id, task.local_id);
  assert.equal((await queue.getPendingTasksByType('CREATE_TASK')).length, 1);
  assert.equal((await queue.getPendingTasksByType('UPDATE_TASK_PARENT')).length, 2);
}));

test('hierarquia recusa ciclos e vínculos entre projetos', { timeout: 30000 }, () => withHierarchyBoard(async ({ store, task, columnA, kanbanRepository: repo }) => {
  const child = await store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Filha', parent_task_local_id: task.local_id });
  const grandchild = await store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Neta', parent_task_local_id: child.local_id });
  await assert.rejects(store.setTaskParent(task, grandchild.local_id), /circular/);
  await assert.rejects(store.setTaskParent(task, task.local_id), /circular/);
  const other = await repo.add_task({ project_id: 999, column_id: columnA.local_id });
  await assert.rejects(store.setTaskParent(task, other.local_id), /circular/);
  assert.equal((await repo.get_task_by_local_id(task.local_id)).parent_task_local_id ?? null, null);
}));

test('falha ao enfileirar criação de filha não deixa tarefa órfã no dispositivo', { timeout: 30000 }, () => withHierarchyBoard(async ({ store, task, columnA, db, syncQueueRepository: queue }) => {
  const originalAdd = queue.addSyncQueueTask;
  const initialCount = await db.kanban_tasks.count();
  queue.addSyncQueueTask = async () => { throw new Error('Fila indisponível'); };
  try {
    await assert.rejects(store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Não deve ficar salva', parent_task_local_id: task.local_id }), /Fila indisponível/);
    assert.equal(await db.kanban_tasks.count(), initialCount);
    assert.equal(store.getTasks(columnA.local_id).length, 1);
  } finally { queue.addSyncQueueTask = originalAdd; }
}));

test('excluir pai ou coluna preserva filhas em outras colunas', { timeout: 30000 }, () => withHierarchyBoard(async ({ store, task, columnA, columnB, kanbanRepository: repo }) => {
  const child = await store.createTask(columnB.local_id, { project_id: PROJECT_ID, description: 'Filha', parent_task_local_id: task.local_id });
  await store.deleteTask(task);
  assert.equal((await repo.get_task_by_local_id(child.local_id)).parent_task_local_id, null);
  assert.equal(store.getTasks(columnB.local_id)[0].parent_task_local_id, null);
  const nextParent = await store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Outro pai' });
  await store.setTaskParent(child, nextParent.local_id);
  await store.deleteColumn(columnA);
  assert.equal((await repo.get_task_by_local_id(child.local_id)).parent_task_local_id, null);
  assert.equal(await repo.get_task_by_local_id(nextParent.local_id), undefined);
}));

test('pull resolve pai em qualquer ordem e preserva edição de vínculo pendente', { timeout: 30000 }, () => withHierarchyBoard(async ({ store, task, columnA, kanbanRepository: repo, db }) => {
  const columns = [{ id: 11, title: 'A fazer', order_index: 0 }];
  const remote = (id, parent_task_id) => ({ id, parent_task_id, column_id: 11, description: `Remota ${id}`, order_index: 0 });
  await repo.mergeServerData(PROJECT_ID, columns, [remote(202, 201), remote(201, null), remote(task.id, null)]);
  await store.loadBoardFromLocal(PROJECT_ID);
  const all = store.getProjectTasks(PROJECT_ID);
  const parent = all.find(t => t.id === 201);
  const child = all.find(t => t.id === 202);
  assert.equal(child.parent_task_local_id, parent.local_id);
  await store.setTaskParent(child, task.local_id);
  // Even a retry not due yet must protect the local relationship.
  await db.syncQueue.toCollection().modify({ status: 'RETRY', next_attempt_at: '2099-01-01T00:00:00Z' });
  await repo.mergeServerData(PROJECT_ID, [], [remote(202, 201)], true);
  assert.equal((await repo.get_task_by_local_id(child.local_id)).parent_task_local_id, task.local_id);
  await db.syncQueue.clear();
  await repo.mergeServerData(PROJECT_ID, [], [remote(202, null)], true);
  assert.equal((await repo.get_task_by_local_id(child.local_id)).parent_task_local_id, null);
  assert.equal((await repo.get_task_by_local_id(child.local_id)).column_id, columnA.local_id);
}));

test('editar os detalhes com snapshot antigo não restaura um pai desvinculado', { timeout: 30000 }, () => withHierarchyBoard(async ({ store, task, columnA, kanbanRepository: repo }) => {
  const child = await store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Filha', parent_task_local_id: task.local_id });
  const snapshot = openInModal(child);
  await store.setTaskParent(child, null);
  snapshot.description = 'Editada';
  await store.updateTask(snapshot);
  assert.equal((await repo.get_task_by_local_id(child.local_id)).parent_task_local_id, null);
  assert.equal(store.taskHierarchy.byId.get(child.local_id).parent_task_local_id, null);
}));

test('reconectar cria pais antes de filhas e envia apenas IDs remotos', { timeout: 30000 }, () => withHierarchyBoard(async ({ store, columnA, db, syncQueueRepository: queue, kanbanRepository: repo }, server) => {
  const { api } = await server.ssrLoadModule('/src/plugins/api.js');
  const { syncService } = await server.ssrLoadModule('/src/services/syncService.js');
  const { useUtilsStore } = await server.ssrLoadModule('/src/stores/utils.js');
  const posts = [], puts = [];
  api.post = async (url, body) => { posts.push({ url, body }); return { data: { id: 900 + posts.length } }; };
  api.put = async (url, body) => { puts.push({ url, body }); return { data: {} }; };
  api.get = async () => ({ data: { changes: [], next_cursor: 0, has_more: false } });
  const parent = await store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Pai novo' });
  const child = await store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Filha nova', parent_task_local_id: parent.local_id });
  await store.setTaskParent(child, null);
  assert.equal(posts.length, 0);
  const utils = useUtilsStore();
  utils.is_network_online = true;
  utils.is_kadem_api_available = true;
  await syncService.processSyncQueue();
  assert.equal(posts.length, 2);
  assert.equal(posts[0].body.parent_task_id, null);
  assert.equal(posts[1].body.parent_task_id, 901);
  assert.equal('parent_task_local_id' in posts[1].body, false);
  assert.equal(puts[0].url, '/kanban/tasks/902');
  assert.equal(puts[0].body.changes[0].value, null);
  assert.equal((await queue.getPendingTasks()).length, 0);
  assert.equal((await repo.get_task_by_local_id(child.local_id)).id, 902);
  assert.equal((await db.kanban_tasks.get(child.local_id)).parent_task_local_id, null);
}));

test('excluir pai criado offline antes de reconectar envia apenas a filha independente', { timeout: 30000 }, () => withHierarchyBoard(async ({ store, columnA, syncQueueRepository: queue }, server) => {
  const { api } = await server.ssrLoadModule('/src/plugins/api.js');
  const { syncService } = await server.ssrLoadModule('/src/services/syncService.js');
  const { useUtilsStore } = await server.ssrLoadModule('/src/stores/utils.js');
  const posts = [];
  api.post = async (_url, body) => { posts.push(body); return { data: { id: 1001 } }; };
  api.put = async () => ({ data: {} });
  api.get = async () => ({ data: { changes: [], next_cursor: 0, has_more: false } });
  const parent = await store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Pai temporário' });
  await store.createTask(columnA.local_id, { project_id: PROJECT_ID, description: 'Filha preservada', parent_task_local_id: parent.local_id });
  await store.deleteTask(parent);
  useUtilsStore().is_network_online = true;
  useUtilsStore().is_kadem_api_available = true;
  await syncService.processSyncQueue();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].description, 'Filha preservada');
  assert.equal(posts[0].parent_task_id, null);
  assert.equal((await queue.getPendingTasks()).length, 0);
}));

test('upgrade Dexie v22 → v24 preserva tarefa, comentários e blob offline', { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  let oldDb;
  try {
    installMemoryStorage();
    ({ db } = await server.ssrLoadModule('/src/db.js'));
    const oldSchema = Object.fromEntries(db.tables.map(table => [table.name,
      [table.schema.primKey.src, ...table.schema.indexes.filter(index => index.name !== 'parent_task_local_id').map(index => index.src)].join(', ')
    ]));
    await db.delete();
    oldDb = new db.constructor(db.name);
    oldDb.version(22).stores(oldSchema);
    await oldDb.open();
    await oldDb.table('kanban_tasks').add({ local_id: 91, project_id: PROJECT_ID, description: 'Existente', comments: [{ content: 'Preservado' }] });
    await oldDb.table('kanban_task_attachments').add({ task_local_id: 91, project_id: PROJECT_ID, blob: new Blob(['Arquivo preservado']) });
    oldDb.close();
    await db.open();
    assert.equal(db.verno, 24);
    const task = await db.kanban_tasks.get(91);
    assert.equal(task.description, 'Existente');
    assert.equal(task.comments[0].content, 'Preservado');
    assert.equal(task.parent_task_local_id, null);
    assert.equal(await (await db.kanban_task_attachments.toArray())[0].blob.text(), 'Arquivo preservado');
  } finally { oldDb?.close(); db?.close(); await server.close(); }
});

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
