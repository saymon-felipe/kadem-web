import { before, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia, setActivePinia } from "pinia";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { transactionCalendarDate, transactionReferenceMonth, transactionDescription, transactionObservation, editedTransactionDate } from "../src/utils/financeNotificationDisplay.js";
import {creditSummary,normalizePaymentOrigin} from '../src/utils/financeCredit.js';

test('crédito agrega centavos por categoria/cartão e exclui débito, pix, ignorados e cancelados',()=>{
  const summary=creditSummary([
    {type:'EXPENSE',amount:.1,payment_method:'CREDIT_CARD',credit_card_id:1,category_id:2},
    {type:'EXPENSE',amount:.2,payment_method:'CREDIT_CARD',credit_card_id:1,category_id:2},
    {type:'EXPENSE',amount:10,payment_method:'CREDIT_CARD',credit_card_id:null,payment_review_reason:'Cartão'},
    ...['PIX','DEBIT_CARD'].map(payment_method=>({type:'EXPENSE',amount:100,payment_method})),
    {type:'EXPENSE',amount:50,payment_method:'CREDIT_CARD',is_ignored:true},
    {type:'EXPENSE',amount:50,payment_method:'CREDIT_CARD',status:'CANCELED'},
  ],[{id:2,name:'Mercado',color:'#ff0000'}]);
  assert.equal(summary.expense,10.3);assert.equal(summary.unassigned,10);assert.equal(summary.review_count,1);
  const card=summary.by_card.find(c=>c.credit_card_id===1);assert.equal(card.total,.3);assert.equal(card.categories[0].total,.3);
  assert.equal(normalizePaymentOrigin({payment_method:'PIX'},{type:'EXPENSE',credit_card_id:1}).credit_card_id,null);
});

test('cartão criado offline sobrevive ao pull e sincroniza antes da compra, remapeando referências', {timeout:30000},async()=>{
  const server=await createViteServer();let db;
  try{
    const m=await loadOfflineFinance(server);db=m.db;m.setOnline(false);
    const {data:card}=await m.financeService.saveCreditCard(null,{name:'Pessoal',bank:'PicPay',last_four:'0042',brand:'Visa',credit_limit:1000});
    await m.financeService.createTransaction({description:'Mercado',type:'EXPENSE',amount:20,transaction_date:'2026-10-21',payment_method:'CREDIT_CARD',credit_card_id:card.id});
    await m.financeRepository.setCreditCards([]);
    assert.equal((await m.financeRepository.getCreditCards()).length,1);
    await m.financeService.saveCreditCard(card.id,{name:'Editado offline'});
    await m.financeRepository.setCreditCards([{id:987,name:'Remoto',last_four:'9999',bank:'Outro',brand:'Visa'}]);
    assert.ok((await m.financeRepository.getCreditCards()).some(c=>c.name==='Editado offline'));
    m.api.put=async (_url,body)=>({data:{id:100,...body}});
    m.setOnline(true);await m.syncService.processSyncQueue();
    assert.deepEqual(m.posts.map(p=>p.url),['/finance/credit-cards','/finance/transactions']);
    assert.equal(m.posts[1].body.credit_card_id,100);
    assert.equal((await m.financeRepository.getTransactions({month:'2026-10'}))[0].credit_card_id,100);
    assert.equal((await m.financeRepository.findCreditCard(100)).name,'Editado offline');
    assert.equal((await m.syncQueueRepository.getPendingTasks()).length,0);
  } finally{db?.close();await server.close()}
});

test('cartão principal funciona offline, prevalece no pull e segue para a sincronização', { timeout: 30000 }, async () => {
  const server = await createViteServer(); let db;
  try {
    const m = await loadOfflineFinance(server); db = m.db; m.setOnline(false);
    const cards = [
      { id: 10, name: 'Um', bank: 'Banco', last_four: '0001', brand: 'Visa', credit_limit: 100, is_primary: 1, is_archived: 0 },
      { id: 11, name: 'Dois', bank: 'Banco', last_four: '0002', brand: 'Visa', credit_limit: 100, is_primary: 0, is_archived: 0 },
    ];
    await m.financeRepository.setCreditCards(cards);
    await m.financeService.saveCreditCard(11, { is_primary: true });
    await m.financeRepository.setCreditCards(cards);
    let local = await m.financeRepository.getCreditCards();
    assert.equal(Number(local.find((c) => c.id === 10).is_primary), 0);
    assert.equal(Number(local.find((c) => c.id === 11).is_primary), 1);
    const sent = [];
    m.api.put = async (url, body) => { sent.push({ url, body }); return { data: { ...cards[1], ...body } }; };
    m.setOnline(true); await m.syncService.processSyncQueue();
    assert.equal(sent[0].body.is_primary, true);
    assert.equal(sent[0].url, '/finance/credit-cards/11');
    local = await m.financeRepository.getCreditCards();
    assert.equal(local.filter((c) => Number(c.is_primary)).length, 1);
  } finally { db?.close(); await server.close(); }
});

test("revisão direta salva offline e preserva data, categoria e escolha manual", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    m.setOnline(false);
    const { default: Nexo } = await server.ssrLoadModule("/src/components/finance/KademNexo.vue");
    await m.addCategory({ id: 7, name: "Mercado", type: "EXPENSE" });
    const { data: transaction } = await m.financeService.createTransaction({
      description: "Mercado", amount: 20, type: "EXPENSE", payment_method: "UNKNOWN",
      category_id: 7,
      transaction_date: "2026-10-22T00:00:25.909Z", observation: "Descrição original",
    });
    let saved;
    let refreshes = 0;
    const context = {
      savingPaymentOriginIds: [], paymentOriginError: "",
      transactionKey: Nexo.methods.transactionKey,
      upsertTransactionInList(value) { saved = value; },
      async refreshTransactionDrivenViews() { refreshes++; },
    };
    const { data: card } = await m.financeService.saveCreditCard(null, {
      name: "Pessoal", bank: "Banco", last_four: "0042", brand: "Visa", credit_limit: 1000,
    });
    await Nexo.methods.selectTransactionPaymentOrigin.call(context, transaction, {
      payment_method: "CREDIT_CARD", credit_card_id: card.id,
    });
    assert.equal(saved.credit_card_id, card.id);
    assert.equal(saved.payment_review_reason, null);
    assert.equal(saved.payment_source_locked, 1);
    await Nexo.methods.selectTransactionPaymentOrigin.call(context, saved, {
      payment_method: "PIX", credit_card_id: null,
    });
    const persisted = await m.financeRepository.findTransaction(saved.id || saved.local_id);
    assert.equal(persisted.payment_method, "PIX");
    assert.equal(persisted.credit_card_id, null);
    assert.equal(persisted.payment_review_reason, null);
    assert.equal(persisted.payment_source_locked, 1);
    assert.equal(persisted.transaction_date, transaction.transaction_date);
    assert.equal(persisted.observation, transaction.observation);
    assert.equal(persisted.amount, transaction.amount);
    assert.equal(persisted.category_id, transaction.category_id);
    assert.equal(refreshes, 2);
    assert.deepEqual(context.savingPaymentOriginIds, []);
    assert.equal(context.paymentOriginError, "");
    assert.equal(m.posts.length, 0);
  } finally { db?.close(); await server.close(); }
});

