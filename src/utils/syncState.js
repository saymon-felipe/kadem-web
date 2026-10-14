let sessionGeneration = 0;

export function invalidateSyncSession() { sessionGeneration++; }

export function captureSyncSession() {
  const generation = sessionGeneration;
  return () => generation === sessionGeneration;
}

export function assertSyncSession(isCurrent) {
  if (!isCurrent()) throw new Error('Sincronização invalidada pela troca de sessão.');
}

export function normalizeSyncTimestamp(value) {
  return typeof value === 'string' && value.trim() && !Number.isNaN(Date.parse(value)) ? value : null;
}

export function readSyncTimestamp(key) {
  try { return normalizeSyncTimestamp(localStorage.getItem(key)); } catch { return null; }
}

export function writeSyncTimestamp(key, value) {
  const timestamp = normalizeSyncTimestamp(value);
  if (timestamp) {
    try { localStorage.setItem(key, timestamp); } catch { /* O dado de negócio já foi aplicado. */ }
  }
  return timestamp;
}

export function normalizeSyncCursor(value) {
  const cursor = Number(value);
  return Number.isSafeInteger(cursor) && cursor >= 0 ? cursor : 0;
}

export function requireSyncArray(value) {
  if (!Array.isArray(value) || value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('Resposta de sincronização inválida.');
  }
  return value;
}
