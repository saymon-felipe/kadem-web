// A page kept open across deployments may request chunks removed by the new build.
// Reload once per entrypoint, preserving offline data and avoiding reload loops.
export function installAssetRecovery(win = window, doc = document, nav = navigator) {
  let recovering = false;
  const recover = () => {
    if (recovering || nav.onLine === false) return false;
    const entry = doc.querySelector('script[type="module"][src]')?.src || win.location.pathname;
    const key = `kadem-asset-recovery:${entry}`;
    try {
      if (Date.now() - Number(win.sessionStorage.getItem(key) || 0) < 60000) return false;
      win.sessionStorage.setItem(key, String(Date.now()));
    } catch { /* A blocked sessionStorage must not prevent recovery. */ }
    recovering = true;
    // update() is best effort; the reload must not depend on a stalled registration.
    nav.serviceWorker?.getRegistration().then((registration) => registration?.update()).catch(() => {});
    win.location.reload();
    return true;
  };
  win.addEventListener("vite:preloadError", (event) => {
    if (recover()) event.preventDefault();
  });
  win.addEventListener("error", (event) => {
    if (["SCRIPT", "LINK"].includes(event.target?.tagName)) recover();
  }, true);
  return recover;
}