test("Genos apresenta o instante no fuso bancário sem alterar datas de CSV nem os dados persistidos", () => {
  const notification = {
    provider: "GENOS_NOTIFICATION", source: "IMPORT", transaction_date: "2026-10-22T00:00:25.909Z",
    description: "PicPay: UNKNOWN para Mercado", observation: "PicPay · UNKNOWN · Mercado",
  };
  assert.equal(transactionCalendarDate(notification), "2026-10-21 21:00:25");
  assert.equal(transactionCalendarDate({ ...notification, transaction_date: "2026-11-01T02:59:59Z" }), "2026-10-31 23:59:59");
  assert.equal(transactionCalendarDate({ ...notification, transaction_date: "2026-10-21T21:00:25-03:00" }), "2026-10-21 21:00:25");
  assert.equal(transactionDescription(notification), "PicPay: Transação para Mercado");
  assert.equal(transactionObservation(notification), "");
  assert.equal(notification.transaction_date, "2026-10-22T00:00:25.909Z");
  assert.equal(notification.description, "PicPay: UNKNOWN para Mercado");
  const csv = { ...notification, provider: "CSV", transaction_date: "2026-10-21 00:00:00" };
  assert.equal(transactionCalendarDate(csv), csv.transaction_date);
  assert.equal(transactionDescription(csv), csv.description);
  assert.equal(transactionCalendarDate({ ...csv, transaction_date: "2026-10-21" }), "2026-10-21");
  assert.equal(editedTransactionDate(notification,'2026-10-21'),notification.transaction_date);
  assert.equal(editedTransactionDate(notification,'2026-10-20'),'2026-10-20T21:00:25.909-03:00');
  assert.equal(editedTransactionDate({...csv,transaction_date:'2026-10-21 15:27:00.123'},'2026-10-20'),'2026-10-20 15:27:00.123');
});

// O grafo de stores importa o router, que exige window/history; o teste so precisa da fila.
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
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });

// Compile the shared SSR dependency graph before timing individual finance workflows.
// A cold Windows module load must not consume a transaction test's timeout.
before(async () => {
  installMemoryStorage();
  setActivePinia(createPinia());
  const server = await createViteServer();
  let db;
  try {
    ({ db } = await server.ssrLoadModule('/src/db.js'));
    await server.ssrLoadModule('/src/components/finance/KademNexo.vue');
  } finally {
    db?.close();
    await server.close();
  }
});

test("tabela desktop e celular mostram hora real de Genos, inclusive meia-noite, e origem correta", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    const { default: Table } = await server.ssrLoadModule("/src/components/finance/nexo/NexoTransactionsTable.vue");
    const transactions = [
      { id: 1, provider: "GENOS_NOTIFICATION", source: "IMPORT", transaction_date: "2026-10-22T00:00:25Z", description: "Pix recebido", amount: 0.1, type: "INCOME" },
      { id: 2, provider: "GENOS_NOTIFICATION", source: "IMPORT", transaction_date: "2026-10-22T03:00:25Z", description: "PicPay: UNKNOWN para Mercado", observation: "PicPay · UNKNOWN · Mercado", amount: 20, type: "EXPENSE" },
      { id: 3, provider: "CSV", source: "IMPORT", transaction_date: "2026-10-21 15:27:00", description: "CSV preservado", amount: 5, type: "EXPENSE" },
    ];
    const app = createSSRApp(Table, { transactions, categories: [], categorizingIds: [],
      formatSignedMoney: ({ amount }) => String(amount), formatShortDate: (value) => `${String(value).slice(8, 10)}/${String(value).slice(5, 7)}`,
    });
    app.component("font-awesome-icon", { render: () => null });
    const html = await renderToString(app);
    assert.equal((html.match(/>21:00</g) || []).length, 2);
    assert.equal((html.match(/>00:00</g) || []).length, 2);
    assert.equal((html.match(/>15:27</g) || []).length, 2);
    assert.equal((html.match(/>\s*Genos\s*</g) || []).length, 4);
    assert.equal((html.match(/>\s*CSV\s*</g) || []).length, 2);
    assert.ok(html.includes("21/10")); assert.ok(html.includes("Não informado")); assert.ok(!html.includes("UNKNOWN"));
  } finally { await server.close(); }
});

test("Visão restaura Recentes e filtra todos os movimentos da categoria selecionada", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    const { default: Overview } = await server.ssrLoadModule('/src/components/finance/nexo/NexoOverviewTab.vue');
    const categories = [{ id: 1, macro_category: 'Crédito' }, { id: 2, macro_category: 'Moradia' }];
    const transactions = [
      { id: 1, category_id: 1, type: 'EXPENSE', payment_method: 'PIX', description: 'Fatura' },
      { id: 2, category_id: 1, type: 'EXPENSE', payment_method: 'CREDIT_CARD', description: 'Compra' },
      { id: 3, category_id: 1, type: 'EXPENSE', is_ignored: true },
      { id: 4, category_id: 2, type: 'EXPENSE', payment_method: 'PIX' },
    ];
    const context = { selectedCategory: 'Crédito', categories, transactions, recentTransactions: [] };
    assert.deepEqual(Overview.computed.filteredRecentTransactions.call(context).map((item) => item.id), [1]);
    assert.equal(Overview.computed.isCreditCategory.call(context), true);
    context.isCreditCategory = true;
    assert.deepEqual(Overview.computed.creditTransactions.call(context).map((item) => item.id), [2]);
    context.selectedCategory = null;
    assert.equal(Overview.computed.filteredRecentTransactions.call(context), context.recentTransactions);
    const app = createSSRApp(Overview, { totals: {}, categories, transactions, recentTransactions: transactions,
      macroDistribution: [], creditSummary: {}, formatMoney: String, formatSignedMoney: () => '', formatShortDate: () => '' });
    app.component('font-awesome-icon', { render: () => null });
    const html = await renderToString(app);
    assert.match(html, /Recentes/);
    assert.doesNotMatch(html, /Crédito por categoria/);
  } finally { await server.close(); }
});

