import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia, setActivePinia } from "pinia";
import { transactionCalendarDate, editedTransactionDate } from "../src/utils/financeNotificationDisplay.js";
import { groupReceiptItems, matchingReceiptItemIds } from "../src/utils/receiptItemGrouping.js";
import { orderedReceiptColumns, moveReceiptColumn, sortReceiptRows } from "../src/utils/receiptGrid.js";
import { paymentMethodChoices, paymentMethodLabel } from "../src/utils/financeCredit.js";

test("dinheiro não é escolha manual: só aparece quando a nota fiscal já definiu o pagamento", () => {
  const values = (current) => paymentMethodChoices(current).map((m) => m.value);
  assert.ok(!values("UNKNOWN").some((v) => ["CASH", "MIXED"].includes(v)));
  assert.ok(!values("PIX").some((v) => ["CASH", "MIXED"].includes(v)));
  assert.ok(values("CASH").includes("CASH") && !values("CASH").includes("MIXED"));
  assert.ok(values("MIXED").includes("MIXED") && !values("MIXED").includes("CASH"));
  assert.equal(paymentMethodLabel("CASH"), "Dinheiro em espécie");
});

test("grids fiscais ordenam nomes e números e movem colunas sem alterar a fonte", () => {
  const columns = [{ key: "description" }, { key: "purchase_count", numeric: true }];
  const rows = [{ id: 1, description: "Z", purchase_count: "2" }, { id: 2, description: "A", purchase_count: "10" }];
  assert.deepEqual(sortReceiptRows(rows, columns[0], "asc").map((row) => row.id), [2, 1]);
  assert.deepEqual(sortReceiptRows(rows, columns[1], "desc").map((row) => row.id), [2, 1]);
  assert.equal(sortReceiptRows(rows, columns[0], null), rows);
  assert.deepEqual(moveReceiptColumn(["description", "purchase_count"], "description", "purchase_count"), ["purchase_count", "description"]);
  assert.deepEqual(orderedReceiptColumns(columns, ["purchase_count", "invalid"]).map((column) => column.key), ["purchase_count", "description"]);
  assert.deepEqual(rows.map((row) => row.id), [1, 2]);
});

test("agrupamento mantém a ordem original e soma somente linhas equivalentes", () => {
  const base = { description: "Produto", supplier_code: "001", product_id: 1, unit: "Un", unit_price: "2.9900000000" };
  const items = [
    { ...base, id: 1, quantity: "0.100000", total: "0.30" },
    { ...base, id: 2, quantity: "0.200000", total: "0.60" },
    { ...base, id: 3, supplier_code: "002", quantity: "1", total: "2.99" },
    { ...base, id: 4, unit_price: "3.00", quantity: "1", total: "3.00" },
    { ...base, id: 5, product_id: 2, quantity: "1", total: "2.99" },
    { ...base, id: 6, quantity: null, total: "2.99" },
  ];
  const original = structuredClone(items);
  const grouped = groupReceiptItems(items);
  assert.equal(grouped.length, 5);
  assert.deepEqual(grouped[0].groupItemIds, [1, 2]);
  assert.equal(grouped[0].quantity, "0.300000");
  assert.equal(grouped[0].total, "0.90");
  assert.deepEqual(grouped.slice(1).map((row) => row.id), [3, 4, 5, 6]);
  assert.deepEqual(items, original);
  assert.deepEqual(matchingReceiptItemIds(items, items[0]), [1, 2, 4, 5, 6]);
  assert.deepEqual(matchingReceiptItemIds([{ id: 1 }, { id: 2 }], { id: 1 }), [1]);
});

test("data fiscal mantém o dia local na virada do mês e parcelas sem hora começam à meia-noite local", () => {
  const fiscal = { provider: "FISCAL_RECEIPT", transaction_date: "2026-11-01T02:45:00Z" };
  assert.equal(transactionCalendarDate(fiscal), "2026-10-31 23:45:00");
  assert.equal(editedTransactionDate(fiscal, "2026-10-31"), fiscal.transaction_date);
  assert.equal(transactionCalendarDate({ ...fiscal, transaction_date: "2026-11-01T03:00:00Z" }), "2026-11-01 00:00:00");
});

