import Dexie from "dexie";

export const LOCAL_DB_ISSUE_KEY = "kadem_local_db_issue";
export const LOCAL_DB_ISSUE_EVENT = "kadem:local-db-issue";

const LOCAL_DB_ERROR_NAMES = new Set([
  "DatabaseClosedError",
  "UnknownError",
  "InvalidStateError",
  "VersionError",
  "AbortError",
  "QuotaExceededError",
]);

const PERSISTED_MEDIA_STORES = new Set(["global_audio_cache", "lyrics"]);

const SCHEMA_V5 = {
  tasks: "++id, title, tempId",
  syncQueue: "++id, type, timestamp",
  users: "&id",
  user_occupations: "++localId, &id, user_id",
  medals: "&id",
  projects: "++localId, &id, name",
  accounts: "++localId, &id, data",
  kanban_columns: "++local_id, id, project_id",
  kanban_tasks: "++local_id, id, column_id, project_id",
  playlists: "++local_id, &id, name, created_at",
  tracks: "++local_id, &id, title, youtube_id, playlist_local_id",
  global_audio_cache: "&youtube_id, created_at",
};

const SCHEMA_V7 = {
  ...SCHEMA_V5,
  kanban_task_attachments: "++local_id, id, task_local_id, task_id, project_id",
  lyrics: "video_id",
};

const SCHEMA_V9 = {
  ...SCHEMA_V7,
  finance_categories: "++local_id, id, name, type, macro_category",
  finance_macro_categories: "++local_id, id, name",
  finance_transactions: "++local_id, id, transaction_date, type, category_id",
  finance_budget_groups: "++local_id, id, month, macro_category_id",
  finance_budgets: "++local_id, id, month, category_id, group_local_id",
  finance_connections: "++local_id, id, item_id, provider",
};

const SCHEMA_V10 = {
  ...SCHEMA_V9,
  syncQueue: "++id, type, timestamp, status, next_attempt_at, idempotency_key, compact_key",
};

const SCHEMA_V14 = {
  ...SCHEMA_V10,
  finance_categories:
    "++local_id, local_key, id, name, type, macro_category, investment_flow_type, linked_investment_category_id",
  finance_macro_categories: "++local_id, local_key, id, name, is_investment",
  finance_transactions: "++local_id, local_key, id, transaction_date, type, category_id",
  finance_investment_goals: "++local_id, local_key, id, horizon, is_archived",
  finance_investment_events: "++local_id, local_key, id, event_date, event_type, category_id",
};

export const db = new Dexie("KademDB");

db.version(5).stores(SCHEMA_V5);
db.version(7).stores(SCHEMA_V7);
db.version(9).stores(SCHEMA_V9);
db.version(10).stores(SCHEMA_V10);
db.version(14).stores(SCHEMA_V14);
db.version(15)
  .stores(SCHEMA_V14)
  .upgrade(async (transaction) => {
    await clearVolatileStores(transaction, SCHEMA_V14);
  });

let dbOpenPromise = null;

function clearVolatileStores(transaction, schema) {
  const volatileStoreNames = Object.keys(schema).filter(
    (storeName) => !PERSISTED_MEDIA_STORES.has(storeName),
  );

  return Promise.all(
    volatileStoreNames.map(async (storeName) => {
      try {
        await transaction.table(storeName).clear();
      } catch (error) {
        console.warn(`[DB] Falha ao limpar store ${storeName} durante migração.`, error);
      }
    }),
  );
}

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function getErrorNameChain(error) {
  const names = [];
  let current = error;

  while (current) {
    if (current.name) {
      names.push(current.name);
    }
    current = current.inner || current.cause;
  }

  return names;
}

function createIssuePayload(message, details = {}) {
  return {
    code: "LOCAL_DB_UNAVAILABLE",
    title: "Armazenamento local indisponível",
    message,
    created_at: new Date().toISOString(),
    ...details,
  };
}

function emitLocalDbIssue(issue) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(LOCAL_DB_ISSUE_EVENT, {
      detail: issue,
    }),
  );
}

export function rememberLocalDbIssue(message, details = {}) {
  const issue = createIssuePayload(message, details);

  if (canUseBrowserStorage()) {
    window.sessionStorage.setItem(LOCAL_DB_ISSUE_KEY, JSON.stringify(issue));
  }

  emitLocalDbIssue(issue);
  return issue;
}

export function clearLocalDbIssue() {
  if (canUseBrowserStorage()) {
    window.sessionStorage.removeItem(LOCAL_DB_ISSUE_KEY);
  }

  emitLocalDbIssue(null);
}

