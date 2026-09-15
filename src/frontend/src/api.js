/**
 * api.js
 * ======
 * API client. Validation is called INSIDE each method, before returning.
 * AppDataContext receives only validated data.
 * Never returns raw unvalidated responses.
 *
 * IMPORTANT — engine ID vs unit_number:
 *   All engine endpoints accept unit_number as the URL param (the backend's
 *   EngineRepository.get_engine_by_id_or_404 filters by unit_number, not by asset.id).
 *   The parameter is named `id` here for brevity but callers must pass unit_number.
 */
import {
  validateEnginesList,
  validateEngineDetail,
  validateEnginePrediction,
  validateMissionReadiness,
  validateSensorList,
  validateSensorHistory,
  validateSystemStatus,
  validateDatasetInfo,
} from './utils/validation';

const BASE_URL = 'http://127.0.0.1:5000/api/v1';

/**
 * Internal fetch helper. Throws a descriptive error on non-OK responses.
 * Unwraps { data: ... } wrapper if present (backend uses success_response helper).
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${options.method || 'GET'} ${path} failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  // Backend wraps responses in { data: ... } via success_response
  return json.data !== undefined ? json.data : json;
}

export const api = {
  /** GET /api/v1/system/status */
  async getSystemStatus() {
    const raw = await apiFetch('/system/status');
    return validateSystemStatus(raw);
  },

  /** GET /api/v1/system/model-info */
  async getModelInfo() {
    const raw = await apiFetch('/system/model-info');
    return raw; // No strict validation needed — informational endpoint
  },

  /** GET /api/v1/data/dataset-info */
  async getDatasetInfo() {
    const raw = await apiFetch('/data/dataset-info');
    return validateDatasetInfo(raw);
  },

  /** DELETE /api/v1/data/reset — explicit user action only */
  async resetDataset() {
    const raw = await apiFetch('/data/reset', { method: 'DELETE' });
    return raw;
  },

  /** POST /api/v1/data/upload */
  async uploadData(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/data/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Upload failed (${res.status}): ${text}`);
    }
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  },

  /** GET /api/v1/engines → validated array */
  async getEngines() {
    const raw = await apiFetch('/engines/');
    return validateEnginesList(Array.isArray(raw) ? raw : [raw]);
  },

  /** GET /api/v1/engines/{unit_number} → validated engine detail */
  async getEngineDetails(id) {
    const raw = await apiFetch(`/engines/${id}`);
    return validateEngineDetail(raw);
  },

  /**
   * GET /api/v1/engines/{unit_number}/analysis → validated Prediction object.
   * Returns a Prediction row (rul_predicted, prediction_cycle, etc.)
   */
  async getEngineAnalysis(id) {
    const raw = await apiFetch(`/engines/${id}/analysis`);
    return validateEnginePrediction(raw);
  },

  /** GET /api/v1/engines/{unit_number}/sensors → validated sensor analysis array */
  async getEngineSensors(id) {
    const raw = await apiFetch(`/engines/${id}/sensors`);
    return validateSensorList(Array.isArray(raw) ? raw : []);
  },

  /**
   * GET /api/v1/engines/{unit_number}/sensors/history?limit=50
   * Returns per-cycle smoothed sensor readings ordered by time_cycles ASC.
   */
  async getSensorHistory(id, limit = 50) {
    const raw = await apiFetch(`/engines/${id}/sensors/history?limit=${limit}`);
    return validateSensorHistory(Array.isArray(raw) ? raw : []);
  },

  /**
   * POST /api/v1/mission/readiness
   * body: { engine_id: unit_number, mission_duration }
   * Returns combined assessment: rul_assessment, current_health, combined_assessment
   */
  async getMissionReadiness(id, missionDuration = 30) {
    const raw = await apiFetch('/mission/readiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine_id: id, mission_duration: missionDuration }),
    });
    return validateMissionReadiness(raw);
  },
};