const router = {
  name: "receipt-router",
  enforce: "pre",
  resolveId(id) {
    if ((id.startsWith("@/") || id.startsWith(".")) && /router(\/index(\.js)?)?$/.test(id)) return "\0receipt-router";
  },
  load(id) {
    if (id === "\0receipt-router") return "export default {push(){},replace(){},currentRoute:{value:{}}}";
  },
};
async function setup() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
    clear: () => values.clear(),
  };
  Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
  setActivePinia(createPinia());
  const server = await createServer({
    configFile: false,
    plugins: [router, vue()],
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  const load = (p) => server.ssrLoadModule(p);
  const { db } = await load("/src/db.js");
  const { useAuthStore } = await load("/src/stores/auth.js");
  useAuthStore().user = { id: 1 };
  const { api } = await load("/src/plugins/api.js");
  const { receiptService } = await load("/src/services/receiptService.js");
  const { physicalWealthService } = await load('/src/services/physicalWealthService.js');
  const { receiptRepository } = await load("/src/services/localData/receiptRepository.js");
  const { invalidateSyncSession } = await load("/src/utils/syncState.js");
  await db.open();
  return {
    server,
    db,
    api,
    receiptService,
    physicalWealthService,
    receiptRepository,
    useAuthStore,
    invalidateSyncSession,
    close: async () => {
      await db.delete();
      await server.close();
    },
  };
}
test('patrimônio físico preserva consulta offline, isola contas e rejeita respostas de outra sessão', {timeout:30000},async () => {
  const m = await setup();
  const snapshot = {summary:{cash:'123.45'},wallets:[],holdings:[]};
  try {
    m.api.get = async () => ({data:snapshot});
    assert.equal((await m.physicalWealthService.overview()).offline,false);
    m.api.get = async () => { throw new Error('offline'); };
    assert.equal((await m.physicalWealthService.overview()).data.summary.cash,'123.45');
    assert.equal((await m.physicalWealthService.overview()).offline,true);
    m.useAuthStore().user = {id:2};
    await assert.rejects(() => m.physicalWealthService.overview(),/offline/);
    m.useAuthStore().user = {id:1};
    m.api.get = async () => ({data:{summary:null}});
    assert.equal((await m.physicalWealthService.overview()).data.summary.cash,'123.45');
    let resolve, started;
    const ready = new Promise(r => {started = r;});
    m.api.get = () => {started();return new Promise(r => {resolve = r;});};
    const pending = m.physicalWealthService.overview();
    await ready; m.invalidateSyncSession(); resolve({data:{summary:{cash:'999'},wallets:[],holdings:[]}});
    await assert.rejects(pending,/troca de sessão/);
    assert.equal((await m.db.finance_physical_cache.get([1,':{}'])).data.summary.cash,'123.45');
  } finally { await m.close(); }
});

test("Dexie v26 → v29 preserva lançamentos e adiciona os arquivos fiscal e patrimonial", { timeout: 30000 }, async () => {
  const old = new Dexie("KademDB");
  old.version(26).stores({
    finance_transactions:
      "++local_id, local_key, id, transaction_date, type, category_id, payment_method, credit_card_id",
  });
  await old.open();
  await old.table("finance_transactions").add({ id: 123, description: "Preservar", amount: 19.99 });
  old.close();
  const m = await setup();
  try {
    assert.equal(m.db.verno, 29);
    assert.equal((await m.db.finance_transactions.where("id").equals(123).first()).description, "Preservar");
    assert.ok(m.db.finance_receipt_files);
    assert.ok(m.db.finance_physical_cache);
  } finally {
    await m.close();
  }
});
test("captura offline preserva bytes, separa contas e resiste a pull remoto", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    m.api.post = async () => assert.fail("offline não deve enviar documentos");
    const file = new File(["original completo"], "nota.xml", { type: "application/xml" });
    const row = await m.receiptService.capture([file]);
    assert.equal(row.pending_sync, true);
    assert.equal(await m.db.finance_transactions.count(), 0);
    let files = await m.receiptRepository.files(1, row.local_key);
    assert.equal(await files[0].blob.text(), "original completo");
    await m.receiptRepository.merge(1, []);
    files = await m.receiptRepository.files(1, row.local_key);
    assert.equal(files.length, 1);
    m.useAuthStore().user = { id: 2 };
    assert.equal((await m.receiptRepository.list(2)).length, 0);
    await assert.rejects(() => m.receiptService.sync(row.local_key, 1), /conta proprietária/);
    assert.equal((await m.receiptRepository.list(1)).length, 1);
  } finally {
    await m.close();
  }
});
test(
  "reconexão usa identidade estável, mantém original e não repete IA após perda de resposta",
  { timeout: 30000 },
  async () => {
    const m = await setup();
    try {
      const file = new File(["original"], "nota.xml", { type: "application/xml" }),
        row = await m.receiptService.capture([file]);
      navigator.onLine = true;
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      let createCount = 0,
        uploads = 0,
        processCount = 0;
      const operationKeys = [];
      const remote = {
        id: crypto.randomUUID(),
        documents: [],
        items: [],
        links: [],
        warnings: [],
        data: {},
        status: "READY",
      };
      m.api.post = async (url, body) => {
        if (url === "/finance/receipts") {
          createCount++;
          return { data: remote };
        }
        if (url.endsWith("/documents")) {
          uploads++;
          assert.equal(await body.text(), uploads === 1 ? "original" : "outra página");
          remote.documents = [{ id: "document", sha256: hash, file_name: "nota.xml", mime_type: "application/xml" }];
          return { data: remote };
        }
        if (url.endsWith("/process")) {
          processCount++;
          operationKeys.push(body.operation_key);
          if (processCount === 1) throw new Error("Resposta perdida");
          return {
            data: {
              ...remote,
              status: "REVIEW",
              ai_status: "INSUFFICIENT_AI_CREDITS",
              warnings: ["IA indisponível: confira os dados."],
            },
          };
        }
        assert.fail(url);
      };
      await assert.rejects(() => m.receiptService.sync(row.local_key, 1), /Resposta perdida/);
      const result = await m.receiptService.sync(row.local_key, 1);
      assert.equal(createCount, 1);
      assert.equal(uploads, 1);
      assert.equal(operationKeys[0], operationKeys[1]);
      assert.equal(result.pending_sync, false);
      assert.equal(result.ai_status, "INSUFFICIENT_AI_CREDITS");
      assert.equal(await (await m.receiptRepository.files(1, row.local_key))[0].blob.text(), "original");
      await m.receiptService.addDocuments(result, [
        new File(["outra página"], "pagina.xml", { type: "application/xml" }),
      ]);
      assert.equal(processCount, 3);
      assert.notEqual(operationKeys[2], operationKeys[1]);
    } finally {
      await m.close();
    }
  },
);
test("CSV pendente não contabiliza despesa e reimportação conserva client_id", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    const row = { description: "Mercado", type: "EXPENSE", amount: 10, transaction_date: "2026-10-26 10:30:01" };
    await m.receiptService.queueImports([row]);
    await m.receiptService.queueImports([row]);
    const entries = await m.db.finance_import_entries.toArray();
    assert.equal(entries.length, 1);
    assert.equal(await m.db.finance_transactions.count(), 0);
    const tasks = await m.db.syncQueue.toArray();
    assert.ok(tasks.every((t) => t.payload.client_id === entries[0].client_id));
  } finally {
    await m.close();
  }
});
test("resposta atrasada de outra sessão não substitui metadados", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    const row = await m.receiptService.capture([], "referência");
    await m.receiptRepository.save(1, row.local_key, row, { id: "remote" });
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    m.api.get = async () => pending;
    navigator.onLine = true;
    const detail = m.receiptService.detail({ ...row, id: "remote" });
    m.useAuthStore().user = { id: 2 };
    m.invalidateSyncSession();
    release({ data: { id: "remote", merchant: "Resposta antiga" } });
    await assert.rejects(() => detail, /sessão/);
    assert.equal((await m.receiptRepository.get(1, row.local_key)).merchant, undefined);
    assert.equal((await m.receiptRepository.list(2)).length, 0);
  } finally {
    await m.close();
  }
});
test("exclusão conserva os arquivos locais até confirmação do servidor e remove a fila após sucesso", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    const row = await m.receiptService.capture([new File(["original"], "nota.xml")]);
    await m.receiptService.remove(row);
    assert.equal((await m.receiptRepository.list(1)).length, 0);
    assert.equal((await m.db.syncQueue.toArray())[0].type, "DELETE_FINANCE_RECEIPT");
    assert.equal((await m.receiptRepository.files(1, row.local_key)).length, 1);
    navigator.onLine = true;
    m.api.post = async () => ({ data: { id: "remote-note", documents: [] } });
    m.api.delete = async () => { throw new Error("S3 indisponível"); };
    await assert.rejects(() => m.receiptService.remove(row), /S3 indisponível/);
    assert.equal((await m.receiptRepository.files(1, row.local_key)).length, 1);
    m.api.delete = async (url) => { assert.equal(url, "/finance/receipts/remote-note"); return { data: {} }; };
    await m.receiptService.remove(row);
    assert.equal(await m.receiptRepository.get(1, row.local_key), undefined);
    assert.equal((await m.receiptRepository.files(1, row.local_key)).length, 0);
    assert.equal((await m.db.syncQueue.toArray()).filter((task) => task.type === "SYNC_FINANCE_RECEIPT").length, 0);
  } finally { await m.close(); }
});
test("exclusão atualiza a lista com filtros válidos e informa falha de atualização separadamente", { timeout: 60000 }, async () => {
  const m = await setup();
  const originalRemove = m.receiptService.remove;
  const originalList = m.receiptService.list;
  try {
    const { default: component } = await m.server.ssrLoadModule("/src/components/finance/nexo/NexoReceiptsTab.vue");
    assert.deepEqual(component.computed.unmatchedLocalFiles.call({ selected: { documents: [{ id: "remote" }] }, localFiles: [{ local_key: "uploaded", document_id: "remote" }, { local_key: "pending" }] }).map((file) => file.local_key), ["pending"]);
    navigator.onLine = true;
    const target = { local_key: "deleted" };
    const other = { local_key: "other" };
    const events = [];
    const vm = {
      ...component.methods,
      deleteTarget: target, selected: null, confirmDelete: true, rows: [target, other],
      filters: { q: "", from: "", to: "", status: "", amount: "" },
      transactionId: 42, limit: 20, offset: 20, busy: false,
      $emit: (event) => events.push(event),
    };
    m.receiptService.remove = async (row) => assert.equal(row, target);
    m.receiptService.list = async (filters) => {
      assert.deepEqual(filters, { limit: 20, transaction_id: 42 });
      const rows = [other];
      rows.has_more = false;
      return rows;
    };
    await vm.deleteReceipt();
    assert.deepEqual(vm.rows.map((row) => row.local_key), ["other"]);
    assert.equal(vm.offset, 0);
    assert.equal(vm.hasMore, false);
    assert.equal(vm.message, "Nota fiscal excluída.");
    assert.deepEqual(events, ["changed"]);

    vm.deleteTarget = target;
    vm.rows = [target, other];
    m.receiptService.list = async () => { throw new Error("falha de rede"); };
    await vm.deleteReceipt();
    assert.deepEqual(vm.rows.map((row) => row.local_key), ["other"]);
    assert.match(vm.captureFailure, /excluída, mas não foi possível atualizar/);
    assert.deepEqual(events, ["changed", "changed"]);
  } finally {
    m.receiptService.remove = originalRemove;
    m.receiptService.list = originalList;
    await m.close();
  }
});
test("associação de item agrupado atualiza cada linha e permite voltar à ordem original", { timeout: 60000 }, async () => {
  const m = await setup();
  const originalDetail = m.receiptService.detail;
  try {
    const { default: component } = await m.server.ssrLoadModule("/src/components/finance/nexo/NexoReceiptsTab.vue");
    const items = [
      { id: 1, description: "Produto", supplier_code: "1", product_id: 3, unit: "Un", unit_price: "2.99", quantity: "1", total: "2.99" },
      { id: 2, description: "Outro", supplier_code: "2", product_id: 4, unit: "Un", unit_price: "1.00", quantity: "1", total: "1.00" },
      { id: 3, description: "Produto", supplier_code: "1", product_id: 3, unit: "Un", unit_price: "2.99", quantity: "1", total: "2.99" },
    ];
    const selected = { id: "receipt", local_key: "local", items };
    const vm = { ...component.methods, selected, busy: false, groupItems: true };
    const grouped = component.computed.displayedReceiptItems.call(vm);
    assert.deepEqual(grouped.map((item) => item.id), [1, 2]);
    vm.groupItems = false;
    assert.deepEqual(component.computed.displayedReceiptItems.call(vm).map((item) => item.id), [1, 2, 3]);
    vm.productItem = items[0];
    const calls = [];
    m.api.patch = async (url, body) => { calls.push([url, body.product_id]); };
    m.receiptService.detail = async (row) => row;
    await vm.assignProduct({ id: 7 });
    assert.deepEqual(calls, [["/finance/receipts/receipt/items/1/product", 7], ["/finance/receipts/receipt/items/3/product", 7]]);
    assert.equal(vm.productItem, null);
    vm.productItem = grouped[0];
    m.api.patch = async (url) => { if (url.includes("/3/")) throw new Error("indisponível"); };
    await vm.assignProduct({ id: 7 });
    assert.match(vm.error, /Associação parcial: 1 de 2/);
  } finally {
    m.receiptService.detail = originalDetail;
    await m.close();
  }
});
test("outro dispositivo remove cópia offline quando descobre a exclusão no servidor", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    const row = await m.receiptService.capture([new File(["original"], "nota.xml")]);
    navigator.onLine = true;
    m.api.get = async () => ({ data: [] });
    m.api.post = async (url, body) => {
      assert.equal(url, "/finance/receipts/deletion-status");
      assert.deepEqual(body.client_ids, [row.local_key]);
      return { data: [row.local_key] };
    };
    await m.receiptService.list();
    assert.equal(await m.receiptRepository.get(1, row.local_key), undefined);
    assert.equal((await m.receiptRepository.files(1, row.local_key)).length, 0);
    assert.equal((await m.db.syncQueue.toArray()).filter((task) => task.type === "SYNC_FINANCE_RECEIPT").length, 0);
  } finally { await m.close(); }
});