export function consumeLocalDbIssue() {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const rawIssue = window.sessionStorage.getItem(LOCAL_DB_ISSUE_KEY);
  if (!rawIssue) {
    return null;
  }

  try {
    return JSON.parse(rawIssue);
  } catch (error) {
    console.warn("[DB] Não foi possível ler o aviso salvo do banco local.", error);
    window.sessionStorage.removeItem(LOCAL_DB_ISSUE_KEY);
    return null;
  }
}

export function onLocalDbIssue(handler) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event) => {
    handler(event.detail || null);
  };

  window.addEventListener(LOCAL_DB_ISSUE_EVENT, listener);

  return () => {
    window.removeEventListener(LOCAL_DB_ISSUE_EVENT, listener);
  };
}

export function isLocalDbUnavailableError(error) {
  if (!error) {
    return false;
  }

  if (error.name === "LocalDbUnavailableError") {
    return true;
  }

  return getErrorNameChain(error).some((name) => LOCAL_DB_ERROR_NAMES.has(name));
}

export function createLocalDbUnavailableError(message, error) {
  const localDbError = new Error(message);
  localDbError.name = "LocalDbUnavailableError";
  localDbError.cause = error;
  localDbError.originalError = error;
  return localDbError;
}

export function normalizeLocalDbError(
  error,
  fallbackMessage = "Não foi possível acessar o armazenamento local deste navegador.",
) {
  if (error?.name === "LocalDbUnavailableError") {
    rememberLocalDbIssue(error.message, {
      original_name: error.originalError?.name || error.cause?.name || error.name,
      original_message: error.originalError?.message || error.cause?.message || error.message,
    });
    return error;
  }

  if (!isLocalDbUnavailableError(error)) {
    return error;
  }

  const issue = rememberLocalDbIssue(fallbackMessage, {
    original_name: error?.name || "UnknownError",
    original_message: error?.message || "Erro interno do IndexedDB.",
    inner_name: error?.inner?.name || null,
    inner_message: error?.inner?.message || null,
  });

  return createLocalDbUnavailableError(issue.message, error);
}

export async function ensureDbOpen() {
  if (db.isOpen()) {
    return db;
  }

  if (!dbOpenPromise) {
    dbOpenPromise = db
      .open()
      .catch((error) => {
        db.close();
        throw normalizeLocalDbError(
          error,
          "Não foi possível abrir o armazenamento local deste navegador. Recarregue a página ou use a opção de reparo.",
        );
      })
      .finally(() => {
        dbOpenPromise = null;
      });
  }

  await dbOpenPromise;

  if (consumeLocalDbIssue()) {
    clearLocalDbIssue();
  }

  return db;
}

export async function initializeLocalDb() {
  return ensureDbOpen();
}

export async function runDbOperation(operation, options = {}) {
  const {
    userMessage = "Não foi possível acessar o armazenamento local deste navegador.",
  } = options;

  try {
    await ensureDbOpen();
    return await operation();
  } catch (error) {
    throw normalizeLocalDbError(error, userMessage);
  }
}

export async function repairLocalEnvironment({ reload = true } = {}) {
  dbOpenPromise = null;

  try {
    db.close();
  } catch (error) {
    console.warn("[DB] Falha ao encerrar a conexão Dexie antes do reparo.", error);
  }

  if (typeof navigator !== "undefined" && navigator.serviceWorker?.getRegistrations) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn("[DB] Falha ao remover service workers durante o reparo.", error);
    }
  }

  if (typeof window !== "undefined" && window.caches?.keys) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
    } catch (error) {
      console.warn("[DB] Falha ao limpar Cache Storage durante o reparo.", error);
    }
  }

  clearLocalDbIssue();

  if (reload && typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("repair_ts", String(Date.now()));
    window.location.replace(url.toString());
  }
}

db.on("blocked", () => {
  dbOpenPromise = null;
  rememberLocalDbIssue(
    "O armazenamento local está bloqueado por uma versão antiga do app neste navegador. Feche outras abas do Kadem ou use a opção de reparo.",
    {
      type: "blocked",
    },
  );
});

db.on("versionchange", () => {
  dbOpenPromise = null;
  db.close();
  rememberLocalDbIssue(
    "O aplicativo detectou uma atualização do armazenamento local. Recarregue a página para concluir a migração com segurança.",
    {
      type: "versionchange",
    },
  );
});
