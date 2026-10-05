import test from "node:test";
import assert from "node:assert/strict";
import {
  hexToHsl,
  hslToHex,
  normalizeHex,
  isToneOf,
  clampToMacroTone,
  generateCategoryTones,
} from "../src/utils/colorTones.js";

test("hexToHsl e hslToHex convertem cores corretamente", () => {
  const blueHex = "#2563eb";
  const hsl = hexToHsl(blueHex);
  assert.ok(hsl.h >= 210 && hsl.h <= 230, `Matiz de azul esperada em torno de 221, obteve ${hsl.h}`);
  assert.ok(hsl.s > 70, "Saturação de azul esperada alta");
  
  const backToHex = hslToHex(hsl.h, hsl.s, hsl.l);
  assert.ok(isToneOf(backToHex, blueHex), `Cor reconstruída ${backToHex} deve ser o mesmo tom de ${blueHex}`);
});

test("isToneOf identifica tons da mesma matiz", () => {
  const blueMacro = "#2563eb"; // H ~ 221
  const blueLight = "#93c5fd"; // H ~ 217
  const blueDark = "#1e3a8a"; // H ~ 224
  const redColor = "#ef4444"; // H ~ 0
  const greenColor = "#10b981"; // H ~ 160

  assert.equal(isToneOf(blueLight, blueMacro), true, "Azul claro deve ser tom de azul");
  assert.equal(isToneOf(blueDark, blueMacro), true, "Azul escuro deve ser tom de azul");
  assert.equal(isToneOf(redColor, blueMacro), false, "Vermelho NÃO deve ser tom de azul");
  assert.equal(isToneOf(greenColor, blueMacro), false, "Verde NÃO deve ser tom de azul");
});

test("clampToMacroTone restringe qualquer cor ao matiz da macro", () => {
  const blueMacro = "#2563eb"; // H ~ 221
  const macroHsl = hexToHsl(blueMacro);

  // Uma cor que já é tom de azul é preservada
  const blueTone = "#60a5fa";
  assert.equal(clampToMacroTone(blueTone, blueMacro), blueTone);

  // Uma cor fora de tom (ex: vermelho) é convertida para o matiz da macro azul
  const redColor = "#ef4444";
  const clamped = clampToMacroTone(redColor, blueMacro);
  const clampedHsl = hexToHsl(clamped);

  assert.equal(clampedHsl.h, macroHsl.h, "Cor clampada deve ter o mesmo matiz da macro azul");
  assert.equal(isToneOf(clamped, blueMacro), true, "Cor clampada deve ser um tom válido da macro");
});

test("generateCategoryTones gera lista de tons harmoniosos no mesmo matiz", () => {
  const blueMacro = "#2563eb";
  const tones = generateCategoryTones(blueMacro);

  assert.ok(tones.length >= 5, "Deve gerar uma lista variada de tons");
  
  tones.forEach((tone) => {
    assert.ok(tone.hex.startsWith("#"), `Hex deve ser válido: ${tone.hex}`);
    assert.equal(isToneOf(tone.hex, blueMacro), true, `Tom ${tone.label} (${tone.hex}) deve pertencer à macro azul`);
  });

  // O tom padrão deve ser a própria cor da macro
  const baseTone = tones.find((t) => t.id === "base");
  assert.ok(baseTone, "Deve incluir o tom base");
  assert.equal(baseTone.hex.toLowerCase(), blueMacro.toLowerCase());
});

test("Macro monocromática / cinza gera tons de cinza válidos", () => {
  const grayMacro = "#64748b";
  const tones = generateCategoryTones(grayMacro);

  assert.ok(tones.length >= 5);
  tones.forEach((tone) => {
    assert.equal(isToneOf(tone.hex, grayMacro), true);
  });
});
