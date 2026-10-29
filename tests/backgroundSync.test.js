import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";

test("worker sync preserves pending data, retries safely and rejects another account", async () => {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  const originalFetch = globalThis.fetch;
  let db;
  try {
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { backgroundPull } = await server.ssrLoadModule("/src/services/backgroundSync.js");
    await db.open();
    await db.syncQueue.clear();
    await db.health_records.clear();
    await db.health_sync_state.clear();
    await db.background_settings.put({
      key: "current",
      user_id: 55,
      api: "https://api.example.test",
      generation: "test",
      background_sync: true,
    });
    let owner = 55,
      fail = false,
      posted = 0,
      invalidCursor = false;
    globalThis.fetch = async (url, options = {}) => {
      const u = new URL(url);
      if (u.pathname === "/notifications") return Response.json({ user_id: owner, notifications: [] });
      if (u.pathname === "/auth/csrf") return Response.json({ csrf_token: "csrf" });
      if (u.pathname === "/health/records") {
        if (fail) throw new Error("offline");
        const body = JSON.parse(options.body);
        assert.equal(options.headers["X-CSRF-Token"], "csrf");
        assert.equal(body.idempotency_key, "stable");
        posted++;
        return Response.json({ record: { ...body.data, id: 1, local_key: body.local_key } });
      }
      if (u.pathname === "/health/sync")
        return Response.json({
          changes: [{ operation: "UPSERT", local_key: "pending", record: { name: "Remote" } }],
          next_cursor: invalidCursor ? "inválido" : "1",
          has_more: false,
        });
      if (u.pathname === "/finance/investments") return Response.json({ goals: [], events: [] });
      return Response.json([]);
    };
    const local_id = await db.health_records.add({
      user_id: "55",
      local_key: "pending",
      record_type: "HEALTH_OBJECT",
      name: "Local",
      pending_sync: true,
    });
    await backgroundPull();
    assert.equal((await db.health_records.get(local_id)).name, "Local");
    await db.syncQueue.add({
      type: "UPSERT_HEALTH_RECORD",
      status: "PENDING",
      idempotency_key: "stable",
      timestamp: new Date().toISOString(),
      payload: {
        local_id,
        local_key: "pending",
        record_type: "HEALTH_OBJECT",
        updated_at: new Date().toISOString(),
        data: { name: "Local" },
      },
    });
    fail = true;
    await assert.rejects(backgroundPull());
    assert.equal(await db.syncQueue.count(), 1);
    fail = false;
    owner = 99;
    await backgroundPull();
    assert.equal(posted, 0);
    assert.equal(await db.syncQueue.count(), 1);
    owner = 55;
    await backgroundPull();
    assert.equal(posted, 1);
    assert.equal(await db.syncQueue.count(), 0);
    assert.equal((await db.health_records.get(local_id)).pending_sync, false);
    assert.equal((await db.health_sync_state.get("55")).cursor, 1);
    invalidCursor = true;
    await db.background_settings.update("current", { last_sync: 0 });
    await assert.rejects(backgroundPull(), /Cursor inválido/);
    assert.equal((await db.health_sync_state.get("55")).cursor, 1);
  } finally {
    globalThis.fetch = originalFetch;
    db?.close();
    await server.close();
  }
});
