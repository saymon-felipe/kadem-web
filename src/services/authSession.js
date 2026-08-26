export const SESSION_REFRESH_STORAGE_KEY = "kadem_session_last_refresh_at";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function markSessionRefreshed(now = Date.now()) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_REFRESH_STORAGE_KEY, String(now));
}

export function clearSessionRefresh() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_REFRESH_STORAGE_KEY);
}

export function getLastSessionRefresh() {
  if (!canUseLocalStorage()) {
    return null;
  }

  const timestamp = Number(window.localStorage.getItem(SESSION_REFRESH_STORAGE_KEY));
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function hasValidSessionRefresh(now = Date.now()) {
  const lastRefresh = getLastSessionRefresh();

  return lastRefresh !== null && now >= lastRefresh && now - lastRefresh < SESSION_MAX_AGE_MS;
}

export function restoreSessionRefreshFromTimestamp(timestamp, now = Date.now()) {
  if (hasValidSessionRefresh(now)) {
    return true;
  }

  const parsedTimestamp = Date.parse(timestamp || "");
  if (!Number.isFinite(parsedTimestamp) || parsedTimestamp > now || now - parsedTimestamp >= SESSION_MAX_AGE_MS) {
    return false;
  }

  markSessionRefreshed(parsedTimestamp);
  return true;
}

export function getSessionRefreshRemainingMs(now = Date.now()) {
  const lastRefresh = getLastSessionRefresh();

  if (lastRefresh === null) {
    return 0;
  }

  return Math.max(0, SESSION_MAX_AGE_MS - (now - lastRefresh));
}