test("falha ao enviar cancela rascunho remoto vazio e remove a fila", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    navigator.onLine = true;
    let clientId;
    m.api.post = async (url, body) => {
      if (url === "/finance/receipts") { clientId = body.client_id; return { data: { id: "draft", client_id: clientId, documents: [] } }; }
      throw Object.assign(new Error("upload falhou"), { response: { status: 400, data: { message: "Arquivo inválido" } } });
    };
    m.api.get = async () => ({ data: { id: "draft", client_id: clientId, documents: [] } });
    m.api.delete = async (url) => { assert.equal(url, "/finance/receipts/draft"); };
    await assert.rejects(() => m.receiptService.capture([new File(["x"], "nota.xml")]), /Arquivo inválido.*inserção foi cancelada/);
    assert.equal(await m.db.finance_receipts.count(), 0);
    assert.equal(await m.db.finance_receipt_files.count(), 0);
    assert.equal(await m.db.syncQueue.count(), 0);
  } finally { await m.close(); }
});

test("falha após arquivo recebido preserva original, suspende envio e permite tentativa explícita", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    navigator.onLine = true;
    let key;
    let processCount = 0;
    const original = new File(["original"], "nota.xml", { type: "application/xml" });
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await original.arrayBuffer())), b => b.toString(16).padStart(2, "0")).join("");
    m.api.post = async (url, body) => {
      if (url === "/finance/receipts") { key = body.client_id; return { data: { id: "draft", client_id: key, documents: [] } }; }
      if (url.endsWith("/documents")) return { data: { id: "draft", client_id: key, documents: [{ id: "doc", sha256: hash }] } };
      if (url.endsWith("/process")) { if (++processCount === 1) throw new Error("conexão interrompida"); return { data: { id: "draft", client_id: key, documents: [{ id: "doc", sha256: hash }], status: "REVIEW" } }; }
      assert.fail(url);
    };
    m.api.get = async () => assert.fail("não deve excluir nota processada");
    m.api.delete = async () => assert.fail("não deve excluir nota processada");
    await assert.rejects(() => m.receiptService.capture([original]), /preservado.*não será reenviado/);
    const task = (await m.db.syncQueue.toArray())[0];
    assert.equal(task.status, "FAILED");
    assert.match(task.last_error, /conexão interrompida/);
    const row = await m.receiptRepository.get(1, key);
    assert.equal(await (await m.receiptRepository.files(1, key))[0].blob.text(), "original");
    await m.receiptService.retry(row);
    assert.equal(await m.db.syncQueue.count(), 0);
    assert.equal((await m.receiptRepository.get(1, key)).pending_sync, false);
  } finally { await m.close(); }
});

