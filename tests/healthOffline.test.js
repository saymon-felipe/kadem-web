import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import "fake-indexeddb/auto";
import { createServer } from "vite";

test("health journal stays local, queues writes and protects pending changes from delta", async () => {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  let db;
  try {
    ({ db } = await server.ssrLoadModule("/src/db.js"));
    const { healthRepository } = await server.ssrLoadModule("/src/services/localData/healthRepository.js");
    const { syncQueueRepository } = await server.ssrLoadModule("/src/services/localData/syncQueueRepository.js");
    const userId = "health-offline-test";
    const record = {
      user_id: userId,
      local_key: "checkin-offline-test",
      record_type: "HEALTH_EVENT",
      event_type: "DAILY_CHECKIN",
      occurred_at: "2026-09-23T09:00:00.000Z",
      values: { energy: 6 },
      pending_sync: true,
      deleted_at: null,
      updated_at: "2026-09-23T09:00:00.000Z",
    };

    await healthRepository.saveRecord(record);
    await syncQueueRepository.addSyncQueueTask({
      type: "UPSERT_HEALTH_RECORD",
      payload: { local_key: record.local_key, record_type: record.record_type, data: record },
    });
    assert.equal((await healthRepository.getRecords(userId))[0].values.energy, 6);
    assert.equal((await syncQueueRepository.getPendingTasksByType("UPSERT_HEALTH_RECORD")).length, 1);

    const serverRecord = { ...record, id: 42, values: { energy: 2 }, pending_sync: false };
    await healthRepository.applyServerChanges(userId, [
      { local_key: record.local_key, operation: "UPSERT", record: serverRecord },
    ], 10);
    assert.equal((await healthRepository.getRecords(userId))[0].values.energy, 6);
    assert.equal(await healthRepository.getSyncCursor(userId), 10);

    await healthRepository.markRecordSynced(record.local_key, { ...record, id: 42 });
    assert.equal((await healthRepository.getRecords(userId))[0].pending_sync, false);
    await healthRepository.applyServerChanges(userId, [
      { local_key: record.local_key, operation: "DELETE" },
    ], 11);
    assert.equal((await healthRepository.getRecords(userId)).length, 0);
    assert.equal(await healthRepository.getSyncCursor(userId), 11);
  } finally {
    db?.close();
    await server.close();
  }
});
