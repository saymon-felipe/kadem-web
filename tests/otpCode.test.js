import { test } from "node:test";
import assert from "node:assert/strict";
import {
  digitsOnly,
  formatRecoveryCode,
  normalizeRecoveryCode,
  OTP_LENGTH,
  RECOVERY_CODE_LENGTH,
} from "../src/utils/otp_code.js";

test("digitsOnly descarta tudo que não é dígito", () => {
  assert.equal(digitsOnly("12[3]4a5 6"), "123456");
  assert.equal(digitsOnly("[[["), "");
  assert.equal(digitsOnly(""), "");
});

test("digitsOnly aceita o código colado com separadores e texto em volta", () => {
  assert.equal(digitsOnly("123 456"), "123456");
  assert.equal(digitsOnly("123-456"), "123456");
  assert.equal(digitsOnly("Seu código é 123456."), "123456");
});

test("digitsOnly limita ao tamanho do código", () => {
  assert.equal(OTP_LENGTH, 6);
  assert.equal(digitsOnly("12345678"), "123456");
  assert.equal(digitsOnly("12345678", 4), "1234");
});

test("digitsOnly tolera valores vazios", () => {
  assert.equal(digitsOnly(null), "");
  assert.equal(digitsOnly(undefined), "");
  assert.equal(digitsOnly(123456), "123456");
});

test("normalizeRecoveryCode deixa só letras e números em maiúsculas", () => {
  assert.equal(normalizeRecoveryCode("abcde-fghjk"), "ABCDEFGHJK");
  assert.equal(normalizeRecoveryCode(" ab[c]d "), "ABCD");
  assert.equal(normalizeRecoveryCode("ABCDEFGHJKMNP").length, RECOVERY_CODE_LENGTH);
});

test("formatRecoveryCode insere o hífen só depois do 5º caractere", () => {
  assert.equal(formatRecoveryCode("abc"), "ABC");
  assert.equal(formatRecoveryCode("abcde"), "ABCDE");
  assert.equal(formatRecoveryCode("abcdef"), "ABCDE-F");
  assert.equal(formatRecoveryCode("abcdefghjk"), "ABCDE-FGHJK");
});

test("formatRecoveryCode é idempotente e aceita o código já formatado", () => {
  assert.equal(formatRecoveryCode("ABCDE-FGHJK"), "ABCDE-FGHJK");
  assert.equal(formatRecoveryCode(formatRecoveryCode("abcdefghjk")), "ABCDE-FGHJK");
});

test("apagar o hífen não deixa um hífen solto", () => {
  // "ABCDE-F" -> backspace -> "ABCDE-" -> reformatado
  assert.equal(formatRecoveryCode("ABCDE-"), "ABCDE");
});