test("pagamento vinculado mostra somente as compras do respectivo cartão", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    const { default: Recent } = await server.ssrLoadModule('/src/components/finance/nexo/NexoRecentTransactions.vue');
    const creditCards = [{ id: 10, name: 'Cartão A', brand: 'Visa', last_four: '1234' }, { id: 20, name: 'Cartão B', brand: 'Master', last_four: '5678' }];
    const creditTransactions = [
      { id: 1, credit_card_id: 10, amount: 0.1, description: 'Compra A' },
      { id: 2, credit_card_id: 10, amount: 0.2, description: 'Compra B' },
      { id: 3, credit_card_id: 20, amount: 8, description: 'Compra C' },
      { id: 4, credit_card_id: null, amount: 1, description: 'Sem cartão' },
    ];
    const purchasesByCard = Recent.computed.purchasesByCard.call({ creditTransactions });
    const context = { purchasesByCard, purchasesForPayment: Recent.methods.purchasesForPayment };
    assert.equal(Recent.methods.purchasesTotal.call(context, { payment_card_id: 10 }), 0.3);
    assert.deepEqual(Recent.methods.purchasesForPayment.call(context, { payment_card_id: 10 }).map((item) => item.id), [1, 2]);
    assert.equal(purchasesByCard.has('none'), false);
    const app = createSSRApp(Recent, { creditCards, creditTransactions, showCreditDetails: true, selectedCategory: 'Crédito',
      recentTransactions: [{ id: 5, description: 'Pagamento da fatura', type: 'EXPENSE', payment_card_id: 10 }], categories: [],
      formatMoney: String, formatSignedMoney: () => '', formatShortDate: () => '' });
    app.component('font-awesome-icon', { render: () => null });
    const html = await renderToString(app);
    for (const text of ['Pagamento da fatura', 'Cartão A', 'Cartão B', 'Compra A', 'Compra B', 'não representam necessariamente a fatura paga']) assert.ok(html.includes(text), text);
    assert.ok(!html.includes('Compra C'));
    assert.ok(!html.includes('Sem cartão'));
  } finally { await server.close(); }
});

test("Genos simplifica o título e omite apenas a observação automática repetida", () => {
  const transaction = { provider: "GENOS_NOTIFICATION", type: "EXPENSE", payment_method: "CREDIT_CARD",
    description: "PicPay: Crédito para Max Cambe", observation: "PicPay · Crédito · Max Cambe" };
  assert.equal(transactionDescription(transaction), "PicPay: Compra em Max Cambe");
  assert.equal(transactionObservation(transaction), "");
  assert.equal(transactionObservation({ ...transaction, observation: "Compra do mês, dividir com Ana" }), "Compra do mês, dividir com Ana");
  assert.equal(transactionDescription({ ...transaction, description: "Título que personalizei" }), "Título que personalizei");
  assert.equal(transactionDescription({ ...transaction, type: "INCOME", payment_method: "PIX", description: "PicPay: Pix recebido de Ana" }), "PicPay: Recebimento de Ana");
  assert.equal(transactionDescription({ ...transaction, payment_method: "PIX", description: "PicPay: Pix para Ana" }), "PicPay: Pagamento para Ana");
  assert.equal(transactionDescription({ ...transaction, description: "PicPay: Crédito para Contraparte não informada" }), "PicPay: Compra");
  assert.equal(transactionDescription({ ...transaction, provider: "CSV" }), transaction.description);
  assert.equal(transactionObservation({ ...transaction, provider: "CSV" }), transaction.observation);
  assert.equal(transaction.description, "PicPay: Crédito para Max Cambe");
  assert.equal(transaction.observation, "PicPay · Crédito · Max Cambe");
});

test("desktop, celular e Recentes mostram compra Genos com pílulas e sem metadados repetidos", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    const { default: Table } = await server.ssrLoadModule("/src/components/finance/nexo/NexoTransactionsTable.vue");
    const { default: Recent } = await server.ssrLoadModule("/src/components/finance/nexo/NexoRecentTransactions.vue");
    const transaction = { id: 233, provider: "GENOS_NOTIFICATION", type: "EXPENSE", payment_method: "CREDIT_CARD", credit_card_id: 1,
      transaction_date: "2026-10-26T17:03:06Z", amount: 30.94, description: "PicPay: Crédito para Max Cambe", observation: "PicPay · Crédito · Max Cambe" };
    const creditCards = [{ id: 1, name: "Cartão principal", brand: "Mastercard", last_four: "9027" }];
    const common = { creditCards, categories: [], formatSignedMoney: ({ amount }) => String(amount), formatShortDate: () => "26/10" };
    for (const [Component, props, count] of [[Table, { transactions: [transaction], categorizingIds: [] }, 2], [Recent, { recentTransactions: [transaction] }, 1]]) {
      const app = createSSRApp(Component, { ...common, ...props });
      app.component("font-awesome-icon", { render: () => null });
      const html = await renderToString(app);
      assert.equal((html.match(/PicPay: Compra em Max Cambe/g) || []).length, count);
      assert.equal((html.match(/payment-method-pill/g) || []).length, count);
      assert.equal((html.match(/payment-card-pill/g) || []).length, count);
      assert.ok(html.includes("Cartão principal · Mastercard •• 9027"));
      assert.ok(!html.includes("PicPay · Crédito · Max Cambe"));
      assert.ok(!html.includes('class="transaction-observation"'));
    }
  } finally { await server.close(); }
});

