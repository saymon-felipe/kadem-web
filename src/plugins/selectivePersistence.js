import { watch } from "vue";

// Observa apenas os campos persistidos. Mutações transitórias (player, drag, etc.)
// não percorrem nem serializam a store inteira.
export function selectivePersistence({ store, options }) {
  const config = options.localPersist;
  if (!config) return;
  const storage = config.storage || (typeof window !== "undefined" ? window.localStorage : globalThis.localStorage);
  const key = store.$id;
  const separate = config.separate || [];
  const fields = config.pick.filter((field) => !separate.includes(field));
  const serialize = config.serializer?.serialize || JSON.stringify;
  const deserialize = config.serializer?.deserialize || JSON.parse;
  const safely = (callback) => {
    try { callback(); } catch (error) {
      console.warn(`[Persistência] Falha em ${key}:`, error);
    }
  };
  const hydrate = () => safely(() => {
    const saved = storage.getItem(key);
    const restored = saved ? deserialize(saved) : {};
    const patch = {};
    config.pick.forEach((field) => {
      if (Object.hasOwn(restored, field)) patch[field] = restored[field];
    });
    separate.forEach((field) => {
      const value = storage.getItem(`${key}:${field}`);
      if (value !== null) patch[field] = deserialize(value);
    });
    store.$patch(patch);
    config.afterHydrate?.({ store });
  });
  const persist = () => safely(() => {
    storage.setItem(key, serialize(Object.fromEntries(fields.map((field) => [field, store[field]]))));
  });
  hydrate();
  watch(fields.map((field) => () => store[field]), persist, { deep: true });
  separate.forEach((field) => {
    watch(() => store[field], (value) => safely(() => {
      storage.setItem(`${key}:${field}`, serialize(value));
    }));
  });
  store.$hydrate = hydrate;
  store.$persist = () => {
    persist();
    separate.forEach((field) => safely(() => {
      storage.setItem(`${key}:${field}`, serialize(store[field]));
    }));
  };
}
