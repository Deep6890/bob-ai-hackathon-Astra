/**
 * validation.js
 * =============
 * All API response validation lives HERE — at the fetch boundary.
 * AppDataContext receives ONLY validated data. Raw responses never enter React state.
 *
 * On failure: logs the error and throws — never returns fake fallback values.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) throw new Error(`[Validation] ${message}`);
}

function isNumber(v) { return typeof v === 'number' && isFinite(v); }
function isString(v) { return typeof v === 'string'; }
function isArray(v)  { return Array.isArray(v); }
function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// ─── Engines list ────────────────────────────────────────────────────────────

/**
 * Validates GET /api/v1/engines response.
 * Expected: array of engine objects, each with id + unit_number.
 */
export function validateEnginesList(raw) {
  assert(isArray(raw), `Engines list must be an array, got ${typeof raw}`);
  return raw.map((engine, i) => {
    assert(isObject(engine), `Engine at index ${i} must be an object`);
    assert(engine.id !== undefined, `Engine at index ${i} missing 'id'`);
    assert(engine.unit_number !== undefined, `Engine at index ${i} missing 'unit_number'`);
    return engine;
  });
}

// ─── Engine detail ───────────────────────────────────────────────────────────

/**
 * Validates GET /api/v1/engines/{id} response.
 */
export function validateEngineDetail(raw) {
  assert(isObject(raw), `Engine detail must be an object, got ${typeof raw}`);
  assert(raw.id !== undefined, `Engine detail missing 'id'`);
  assert(raw.unit_number !== undefined, `Engine detail missing 'unit_number'`);
  return raw;
}

// ─── Engine prediction (from /analysis) ─────────────────────────────────────

/**
 * Validates GET /api/v1/engines/{id}/analysis response.
 * Backend returns a Prediction.to_dict() object.
 * Required fields: rul_predicted, prediction_cycle
 */
export function validateEnginePrediction(raw) {
  assert(isObject(raw), `Engine prediction must be an object, got ${typeof raw}`);
  assert(isNumber(raw.rul_predicted), `'rul_predicted' must be a number, got ${raw.rul_predicted}`);
  assert(isNumber(raw.prediction_cycle), `'prediction_cycle' must be a number, got ${raw.prediction_cycle}`);
  // Optional but validated if present
  if (raw.rul_clipped !== undefined) {
    assert(isNumber(raw.rul_clipped), `'rul_clipped' must be a number if present`);
  }
  return raw;
}

// ─── Mission readiness ───────────────────────────────────────────────────────

/**
 * Validates POST /api/v1/mission/readiness response.
 * Expected shape:
 * {
 *   engine_id, latest_cycle,
 *   rul_assessment: { predicted_rul_cycles, margin_of_safety },
 *   current_health: { normal_sensors, degrading_sensors, abnormal_sensors, unknown_sensors, status },
 *   combined_assessment: { mission_readiness, maintenance_priority, recommendation }
 * }
 */
export function validateMissionReadiness(raw) {
  assert(isObject(raw), `Mission readiness must be an object, got ${typeof raw}`);

  // rul_assessment
  assert(isObject(raw.rul_assessment), `'rul_assessment' must be an object`);
  assert(
    isNumber(raw.rul_assessment.predicted_rul_cycles),
    `'rul_assessment.predicted_rul_cycles' must be a number`
  );
  assert(
    isNumber(raw.rul_assessment.margin_of_safety),
    `'rul_assessment.margin_of_safety' must be a number`
  );

  // current_health
  assert(isObject(raw.current_health), `'current_health' must be an object`);
  assert(isNumber(raw.current_health.normal_sensors),   `'current_health.normal_sensors' must be a number`);
  assert(isNumber(raw.current_health.degrading_sensors),`'current_health.degrading_sensors' must be a number`);
  assert(isNumber(raw.current_health.abnormal_sensors), `'current_health.abnormal_sensors' must be a number`);
  assert(isNumber(raw.current_health.unknown_sensors),  `'current_health.unknown_sensors' must be a number`);

  // combined_assessment
  assert(isObject(raw.combined_assessment), `'combined_assessment' must be an object`);
  assert(
    isString(raw.combined_assessment.mission_readiness),
    `'combined_assessment.mission_readiness' must be a string`
  );
  assert(
    isString(raw.combined_assessment.maintenance_priority),
    `'combined_assessment.maintenance_priority' must be a string`
  );

  return raw;
}

// ─── Sensor analysis list ────────────────────────────────────────────────────

/**
 * Validates GET /api/v1/engines/{id}/sensors response.
 * Expected: array of SensorAnalysis.to_dict() objects.
 * Each item: { sensor, state, anomaly_score?, persistence?, slope?, ... }
 */
export function validateSensorList(raw) {
  assert(isArray(raw), `Sensor list must be an array, got ${typeof raw}`);
  return raw.map((s, i) => {
    assert(isObject(s), `Sensor at index ${i} must be an object`);
    assert(isString(s.sensor), `Sensor at index ${i} missing 'sensor' (string name)`);
    assert(isString(s.state), `Sensor at index ${i} missing 'state'`);
    return s;
  });
}

// ─── Sensor history ──────────────────────────────────────────────────────────

/**
 * Validates GET /api/v1/engines/{id}/sensors/history response.
 * Expected: array of SensorReading.to_dict() objects with time_cycles.
 * Returns empty array if backend returns [].
 */
export function validateSensorHistory(raw) {
  assert(isArray(raw), `Sensor history must be an array, got ${typeof raw}`);
  return raw.map((r, i) => {
    assert(isObject(r), `Sensor reading at index ${i} must be an object`);
    assert(isNumber(r.time_cycles), `Sensor reading at index ${i} missing 'time_cycles'`);
    return r;
  });
}

// ─── System status ───────────────────────────────────────────────────────────

export function validateSystemStatus(raw) {
  assert(isObject(raw), `System status must be an object`);
  return raw;
}

// ─── Dataset info ─────────────────────────────────────────────────────────────

/**
 * Validates GET /api/v1/data/dataset-info response.
 */
export function validateDatasetInfo(raw) {
  assert(isObject(raw), `Dataset info must be an object, got ${typeof raw}`);
  assert(isNumber(raw.engine_count) || raw.engine_count === 0, `'engine_count' must be a number`);
  return raw;
}