test("CSV atualiza os créditos só quando consulta a IA, inclusive se a análise falhar", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    installMemoryStorage();
    setActivePinia(createPinia());
    const { default: Nexo } = await server.ssrLoadModule("/src/components/finance/KademNexo.vue");
    const { financeService } = await server.ssrLoadModule("/src/services/financeService.js");
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { useAiCreditsStore } = await server.ssrLoadModule("/src/stores/aiCredits.js");
    const { api } = await server.ssrLoadModule("/src/plugins/api.js");
    useAuthStore().user = { id: 1, plan_tier: "pro" };
    const credits = useAiCreditsStore();
    const schema = { dateColumn: "Quando", descriptionColumn: "Detalhe", amountColumn: "Quantia" };

    for (const source of ["ai", "known", "cached", "failed"]) {
      localStorage.clear();
      credits.setUsage({ remaining_credits: 300, total_credits: 300, used_credits: 0 });
      let analyses = 0;
      let usageReads = 0;
      financeService.analyzeCsvSchema = async () => {
        analyses += 1;
        if (source === "failed") throw new Error("Falha no provedor");
        return { data: schema };
      };
      api.get = async (url) => {
        assert.equal(url, "/finance/ai/usage");
        usageReads += 1;
        return { data: { remaining_credits: 298, total_credits: 300, used_credits: 2 } };
      };
      if (source === "cached") {
        localStorage.setItem("kadem:nexo:csv-schema:quando|detalhe|quantia", JSON.stringify(schema));
      }
      let parsed = false;
      const context = {
        ...Nexo.methods,
        isPaidPlan: true,
        canUseAi: true,
        usage: credits.usage,
        resolveKnownCsvSchema: () => (source === "known" ? schema : null),
        parseCsvWithSchemaEnhanced: async (rows, detected) => {
          assert.deepEqual(detected, schema);
          assert.equal(rows.length, 2);
          parsed = true;
        },
      };
      await context.handleCsvFileChange({
        target: { files: [{ name: "extrato.csv", text: async () => "Quando;Detalhe;Quantia\n2026-10-01;Mercado;-20" }] },
      });
      const calledAi = source === "ai" || source === "failed";
      assert.equal(analyses, calledAi ? 1 : 0, source);
      assert.equal(usageReads, calledAi ? 1 : 0, source);
      assert.equal(context.usage.used_credits, calledAi ? 2 : 0, source);
      assert.equal(credits.remainingCredits, calledAi ? 298 : 300, source);
      assert.equal(context.loadingSchema, false, source);
      assert.equal(parsed, source !== "failed", source);
      if (source === "failed") assert.equal(context.csvImportError, "Falha no provedor");
    }

    // O CSV conhecido usa o histórico para categorizar, preserva hora/sinal e não cobra na reimportação.
    let localTransactions = [{ id: 7, description: "Mercado", category_id: 3, is_ignored: false }];
    financeService.analyzeCsvSchema = async () => assert.fail("o CSV conhecido não deve consultar IA");
    api.get = async () => assert.fail("o processamento local não deve atualizar consumo de IA");
    const context = {
      ...Nexo.methods,
      isPaidPlan: true,
      categories: [{ id: 3, name: "Alimentação", type: "EXPENSE" }],
      loadLocalTransactionsForMemory: async () => localTransactions,
    };
    const event = { target: { files: [{
      name: "extrato-conhecido.csv",
      text: async () => "Data;Hora;Tipo;Origem/Destino;Valor\n01/10/2026;12:30;Compra;Mercado;−20,00",
    }] } };
    await context.handleCsvFileChange(event);
    assert.equal(context.csvImportError, "");
    assert.equal(context.csvImportRows.length, 1);
    assert.equal(context.csvImportRows[0].category_id, "3");
    assert.equal(context.csvImportRows[0].type, "EXPENSE");
    assert.equal(context.csvImportRows[0].transaction_date, "2026-10-01 12:30:00");
    localTransactions = [...localTransactions, { ...context.csvImportRows[0], id: 8 }];
    await context.handleCsvFileChange(event);
    assert.equal(context.csvImportRows.length, 0);
    assert.equal(context.csvPreviewRows[0].csv_status, "duplicate_exact");
  } finally {
    await server.close();
  }
});

test("aviso do CSV compara apenas linhas novas com o mês e ano do filtro", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    installMemoryStorage();
    setActivePinia(createPinia());
    const { default: Nexo } = await server.ssrLoadModule("/src/components/finance/KademNexo.vue");
    const { default: Notice } = await server.ssrLoadModule("/src/components/finance/nexo/NexoCsvMonthNotice.vue");
    const row = (month, status = "new") => ({ transaction_date: `${month}-10`, csv_status: status });
    const cases = [
      { rows: [row("2026-09")], outside: 1, button: true },
      { rows: [row("2026-10")], outside: 0, button: false },
      { rows: [row("2025-10")], outside: 1, button: true },
      { rows: [row("2026-09"), row("2026-10")], outside: 1, button: false },
      { rows: [row("2026-08"), row("2026-09")], outside: 2, button: true },
      { rows: [row("2026-09", "duplicate_exact")], outside: 0, button: false },
      { rows: [row("2026-10"), row("2026-09", "duplicate_file")], outside: 0, button: false },
    ];
    for (const scenario of cases) {
      const summary = Nexo.computed.csvImportSummary.call({
        csvPreviewRows: scenario.rows,
        selectedMonth: "2026-10",
        monthLabelFromKey: Nexo.methods.monthLabelFromKey,
      });
      assert.equal(summary.outsideSelectedMonth, scenario.outside);
      const html = await renderToString(createSSRApp(Notice, { summary }));
      assert.equal(html.includes('role="status"'), scenario.outside > 0);
      assert.equal(html.includes("Importar e ver"), scenario.button);
      if (scenario.outside > 0) assert.match(html, /outubro de 2026/);
      if (summary.importMonths.length === 1 && scenario.outside > 0) {
        assert.ok(html.includes(summary.importMonths[0].label));
      }
    }
  } finally {
    await server.close();
  }
});

