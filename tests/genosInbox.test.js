import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_GENOS_PORT, poll_inbox, remember_port, stored_key, stored_port } from "../src/services/genosInbox.js";
import { genos_failure_message, parse_genos_command } from "../src/utils/genos_command.js";

const KEY = "k7Qp2xVn9LmR4sTw";

const memory_storage = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("o comando da caixa de entrada tem os mesmos campos da URL e a porta é lida quando válida", () => {
  const command = parse_genos_command({ genos: "play", track: "Evidências", key: KEY, nonce: "n9", port: "38517" });
  assert.equal(command.port, 38517);
  assert.equal(parse_genos_command({ genos: "play", track: "x", key: KEY, port: "80" }).port, undefined);
  assert.equal(parse_genos_command({ genos: "play", track: "x", key: KEY }).port, undefined);
});

test("guarda a porta do Genos e cai na porta preferida quando não há nada guardado", () => {
  const storage = memory_storage();
  assert.equal(stored_port(storage), DEFAULT_GENOS_PORT);
  remember_port(40001, storage);
  assert.equal(stored_port(storage), 40001);
  remember_port(22, storage);
  assert.equal(stored_port(storage), 40001);
  assert.equal(stored_key(memory_storage({ kadem_genos_remote_key: KEY })), KEY);
  assert.equal(stored_key(memory_storage()), "");
});

test("busca o comando esperando, sem recarregar a página", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return reply(200, { command: { genos: "play", track: "Evidências", key: KEY, nonce: "n1" } });
  };
  const polled = await poll_inbox({ port: 38517, key: KEY }, { fetchImpl });
  assert.equal(polled.state, "command");
  assert.equal(parse_genos_command(polled.command).name, "Evidências");
  assert.equal(calls[0].url, "http://127.0.0.1:38517/kadem/v1/inbox");
  assert.deepEqual(calls[0].body, { key: KEY });
});

test("distingue caixa vazia, chave recusada e Genos fora do ar", async () => {
  assert.equal((await poll_inbox({ port: 38517, key: KEY }, { fetchImpl: async () => reply(200, { command: null }) })).state, "empty");
  assert.equal((await poll_inbox({ port: 38517, key: KEY }, { fetchImpl: async () => reply(403, {}) })).state, "rejected");
  assert.equal((await poll_inbox({ port: 38517, key: KEY }, { fetchImpl: async () => { throw new TypeError("fail"); } })).state, "unreachable");
  assert.equal((await poll_inbox({ port: 80, key: KEY }, { fetchImpl: async () => reply(200, {}) })).state, "unreachable");
  assert.equal((await poll_inbox({ port: 38517, key: "" }, { fetchImpl: async () => reply(200, {}) })).state, "unreachable");
});

test("o aviso de toque manda tocar em qualquer parte da tela", () => {
  assert.match(genos_failure_message("needs_tap", "Evidências"), /qualquer parte da tela/);
});