test("modal de captura fecha e mostra falhas sem mensagem de sucesso", { timeout: 30000 }, async () => {
  const m = await setup();
  const originalCapture = m.receiptService.capture;
  try {
    const { default: component } = await m.server.ssrLoadModule("/src/components/finance/nexo/NexoReceiptsTab.vue");
    const vm = { ...component.methods, busy: false, groupPhotos: false, captureModalOpen: true, message: "", captureFailure: "", stopCamera() {}, reload: async () => {}, $emit() {} };
    m.receiptService.capture = async () => { assert.equal(vm.captureModalOpen, false); throw new Error("Arquivo inválido. A inserção foi cancelada."); };
    await vm.selectFiles({ target: { files: [new File(["x"], "nota.xml")], value: "x" } });
    assert.equal(vm.captureModalOpen, false);
    assert.equal(vm.message, "");
    assert.match(vm.captureFailure, /Arquivo inválido.*cancelada/);
    m.receiptService.capture = async () => ({});
    vm.captureFailure = ""; vm.captureModalOpen = true;
    await vm.selectFiles({ target: { files: [new File(["x"], "nota.xml")], value: "x" } });
    assert.equal(vm.captureModalOpen, false);
    assert.equal(vm.captureFailure, "");
    assert.match(vm.message, /aguardando conexão/);
  } finally { m.receiptService.capture = originalCapture; await m.close(); }
});