test("importar e ver muda o filtro após salvar; importar normalmente ou falhar mantém o mês", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  try {
    installMemoryStorage();
    setActivePinia(createPinia());
    const { default: Nexo } = await server.ssrLoadModule("/src/components/finance/KademNexo.vue");
    const { financeService } = await server.ssrLoadModule("/src/services/financeService.js");
    for (const mode of ["show", "normal", "failed"]) {
      let refreshedMonth = null;
      const context = {
        selectedMonth: "2026-10",
        importingCsv: false,
        csvImportRows: [{ description: "Mercado", amount: 20, type: "EXPENSE", transaction_date: "2026-09-10" }],
        resetCsvImport() { this.csvImportRows = []; },
        async refreshTransactionDrivenViews() { refreshedMonth = this.selectedMonth; },
      };
      financeService.createTransactionsBatch = async (rows) => {
        assert.equal(context.selectedMonth, "2026-10", "o filtro deve mudar só depois de salvar");
        assert.equal(rows[0].transaction_date, "2026-09-10");
        if (mode === "failed") throw new Error("Não foi possível salvar");
      };
      await Nexo.methods.confirmCsvImport.call(context, mode === "normal" ? null : "2026-09");
      assert.equal(context.selectedMonth, mode === "show" ? "2026-09" : "2026-10");
      assert.equal(refreshedMonth, mode === "failed" ? null : context.selectedMonth);
      assert.equal(context.importingCsv, false);
      if (mode === "failed") assert.equal(context.csvImportRows.length, 1);
    }
  } finally {
    await server.close();
  }
});

test("pulls concorrentes do Nexo preservam a meta local pendente", async () => {
  const server = await createViteServer();
  let db;
  try {
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { financeRepository } = await server.ssrLoadModule("/src/services/localData/financeRepository.js");

    await financeRepository.clearLocalFinance();
    await financeRepository.createLocalInvestmentGoal({ name: "Meta local", horizon: "SHORT", target_amount: 100 });

    // reloadAll, troca de aba e refresh pos-mutacao disparam getInvestments em paralelo.
    const serverGoals = [{ id: 7, name: "Meta do servidor", horizon: "LONG", target_amount: 500, is_archived: 0 }];
    await Promise.all(Array.from({ length: 8 }, () => financeRepository.setInvestmentGoals(serverGoals)));

    const goals = await financeRepository.getInvestmentGoals();
    assert.deepEqual(goals.map((goal) => goal.name).sort(), ["Meta do servidor", "Meta local"]);
  } finally {
    db?.close();
    await server.close();
  }
});

test("tarefa enfileirada durante uma execucao da fila e processada, nao fica parada", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    installMemoryStorage();
    setActivePinia(createPinia());
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { api } = await server.ssrLoadModule("/src/plugins/api.js");
    const { useUtilsStore } = await server.ssrLoadModule("/src/stores/utils.js");
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { financeService } = await server.ssrLoadModule("/src/services/financeService.js");
    const { financeRepository } = await server.ssrLoadModule("/src/services/localData/financeRepository.js");
    const { syncQueueRepository } = await server.ssrLoadModule("/src/services/localData/syncQueueRepository.js");

    const utils = useUtilsStore();
    utils.is_network_online = true;
    utils.is_kadem_api_available = true;
    useAuthStore().user = { id: 1 };

    await financeRepository.clearLocalFinance();
    await syncQueueRepository.clearSyncQueue();

    const posts = [];
    api.post = async (url, body) => {
      posts.push({ url, body });
      return { data: { id: 100 + posts.length, ...body, is_archived: 0 } };
    };

    // A execucao da fila termina puxando o delta do Health. Seguramos essa chamada para
    // enfileirar a segunda meta depois da ultima leitura da fila, mas antes do fim da execucao.
    let releaseHealth;
    const healthGate = new Promise((resolve) => (releaseHealth = resolve));
    let healthEntered;
    const healthEnteredSignal = new Promise((resolve) => (healthEntered = resolve));
    api.get = async (url) => {
      if (url !== "/health/sync") throw new Error(`GET inesperado: ${url}`);
      healthEntered();
      await healthGate;
      return { data: { changes: [], next_cursor: 0, has_more: false } };
    };

    const first = financeService.createInvestmentGoal({ name: "Meta A", horizon: "SHORT", target_amount: 100 });
    await healthEnteredSignal;
    await financeService.createInvestmentGoal({ name: "Meta B", horizon: "LONG", target_amount: 200 });
    releaseHealth();
    await first;

    assert.deepEqual(posts.map((post) => post.body.name).sort(), ["Meta A", "Meta B"]);
    assert.equal((await syncQueueRepository.getPendingTasks()).length, 0);
    const goals = await financeRepository.getInvestmentGoals();
    assert.ok(goals.every((goal) => Number.isFinite(Number(goal.id))), "as duas metas devem ter id do servidor");
  } finally {
    db?.close();
    await server.close();
  }
});

const loadOfflineFinance = async (server) => {
  installMemoryStorage();
  setActivePinia(createPinia());
  const modules = {
    db: (await server.ssrLoadModule("/src/db.js")).db,
    api: (await server.ssrLoadModule("/src/plugins/api.js")).api,
    useUtilsStore: (await server.ssrLoadModule("/src/stores/utils.js")).useUtilsStore,
    useAuthStore: (await server.ssrLoadModule("/src/stores/auth.js")).useAuthStore,
    financeService: (await server.ssrLoadModule("/src/services/financeService.js")).financeService,
    financeRepository: (await server.ssrLoadModule("/src/services/localData/financeRepository.js")).financeRepository,
    syncQueueRepository: (await server.ssrLoadModule("/src/services/localData/syncQueueRepository.js")).syncQueueRepository,
    syncService: (await server.ssrLoadModule("/src/services/syncService.js")).syncService,
  };
  modules.useAuthStore().user = { id: 1 };
  await modules.financeRepository.clearLocalFinance();
  await modules.syncQueueRepository.clearSyncQueue();

  const posts = [];
  modules.api.post = async (url, body) => {
    posts.push({ url, body });
    return { data: { id: 100 * posts.length, ...body, is_archived: 0 } };
  };
  modules.api.get = async () => ({ data: { changes: [], next_cursor: 0, has_more: false } });
  modules.posts = posts;
  modules.setOnline = (online) => {
    const utils = modules.useUtilsStore();
    utils.is_network_online = online;
    utils.is_kadem_api_available = online;
  };
  modules.addCategory = (category) =>
    modules.db.finance_categories.add({ local_key: `category-${category.id}`, pending_sync: false, ...category });
  return modules;
};

