import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { setActivePinia, createPinia } from "pinia";

const mockLocation = {
  pathname: "/",
  search: "",
  hash: "",
  origin: "http://localhost:3000",
  host: "localhost:3000",
  hostname: "localhost",
  port: "3000",
  protocol: "http:",
  href: "http://localhost:3000/",
};

const storage = new Map();
const mockLocalStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

globalThis.localStorage = mockLocalStorage;
globalThis.location = mockLocation;
globalThis.history = { state: null, pushState() {}, replaceState() {} };
globalThis.window = {
  localStorage: mockLocalStorage,
  location: mockLocation,
  history: globalThis.history,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
};
globalThis.document = {
  querySelector() { return null; },
  createElement() { return {}; },
  documentElement: { style: {} },
  addEventListener() {},
  removeEventListener() {},
};

test("tracker groups CRUD and automatic tracker reassignment", async () => {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [vue()],
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  let db;
  try {
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { useAuthStore } = await server.ssrLoadModule("/src/stores/auth.js");
    const { useHealthStore, DEFAULT_TRACKER_GROUPS } = await server.ssrLoadModule("/src/stores/health.js");

    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.user = { id: 101, name: "Test User" };

    assert.ok(DEFAULT_TRACKER_GROUPS.some((g) => g.name === "Bem-estar"));
    assert.ok(DEFAULT_TRACKER_GROUPS.some((g) => g.name === "Sintomas"));
    assert.ok(DEFAULT_TRACKER_GROUPS.some((g) => g.name === "Hábitos"));

    const healthStore = useHealthStore();
    await healthStore.loadRecords();

    // Default groups should be available in trackerGroups
    assert.ok(healthStore.trackerGroups.length >= 5);
    assert.ok(healthStore.trackerGroups.some((g) => g.name === "Bem-estar"));

    // Create a custom group
    const customGroup = await healthStore.createTrackerGroup({
      name: "Medicações",
      description: "Controle de remédios e suplementos",
      color: "#3b82f6",
      icon: "pills",
    });
    assert.equal(customGroup.name, "Medicações");
    assert.ok(healthStore.trackerGroups.some((g) => g.name === "Medicações"));

    // Create a tracker in this custom group
    const tracker = await healthStore.createTracker({
      name: "Paracetamol",
      group: "Medicações",
      value_type: "BOOLEAN",
    });
    assert.equal(tracker.group, "Medicações");
    assert.equal(healthStore.trackers.find((t) => t.local_key === tracker.local_key).group, "Medicações");

    // Update group name and verify tracker group is automatically renamed
    await healthStore.updateTrackerGroup(customGroup, {
      name: "Farmácia & Tratamento",
      description: "Remédios em geral",
      color: "#6366f1",
      icon: "pills",
    });

    const updatedTracker = healthStore.trackers.find((t) => t.local_key === tracker.local_key);
    assert.equal(updatedTracker.group, "Farmácia & Tratamento");

    // Delete the group and verify tracker is reassigned to fallback group
    const groupToDelete = healthStore.trackerGroups.find((g) => g.name === "Farmácia & Tratamento");
    await healthStore.deleteTrackerGroup(groupToDelete, "Bem-estar");

    assert.ok(!healthStore.trackerGroups.some((g) => g.name === "Farmácia & Tratamento"));
    const reassignedTracker = healthStore.trackers.find((t) => t.local_key === tracker.local_key);
    assert.equal(reassignedTracker.group, "Bem-estar");
  } finally {
    db?.close();
    await server.close();
  }
});