test("captura reverte gravação local se não conseguir criar a tarefa de envio", { timeout: 30000 }, async () => {
  const m = await setup();
  const { syncQueueRepository } = await m.server.ssrLoadModule("/src/services/localData/syncQueueRepository.js");
  const originalAdd = syncQueueRepository.addSyncQueueTask;
  try {
    syncQueueRepository.addSyncQueueTask = async () => { throw new Error("fila indisponível"); };
    await assert.rejects(() => m.receiptService.capture([new File(["original"], "nota.xml")]), /fila indisponível/);
    assert.equal(await m.db.finance_receipts.count(), 0);
    assert.equal(await m.db.finance_receipt_files.count(), 0);
  } finally { syncQueueRepository.addSyncQueueTask = originalAdd; await m.close(); }
});

test("exclusão fecha confirmação e remove a linha antes de o servidor responder", { timeout: 30000 }, async () => {
  const m = await setup();
  const originalRemove = m.receiptService.remove;
  try {
    const { default: component } = await m.server.ssrLoadModule("/src/components/finance/nexo/NexoReceiptsTab.vue");
    const target = await m.receiptService.capture([new File(["original"], "nota.xml")]);
    let reject;
    m.receiptService.remove = () => new Promise((_resolve, fail) => { reject = fail; });
    const vm = { ...component.methods, deleteTarget: target, selected: null, confirmDelete: true, rows: [target], $emit() {} };
    const deleting = vm.deleteReceipt();
    assert.equal(vm.confirmDelete, false);
    assert.equal(vm.deleteTarget, null);
    assert.equal(vm.rows.length, 0);
    reject(new Error("armazenamento indisponível"));
    await deleting;
    assert.match(vm.captureFailure, /armazenamento indisponível/);
    assert.equal(vm.rows.length, 1);
  } finally { m.receiptService.remove = originalRemove; await m.close(); }
});

