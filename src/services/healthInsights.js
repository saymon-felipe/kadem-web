const DAY_MS = 24 * 60 * 60 * 1000;

export function checkinsInPeriod(checkins, periodDays = 30, reference = new Date()) {
  const cutoff = reference.getTime() - periodDays * DAY_MS;
  return checkins
    .filter((event) => Number.isFinite(new Date(event.occurred_at).getTime()))
    .filter((event) => new Date(event.occurred_at).getTime() >= cutoff)
    .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
}

export function hasValue(value, expected) {
  if (Array.isArray(value)) return value.some((item) => String(item).toLocaleLowerCase("pt-BR") === String(expected).toLocaleLowerCase("pt-BR"));
  if (typeof value === "number" && /^[<>]=/.test(String(expected))) {
    const threshold = Number(String(expected).slice(2));
    if (!Number.isFinite(threshold)) return false;
    return String(expected).startsWith(">=") ? value >= threshold : value <= threshold;
  }
  return String(value).toLocaleLowerCase("pt-BR") === String(expected).toLocaleLowerCase("pt-BR");
}

export function trackerSeries(checkins, tracker, periodDays = 30) {
  return checkinsInPeriod(checkins, periodDays)
    .filter((event) => event.values?.[tracker.local_key] !== undefined)
    .map((event) => ({ date: event.occurred_at, value: event.values[tracker.local_key] }));
}

export function trackerSummary(checkins, tracker, periodDays = 30) {
  const series = trackerSeries(checkins, tracker, periodDays);
  const numeric = series.map((entry) => entry.value).filter((value) => typeof value === "number" && Number.isFinite(value));
  return {
    count: series.length,
    latest: series.at(-1)?.value ?? null,
    average: numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null,
    series,
  };
}

export function comparePattern(checkins, {
  predictor_key,
  exposure,
  outcome_key,
  outcome_value,
  period_days = 30,
  window_hours = 0,
}) {
  const rows = checkinsInPeriod(checkins, period_days);
  const observedRows = rows.filter((event) => {
    const value = event.values?.[predictor_key];
    return value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && !value.length);
  });
  const observedTimes = observedRows.map((event) => new Date(event.occurred_at).getTime()).sort((a, b) => a - b);
  const observedDays = new Set(observedTimes.map((time) => new Date(time).toDateString()));
  const exposureRows = observedRows.filter((event) => hasValue(event.values?.[predictor_key], exposure));
  const exposureTimes = exposureRows.map((event) => new Date(event.occurred_at).getTime()).sort((a, b) => a - b);
  const exposureDays = new Set(exposureTimes.map((time) => new Date(time).toDateString()));
  const targetRows = rows.filter((event) => {
    const value = event.values?.[outcome_key];
    return value !== null && value !== undefined && value !== "";
  });
  const result = { exposed_count: 0, exposed_matches: 0, unexposed_count: 0, unexposed_matches: 0 };

  for (const event of targetRows) {
    const occurred = new Date(event.occurred_at).getTime();
    let observed = observedDays.has(new Date(occurred).toDateString());
    let exposed = exposureDays.has(new Date(occurred).toDateString());
    if (window_hours > 0) {
      const withinWindow = (times) => {
        let low = 0;
        let high = times.length;
        while (low < high) {
          const middle = Math.floor((low + high) / 2);
          if (times[middle] <= occurred) low = middle + 1;
          else high = middle;
        }
        const source = times[low - 1];
        return source !== undefined && occurred - source <= window_hours * 60 * 60 * 1000;
      };
      observed = withinWindow(observedTimes);
      exposed = withinWindow(exposureTimes);
    }
    if (!observed) continue;
    const group = exposed ? "exposed" : "unexposed";
    result[`${group}_count`] += 1;
    if (hasValue(event.values[outcome_key], outcome_value)) result[`${group}_matches`] += 1;
  }

  const exposedRate = result.exposed_count ? result.exposed_matches / result.exposed_count : null;
  const unexposedRate = result.unexposed_count ? result.unexposed_matches / result.unexposed_count : null;
  return {
    ...result,
    exposed_rate: exposedRate,
    unexposed_rate: unexposedRate,
    difference: exposedRate === null || unexposedRate === null ? null : exposedRate - unexposedRate,
    enough_data: result.exposed_count >= 3 && result.unexposed_count >= 3,
  };
}

function observedOptions(checkins, tracker, periodDays) {
  if (tracker.value_type === "SCALE" || tracker.value_type === "NUMBER") {
    const middle = Math.ceil((Number(tracker.min_value || 0) + Number(tracker.max_value || 10)) / 2);
    return [`>=${middle}`];
  }
  const values = trackerSeries(checkins, tracker, periodDays).flatMap(({ value }) => Array.isArray(value) ? value : [value]);
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== "").map(String))].slice(0, 12);
}

export function findPatterns(checkins, trackers, periodDays = 30) {
  const candidates = [];
  const predictorTypes = new Set(["TAGS", "MULTI", "SINGLE", "BOOLEAN"]);
  const outcomeTypes = new Set(["SCALE", "NUMBER", "SINGLE", "MULTI", "BOOLEAN"]);
  const eligible = trackers
    .filter((item) => trackerSeries(checkins, item, periodDays).length >= 3)
    .slice(0, 8);
  for (const predictor of eligible.filter((item) => predictorTypes.has(item.value_type))) {
    for (const exposure of observedOptions(checkins, predictor, periodDays).slice(0, 4)) {
      for (const outcome of eligible.filter((item) => item.local_key !== predictor.local_key && outcomeTypes.has(item.value_type))) {
        for (const outcomeValue of observedOptions(checkins, outcome, periodDays).slice(0, 4)) {
          for (const windowHours of [0, 24, 48]) {
            const comparison = comparePattern(checkins, {
              predictor_key: predictor.local_key,
              exposure,
              outcome_key: outcome.local_key,
              outcome_value: outcomeValue,
              period_days: periodDays,
              window_hours: windowHours,
            });
            if (!comparison.enough_data || Math.abs(comparison.difference) < 0.15) continue;
            candidates.push({
              predictor_key: predictor.local_key,
              predictor: predictor.name,
              exposure,
              outcome_key: outcome.local_key,
              outcome: outcome.name,
              outcome_value: outcomeValue,
              period_days: periodDays,
              window_hours: windowHours,
              ...comparison,
            });
          }
        }
      }
    }
  }
  const distinct = new Map();
  for (const candidate of candidates.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))) {
    const key = [candidate.predictor_key, candidate.exposure, candidate.outcome_key, candidate.outcome_value].join("|");
    if (!distinct.has(key)) distinct.set(key, candidate);
  }
  return [...distinct.values()].slice(0, 6);
}
