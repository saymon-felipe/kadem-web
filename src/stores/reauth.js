import { defineStore } from "pinia";

// Coordena o modal global de "confirme sua identidade". O interceptor da API chama `request()` quando o
// servidor responde REAUTH_REQUIRED e repete a requisição original assim que a promessa resolve.
export const useReauthStore = defineStore("reauth", {
  state: () => ({
    visible: false,
  }),
  actions: {
    request() {
      if (this._pending) return this._pending.promise;

      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });

      this._pending = { promise, resolve, reject };
      this.visible = true;
      return promise;
    },
    complete() {
      this._pending?.resolve();
      this._close();
    },
    cancel() {
      const cancelled = new Error("reauth_cancelled");
      cancelled.code = "REAUTH_CANCELLED";
      this._pending?.reject(cancelled);
      this._close();
    },
    _close() {
      this._pending = null;
      this.visible = false;
    },
  },
});
