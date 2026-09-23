import { test } from "node:test";
import assert from "node:assert/strict";
import { comparePattern, findPatterns, trackerSummary } from "../src/services/healthInsights.js";

const reference = new Date();
const checkins = Array.from({ length: 8 }, (_, index) => ({
  occurred_at: new Date(reference.getTime() - (7 - index) * 24 * 60 * 60 * 1000).toISOString(),
  values: {
    food: index < 4 ? ["carne"] : ["arroz"],
    output: index < 3 ? "Líquida" : "Formada",
    pain: index < 4 ? 7 : 2,
  },
}));

test("compares exposed and unexposed check-ins without inferring causality", () => {
  const result = comparePattern(checkins, {
    predictor_key: "food", exposure: "carne", outcome_key: "output", outcome_value: "Líquida", period_days: 30, window_hours: 0,
  });
  assert.equal(result.exposed_count, 4);
  assert.equal(result.exposed_matches, 3);
  assert.equal(result.unexposed_count, 4);
  assert.equal(result.unexposed_matches, 0);
  assert.equal(result.enough_data, true);
});

test("supports numeric thresholds and tracker projections", () => {
  const result = comparePattern(checkins, {
    predictor_key: "food", exposure: "carne", outcome_key: "pain", outcome_value: ">=6", period_days: 30, window_hours: 0,
  });
  assert.equal(result.exposed_matches, 4);
  assert.equal(result.unexposed_matches, 0);
  const summary = trackerSummary(checkins, { local_key: "pain" }, 30);
  assert.equal(summary.count, 8);
  assert.equal(summary.average, 4.5);
});

test("finds an observed pattern from configurable tracker definitions", () => {
  const patterns = findPatterns(checkins, [
    { local_key: "food", name: "Alimentação", value_type: "TAGS" },
    { local_key: "output", name: "Consistência", value_type: "SINGLE" },
  ], 30);
  assert.ok(patterns.some((pattern) => pattern.exposure === "carne" && pattern.outcome_value === "Líquida"));
});

test("does not classify missing food entries as days without the food", () => {
  const result = comparePattern([
    ...checkins,
    { occurred_at: new Date(reference.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), values: { output: "Líquida" } },
  ], {
    predictor_key: "food", exposure: "carne", outcome_key: "output", outcome_value: "Líquida", period_days: 30, window_hours: 0,
  });
  assert.equal(result.unexposed_count, 4);
});