test("pull concorrente não restaura uma exclusão fiscal pendente e retry não reenvia o arquivo", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    const row = await m.receiptService.capture([new File(["original"], "nota.xml")]);
    await m.receiptRepository.save(1, row.local_key, { id: "remote-note" });
    await m.receiptService.remove(row);
    await m.receiptRepository.merge(1, [{ id: "remote-note", merchant: "Não restaurar" }]);
    assert.equal((await m.receiptRepository.list(1)).length, 0);
    assert.equal((await m.receiptRepository.files(1, row.local_key)).length, 1);
    navigator.onLine = true;
    m.api.post = async () => assert.fail("não deve reenviar original excluído");
    m.api.delete = async () => { throw Object.assign(new Error("já excluída"), { response: { status: 404 } }); };
    const { createPersonalSyncExecutor } = await m.server.ssrLoadModule("/src/services/personalSyncExecutor.js");
    const executor = createPersonalSyncExecutor({ api: m.api, getUserId: () => 1, deleteReceipt: payload => m.receiptService.syncDeletion(payload.local_key, payload.user_id) });
    await executor.finance((await m.db.syncQueue.toArray())[0]);
    assert.equal(await m.db.finance_receipts.count(), 0);
    assert.equal(await m.db.finance_receipt_files.count(), 0);
    assert.equal(await m.db.syncQueue.count(), 0);
  } finally { await m.close(); }
});

test("tentativa interativa não fica disponível simultaneamente na fila de upload", { timeout: 30000 }, async () => {
  const m = await setup();
  try {
    navigator.onLine = true;
    m.api.post = async () => {
      const { syncQueueRepository } = await m.server.ssrLoadModule("/src/services/localData/syncQueueRepository.js");
      assert.equal((await syncQueueRepository.getPendingTasks()).length, 0);
      throw new Error("offline");
    };
    await assert.rejects(() => m.receiptService.capture([new File(["original"], "nota.xml")]), /offline/);
    assert.equal((await m.db.syncQueue.toArray())[0].status, "FAILED");
  } finally { await m.close(); }
});
