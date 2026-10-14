export const isStateMap = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const position = (value, x = 50, y = 100) => ({ x: finite(value?.x, x), y: finite(value?.y, y) });
const size = (value, width = 900, height = 600) => ({ width: Math.max(400, finite(value?.width, width)), height: Math.max(300, finite(value?.height, height)) });

export function normalizeWindowStates(value) {
  if (!isStateMap(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([userId, state]) => {
    const saved = isStateMap(state) ? state : {};
    const windows = isStateMap(saved.openWindows) ? saved.openWindows : {};
    return [userId, {
      ...saved,
      windowPrefs: Object.fromEntries(Object.entries(isStateMap(saved.windowPrefs) ? saved.windowPrefs : {})
        .map(([id, prefs]) => [id, {
          pos: position(prefs?.pos, 100, 100), size: size(prefs?.size, 500, 400),
          isMaximized: prefs?.isMaximized === true,
        }])),
      openWindows: Object.fromEntries(Object.entries(windows)
        .filter(([, window]) => isStateMap(window) && typeof window.componentId === 'string')
        .map(([id, window]) => [id, {
          ...window, id,
          position: position(window.position),
          size: size(window.size),
          previousPosition: window.previousPosition ? position(window.previousPosition) : null,
          previousSize: window.previousSize ? size(window.previousSize) : null,
          zIndex: finite(window.zIndex, 1),
          isMinimized: window.isMinimized === true,
          isMaximized: window.isMaximized === true,
        }])),
    }];
  }));
}