test('mover movimentos é atômico offline e sincroniza todas em uma única requisição', { timeout: 60000 }, async () => {
  const server = await createViteServer(); let db;
  try {
    const m = await loadOfflineFinance(server); db = m.db; m.setOnline(false);
    const originals = [501, 502, 503].map((id) => ({ id, description: `Movimento ${id}`, amount: id, type: 'EXPENSE', transaction_date: '2026-10-30T12:00:00Z' }));
    await m.financeRepository.setTransactions(originals, { month: '2026-10' });
    const rows = await m.financeRepository.getTransactions({ month: '2026-10' });
    await assert.rejects(() => m.financeRepository.moveTransactionsToMonth([rows[0].local_id, 999999], '2026-11', 1));
    assert.equal((await m.financeRepository.getTransactions({ month: '2026-10' })).length, 3);
    assert.equal((await m.syncQueueRepository.getPendingTasks()).length, 0);
    const selected = rows.filter((row) => row.id !== 503);
    await m.financeService.moveTransactions(selected, '2026-11');
    assert.deepEqual((await m.financeRepository.getTransactions({ month: '2026-10' })).map((row) => row.id), [503]);
    assert.equal((await m.financeRepository.getTransactions({ month: '2026-11' })).length, 2);
    await m.financeRepository.setTransactions(originals, { month: '2026-10' });
    assert.equal((await m.financeRepository.getTransactions({ month: '2026-11' })).length, 2);
    const tasks = await m.syncQueueRepository.getPendingTasks();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].type, 'MOVE_FINANCE_TRANSACTIONS');
    const puts = [];
    m.api.put = async (url, body) => { puts.push({ url, body }); return { data: { updated: body.transaction_ids.length, reference_month: body.reference_month } }; };
    m.setOnline(true); await m.syncService.processSyncQueue();
    assert.equal(puts.length, 1);
    assert.equal(puts[0].url, '/finance/transactions/reference-month');
    assert.deepEqual(puts[0].body.transaction_ids.slice().sort(), [501, 502]);
    assert.equal(puts[0].body.reference_month, '2026-11');
    const moved = await m.financeRepository.getTransactions({ month: '2026-11' });
    assert.ok(moved.every((row) => row.transaction_date === '2026-10-30T12:00:00Z' && !row.pending_sync));
  } finally { db?.close(); await server.close(); }
});

test('a tela remove toda a seleção de uma vez sem aguardar a rede', { timeout: 60000 }, async () => {
  const server = await createViteServer();
  try {
    const { default: Nexo } = await server.ssrLoadModule('/src/components/finance/KademNexo.vue');
    const { financeService } = await server.ssrLoadModule('/src/services/financeService.js');
    const previous = financeService.moveTransactions;
    let finish; const synced = new Promise((resolve) => { finish = resolve; });
    const selected = [{ id: 1, local_id: 11 }, { id: 2, local_id: 12 }];
    const context = { selectedMonth: '2026-10', movingTransactions: false, paymentOriginError: '',
      transactions: [...selected, { id: 3, local_id: 13 }], recentTransactions: [...selected], categories: [],
      transactionKey: Nexo.methods.transactionKey, refreshTransactionDrivenViews: async () => {} };
    try {
      financeService.moveTransactions = async (items, month) => { assert.equal(items.length, 2); assert.equal(month, '2026-11'); return { data: selected, synced }; };
      const moving = Nexo.methods.moveTransactions.call(context, { transactions: selected, month: '2026-11' });
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(context.transactions.map((item) => item.id), [3]);
      assert.deepEqual(context.recentTransactions, []);
      assert.equal(context.movingTransactions, true);
      finish(); await moving;
      assert.equal(context.movingTransactions, false);
    } finally { financeService.moveTransactions = previous; }
  } finally { await server.close(); }
});

test('edição mais recente não é sobrescrita pela confirmação de um lote em andamento', { timeout: 60000 }, async () => {
  const server = await createViteServer(); let db;
  try {
    const m = await loadOfflineFinance(server); db = m.db; m.setOnline(false);
    const original = { id: 501, description: 'Movimento', type: 'EXPENSE', amount: 20, transaction_date: '2026-10-30' };
    await m.financeRepository.setTransactions([original], { month: '2026-10' });
    await m.financeService.moveTransactions(await m.financeRepository.getTransactions({ month: '2026-10' }), '2026-11');
    let startBatch, finishBatch, startUpdate, finishUpdate;
    const batchStarted = new Promise((resolve) => { startBatch = resolve; });
    const batchWait = new Promise((resolve) => { finishBatch = resolve; });
    const updateStarted = new Promise((resolve) => { startUpdate = resolve; });
    const updateWait = new Promise((resolve) => { finishUpdate = resolve; });
    m.api.put = async (url, body) => {
      if (url.endsWith('/reference-month')) { startBatch(); await batchWait; return { data: { updated: 1, reference_month: '2026-11' } }; }
      startUpdate(); await updateWait; return { data: { ...original, ...body } };
    };
    m.setOnline(true); const syncing = m.syncService.processSyncQueue();
    await batchStarted;
    await m.financeService.updateTransaction(501, { reference_month: '2026-12' }, { waitForSync: false });
    finishBatch(); await updateStarted;
    const pending = await m.financeRepository.findTransaction(501);
    assert.equal(pending.reference_month, '2026-12');
    assert.equal(pending.pending_sync, true);
    finishUpdate(); await syncing;
    assert.equal((await m.financeRepository.findTransaction(501)).reference_month, '2026-12');
  } finally { db?.close(); await server.close(); }
});

