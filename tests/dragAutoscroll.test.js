import { test } from "node:test";
import assert from "node:assert/strict";
import { get_autoscroll_velocity, DEFAULT_AUTOSCROLL } from "../src/utils/drag_autoscroll.js";

// Container de 600px de altura: zona ativa = min(0.35 * 600, 200) = 200px.
const rect = { top: 100, bottom: 700, left: 800, right: 1100, height: 600 };
const x = 900;

test("não rola no meio do container", () => {
  assert.equal(get_autoscroll_velocity({ x, y: 400 }, rect), 0);
  assert.equal(get_autoscroll_velocity({ x, y: 300 }, rect), 0); // limite interno da zona de cima
  assert.equal(get_autoscroll_velocity({ x, y: 500 }, rect), 0); // limite interno da zona de baixo
});

test("rola para cima na zona superior e para baixo na inferior", () => {
  assert.ok(get_autoscroll_velocity({ x, y: 250 }, rect) < 0);
  assert.ok(get_autoscroll_velocity({ x, y: 550 }, rect) > 0);
});

test("a zona é bem maior que os 30px do Sortable", () => {
  assert.ok(get_autoscroll_velocity({ x, y: 100 + 150 }, rect) < 0);
  assert.ok(get_autoscroll_velocity({ x, y: 700 - 150 }, rect) > 0);
});

test("velocidade cresce conforme o ponteiro se afasta do centro", () => {
  const speeds = [290, 250, 200, 150, 100].map((y) => Math.abs(get_autoscroll_velocity({ x, y }, rect)));

  for (let i = 1; i < speeds.length; i++) {
    assert.ok(speeds[i] > speeds[i - 1], `esperava ${speeds[i]} > ${speeds[i - 1]}`);
  }
});

test("continua acelerando além da borda e satura na velocidade máxima", () => {
  const at_edge = Math.abs(get_autoscroll_velocity({ x, y: 100 }, rect));
  const beyond = Math.abs(get_autoscroll_velocity({ x, y: 40 }, rect));
  const far_beyond = Math.abs(get_autoscroll_velocity({ x, y: -500 }, rect));

  assert.ok(beyond > at_edge);
  assert.equal(far_beyond, DEFAULT_AUTOSCROLL.max_speed);
  assert.equal(Math.abs(get_autoscroll_velocity({ x, y: 5000 }, rect)), DEFAULT_AUTOSCROLL.max_speed);
});

test("ao entrar na zona já anda (velocidade mínima), sem travar", () => {
  const v = Math.abs(get_autoscroll_velocity({ x, y: 299 }, rect));
  assert.ok(v >= DEFAULT_AUTOSCROLL.min_speed);
  assert.ok(v < DEFAULT_AUTOSCROLL.min_speed * 1.5);
});

test("ignora ponteiro fora das laterais do container", () => {
  assert.equal(get_autoscroll_velocity({ x: 100, y: 120 }, rect), 0);
  assert.equal(get_autoscroll_velocity({ x: 2000, y: 680 }, rect), 0);
  // dentro da tolerância lateral ainda conta
  assert.ok(get_autoscroll_velocity({ x: rect.left - 10, y: 120 }, rect) < 0);
});

test("container baixo: zonas não se sobrepõem", () => {
  const short = { top: 0, bottom: 120, left: 0, right: 200, height: 120 };

  assert.ok(get_autoscroll_velocity({ x: 50, y: 10 }, short) < 0);
  assert.ok(get_autoscroll_velocity({ x: 50, y: 110 }, short) > 0);
  assert.equal(get_autoscroll_velocity({ x: 50, y: 60 }, short), 0);
});

test("entradas inválidas retornam 0", () => {
  assert.equal(get_autoscroll_velocity(null, rect), 0);
  assert.equal(get_autoscroll_velocity({ x, y: 120 }, null), 0);
  assert.equal(get_autoscroll_velocity({ x, y: 120 }, { ...rect, height: 0 }), 0);
});