test('lote aguarda criação offline e preserva transferência posterior antes da confirmação', { timeout: 60000 }, async () => {
  const server = await createViteServer(); let db;
  try {
    const m = await loadOfflineFinance(server); db = m.db; m.setOnline(false);
    await m.financeService.createTransaction({ description: 'Novo', type: 'INCOME', amount: 50, transaction_date: '2026-10-30' });
    const [created] = await m.financeRepository.getTransactions({ month: '2026-10' });
    await m.financeService.moveTransactions([created], '2026-11');
    let startBatch, finishBatch;
    const batchStarted = new Promise((resolve) => { startBatch = resolve; });
    const batchWait = new Promise((resolve) => { finishBatch = resolve; });
    const calls = [];
    m.api.put = async (url, body) => {
      calls.push({ url, body });
      if (calls.length === 1) { startBatch(); await batchWait; }
      return { data: { updated: body.transaction_ids.length, reference_month: body.reference_month } };
    };
    m.setOnline(true); const syncing = m.syncService.processSyncQueue();
    await batchStarted;
    let [moved] = await m.financeRepository.getTransactions({ month: '2026-11' });
    assert.equal(moved.id, 100);
    assert.equal(moved.pending_sync, true);
    await m.financeService.moveTransactions([moved], '2026-12');
    finishBatch(); await syncing;
    [moved] = await m.financeRepository.getTransactions({ month: '2026-12' });
    assert.equal(moved.id, 100);
    assert.equal(moved.pending_sync, false);
    assert.deepEqual(calls.map((call) => call.body.reference_month), ['2026-11', '2026-12']);
    assert.deepEqual(calls.map((call) => call.body.transaction_ids), [[100], [100]]);
  } finally { db?.close(); await server.close(); }
});

test('edição posterior aguarda lote anterior pendente do mesmo movimento', { timeout: 60000 }, async () => {
  const server = await createViteServer(); let db;
  try {
    const m = await loadOfflineFinance(server); db = m.db; m.setOnline(false);
    const original = { id: 501, description: 'Movimento', type: 'EXPENSE', amount: 20, transaction_date: '2026-10-30' };
    await m.financeRepository.setTransactions([original], { month: '2026-10' });
    await m.financeService.moveTransactions(await m.financeRepository.getTransactions({ month: '2026-10' }), '2026-11');
    await m.financeService.updateTransaction(501, { reference_month: '2026-12' }, { waitForSync: false });
    const tasks = await m.syncQueueRepository.getPendingTasks();
    const { createPersonalSyncExecutor } = await server.ssrLoadModule('/src/services/personalSyncExecutor.js');
    let calls = 0;
    const executor = createPersonalSyncExecutor({ api: { put: async (_url, body) => { calls++; return { data: { ...original, ...body } }; } }, getUserId: () => 1 });
    await assert.rejects(() => executor.finance(tasks[1]), /aguardando transferência anterior/);
    assert.equal(calls, 0);
    assert.equal((await m.financeRepository.findTransaction(501)).reference_month, '2026-12');
  } finally { db?.close(); await server.close(); }
});

test('falha de rede mantém o lote completo pendente para nova tentativa', { timeout: 60000 }, async () => {
  const server = await createViteServer(); let db;
  try {
    const m = await loadOfflineFinance(server); db = m.db; m.setOnline(false);
    const originals = [501, 502].map((id) => ({ id, description: `Movimento ${id}`, type: 'EXPENSE', amount: 20, transaction_date: '2026-10-30' }));
    await m.financeRepository.setTransactions(originals, { month: '2026-10' });
    await m.financeService.moveTransactions(await m.financeRepository.getTransactions({ month: '2026-10' }), '2026-11');
    m.api.put = async () => { const error = new Error('servidor indisponível'); error.response = { status: 404 }; throw error; };
    m.setOnline(true); await m.syncService.processSyncQueue();
    const queued = await db.syncQueue.toArray();
    assert.equal(queued.length, 1);
    assert.equal(queued[0].status, 'RETRY');
    assert.equal(queued[0].payload.items.length, 2);
    assert.ok((await m.financeRepository.getTransactions({ month: '2026-11' })).every((item) => item.pending_sync));
    await db.syncQueue.update(queued[0].id, { next_attempt_at: new Date(0).toISOString() });
    let calls = 0;
    m.api.put = async (_url, body) => { calls++; return { data: { updated: body.transaction_ids.length, reference_month: body.reference_month } }; };
    await m.syncService.processSyncQueue();
    assert.equal(calls, 1);
    assert.ok((await m.financeRepository.getTransactions({ month: '2026-11' })).every((item) => !item.pending_sync));
    assert.equal(await db.syncQueue.count(), 0);
  } finally { db?.close(); await server.close(); }
});

test('vínculo de pagamento a cartão criado offline sobrevive ao pull e sincroniza com ID remoto', { timeout: 60000 }, async () => {
  const server = await createViteServer(); let db;
  try {
    const m = await loadOfflineFinance(server); db = m.db; m.setOnline(false);
    const original = { id: 501, description: 'Fatura', amount: 50, type: 'EXPENSE', payment_method: 'PIX', transaction_date: '2026-10-30' };
    await m.financeRepository.setTransactions([original], { month: '2026-10' });
    const { data: card } = await m.financeService.saveCreditCard(null, { name: 'A', bank: 'Banco', brand: 'Visa', last_four: '1234', credit_limit: 100 });
    await m.financeService.updateTransaction(501, { payment_card_id: card.id });
    await m.financeRepository.setTransactions([original], { month: '2026-10' });
    assert.equal((await m.financeRepository.findTransaction(501)).payment_card_id, card.id);
    const puts = [];
    m.api.put = async (url, body) => { puts.push({ url, body }); return { data: { ...original, ...body } }; };
    m.setOnline(true); await m.syncService.processSyncQueue();
    assert.equal(puts.length, 1);
    assert.equal(puts[0].body.payment_card_id, 100);
    assert.equal((await m.financeRepository.findTransaction(501)).payment_card_id, 100);
    await m.financeService.updateTransaction(501, { payment_card_id: null });
    assert.equal(puts[1].body.payment_card_id, null);
  } finally { db?.close(); await server.close(); }
});

test("mês de referência preserva data, mudança offline e atualização após criação", { timeout: 60000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    m.setOnline(false);
    const date = "2026-10-30T12:15:00Z";
    assert.equal(transactionReferenceMonth({ provider: "GENOS_NOTIFICATION", transaction_date: "2026-11-01T02:15:00Z" }), "2026-10");
    const { data: created } = await m.financeService.createTransaction({ description: "Salário", type: "INCOME", amount: 100, transaction_date: date });
    await m.financeService.updateTransaction(created.id, { reference_month: "2026-11" });
    await m.financeRepository.setTransactions([], { month: "2026-10" });
    assert.equal((await m.financeRepository.getTransactions({ month: "2026-10" })).length, 0);
    let [moved] = await m.financeRepository.getTransactions({ month: "2026-11" });
    assert.equal(moved.transaction_date, date);
    assert.equal(moved.reference_month, "2026-11");
    const puts = [];
    m.api.put = async (url, body) => { puts.push({ url, body }); return { data: { id: 100, description: "Salário", type: "INCOME", amount: 100, transaction_date: date, ...body } }; };
    m.setOnline(true);
    await m.syncService.processSyncQueue();
    assert.equal(puts.length, 1);
    assert.equal(puts[0].body.reference_month, "2026-11");
    [moved] = await m.financeRepository.getTransactions({ month: "2026-11" });
    assert.equal(moved.transaction_date, date);
    assert.equal(moved.reference_month, "2026-11");
    assert.equal(moved.pending_sync, false);
    m.setOnline(false);
    const original = { id: 501, description: "Outro", type: "INCOME", amount: 50, transaction_date: "2026-10-30" };
    await m.financeRepository.setTransactions([original], { month: "2026-10" });
    await m.financeService.updateTransaction(501, { reference_month: "2026-11" });
    await m.financeRepository.setTransactions([original], { month: "2026-10" });
    assert.equal((await m.financeRepository.getTransactions({ month: "2026-10" })).length, 0);
    assert.equal((await m.financeRepository.getTransactions({ month: "2026-11" })).find((item) => item.id === 501).reference_month, "2026-11");
    assert.equal((await m.financeRepository.getPendingTransactions()).length, 1);
  } finally {
    db?.close();
    await server.close();
  }
});

test("aporte criado offline com meta nova: a meta sincroniza antes e o aporte leva o id do servidor", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    await m.addCategory({ id: 11, name: "Renda Fixa", type: "EXPENSE", investment_flow_type: "INVESTMENT_IN" });
    m.setOnline(false);

    const { data: goal } = await m.financeService.createInvestmentGoal({ name: "Reserva", horizon: "SHORT", target_amount: 500 });
    await m.financeService.createTransaction({
      description: "Aporte",
      amount: 100,
      type: "EXPENSE",
      category_id: 11,
      goal_id: goal.id,
      transaction_date: "2026-09-10",
    });
    assert.equal(m.posts.length, 0, "offline nada e enviado");

    m.setOnline(true);
    await m.syncService.processSyncQueue();

    assert.deepEqual(m.posts.map((post) => post.url), ["/finance/investments/goals", "/finance/transactions"]);
    const goalServerId = 100;
    assert.equal(m.posts[1].body.goal_id, goalServerId);
    assert.equal((await m.syncQueueRepository.getPendingTasks()).length, 0);
  } finally {
    db?.close();
    await server.close();
  }
});

test("meta removida antes do sync: o aporte segue sem meta em vez de ficar preso na fila", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    await m.addCategory({ id: 11, name: "Renda Fixa", type: "EXPENSE", investment_flow_type: "INVESTMENT_IN" });
    m.setOnline(false);

    const { data: goal } = await m.financeService.createInvestmentGoal({ name: "Reserva", horizon: "SHORT", target_amount: 500 });
    await m.financeService.createTransaction({
      description: "Aporte",
      amount: 100,
      type: "EXPENSE",
      category_id: 11,
      goal_id: goal.id,
      transaction_date: "2026-09-10",
    });
    await m.financeService.deleteInvestmentGoal(goal.id);

    m.setOnline(true);
    await m.syncService.processSyncQueue();

    assert.deepEqual(m.posts.map((post) => post.url), ["/finance/transactions"]);
    assert.equal("goal_id" in m.posts[0].body, false);
    assert.equal((await m.syncQueueRepository.getPendingTasks()).length, 0);
  } finally {
    db?.close();
    await server.close();
  }
});

test("categoria comum nao guarda meta localmente, nem ao trocar a categoria de um aporte", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    await m.addCategory({ id: 11, name: "Renda Fixa", type: "EXPENSE", investment_flow_type: "INVESTMENT_IN" });
    await m.addCategory({ id: 3, name: "Mercado", type: "EXPENSE", investment_flow_type: "STANDARD" });
    m.setOnline(false);

    const { data: common } = await m.financeService.createTransaction({
      description: "Feira", amount: 20, type: "EXPENSE", category_id: 3, goal_id: 7, transaction_date: "2026-09-10",
    });
    assert.equal(common.goal_id, null);

    const { data: contribution } = await m.financeService.createTransaction({
      description: "Aporte", amount: 100, type: "EXPENSE", category_id: 11, goal_id: 7, transaction_date: "2026-09-10",
    });
    assert.equal(contribution.goal_id, 7);

    await m.financeService.updateTransaction(contribution.id, { category_id: 3 });
    const [row] = (await m.financeRepository.getTransactions({ month: "2026-09" })).filter(
      (item) => item.description === "Aporte",
    );
    assert.equal(row.goal_id, null);
  } finally {
    db?.close();
    await server.close();
  }
});

test("waitForSync: false devolve o lancamento local antes de o servidor responder", { timeout: 30000 }, async () => {
  const server = await createViteServer();
  let db;
  try {
    const m = await loadOfflineFinance(server);
    db = m.db;
    m.setOnline(true);

    let releasePost;
    const postGate = new Promise((resolve) => (releasePost = resolve));
    const originalPost = m.api.post;
    m.api.post = async (url, body) => {
      await postGate;
      return originalPost(url, body);
    };

    const payload = { description: "Mercado", amount: 20, type: "EXPENSE", transaction_date: "2026-09-10" };
    const pending = m.financeService.createTransaction(payload, { waitForSync: false });
    const outcome = await Promise.race([pending, new Promise((resolve) => setTimeout(() => resolve("bloqueou"), 3000))]);

    assert.notEqual(outcome, "bloqueou", "a chamada nao pode esperar o servidor");
    assert.equal(outcome.data.description, "Mercado");
    assert.equal(m.posts.length, 0, "o servidor ainda nao respondeu");

    releasePost();
    await outcome.synced;
    assert.equal(m.posts.length, 1);
    assert.equal((await m.syncQueueRepository.getPendingTasks()).length, 0);
  } finally {
    db?.close();
    await server.close();
  }
});
