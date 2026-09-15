/**
 * AppDataContext.jsx
 * ==================
 * Single source of truth for all backend data.
 *
 * Data flow:
 *   api.js (validates at boundary) → fetchXxx() → React state → pages → components
 *
 * IMPORTANT — engine ID vs unit_number:
 *   All API calls use unit_number (which the backend routes treat as the URL param).
 *   All per-engine caches are keyed by unit_number (integer).
 *   unit_number is also used for display ("Unit 34").
 *   asset.id (the DB primary key) is only used internally by the backend.
 *
 * Rules:
 * - Only validated data enters state (api.js validates before returning)
 * - No business logic here — just fetching, caching, state management
 * - missionReadiness fetched per selected engine (not all engines upfront)
 * - Fleet-wide pages read from cached missionReadinessById
 * - MISSION_DURATION fixed at 30 cycles (matches backend pipeline config)
 * - resetDataset() only called after explicit user confirmation — never on load/refresh
 */
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

export const MISSION_DURATION = 30; // cycles — matches backend pipeline

export const AppDataContext = createContext();

export const AppDataProvider = ({ children }) => {
  // ── Engine list ─────────────────────────────────────────────────────────────
  const [engines, setEngines] = useState([]);
  const [enginesLoading, setEnginesLoading] = useState(true);
  const [enginesError, setEnginesError] = useState(null);

  // ── Active dataset metadata (from /api/v1/data/dataset-info) ────────────────
  const [activeDataset, setActiveDataset] = useState(null);   // { engine_count, latest_cycle, latest_upload, dataset_loaded }
  const [datasetLoading, setDatasetLoading] = useState(false);

  // ── Per-engine cached data (keyed by unit_number) ────────────────────────────
  const [engineDetailsById, setEngineDetailsById]         = useState({});
  const [enginePredictionById, setEnginePredictionById]   = useState({});  // from /analysis
  const [missionReadinessById, setMissionReadinessById]   = useState({});  // from POST /mission/readiness
  const [engineSensorsById, setEngineSensorsById]         = useState({});  // from /sensors
  const [sensorHistoryById, setSensorHistoryById]         = useState({});  // from /sensors/history

  // ── Per-engine loading/error states ─────────────────────────────────────────
  const [loadingById, setLoadingById]   = useState({});
  const [errorById, setErrorById]       = useState({});

  // ── Upload state ─────────────────────────────────────────────────────────────
  const [uploadState, setUploadState] = useState({
    status: 'idle', // 'idle' | 'uploading' | 'processing' | 'done' | 'error'
    message: '',
  });

  // ── In-flight request guards (prevent duplicate concurrent calls) ────────────
  const inFlight = useRef({});

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const setEngineLoading = (id, key, value) =>
    setLoadingById(prev => ({ ...prev, [`${id}_${key}`]: value }));

  const setEngineError = (id, key, err) =>
    setErrorById(prev => ({ ...prev, [`${id}_${key}`]: err?.message || String(err) }));

  const isLoading = (id, key) => !!loadingById[`${id}_${key}`];

  // ── Fetch active dataset info ────────────────────────────────────────────────

  const fetchDatasetInfo = useCallback(async () => {
    setDatasetLoading(true);
    try {
      const data = await api.getDatasetInfo();
      setActiveDataset(data);
    } catch (e) {
      console.error('[CONTEXT] fetchDatasetInfo failed:', e.message);
      // Non-fatal — dataset info is supplementary
      setActiveDataset(null);
    } finally {
      setDatasetLoading(false);
    }
  }, []);

  // ── Fetch engines ────────────────────────────────────────────────────────────

  const fetchEngines = useCallback(async () => {
    setEnginesLoading(true);
    setEnginesError(null);
    try {
      const data = await api.getEngines();
      setEngines(data);
    } catch (e) {
      console.error('[CONTEXT] fetchEngines failed:', e.message);
      setEnginesError(e.message);
    } finally {
      setEnginesLoading(false);
    }
  }, []);

  // ── Fetch engine prediction (from /analysis) ─────────────────────────────────

  const fetchEnginePrediction = useCallback(async (unitNumber) => {
    const key = `pred_${unitNumber}`;
    if (inFlight.current[key]) return;
    if (enginePredictionById[unitNumber]) return;
    inFlight.current[key] = true;
    setEngineLoading(unitNumber, 'prediction', true);
    try {
      const data = await api.getEngineAnalysis(unitNumber);
      setEnginePredictionById(prev => ({ ...prev, [unitNumber]: data }));
    } catch (e) {
      console.error(`[CONTEXT] fetchEnginePrediction(${unitNumber}) failed:`, e.message);
      setEngineError(unitNumber, 'prediction', e);
    } finally {
      setEngineLoading(unitNumber, 'prediction', false);
      delete inFlight.current[key];
    }
  }, [enginePredictionById]);

  // ── Fetch mission readiness (combined assessment) ────────────────────────────

  const fetchMissionReadiness = useCallback(async (unitNumber) => {
    const key = `mr_${unitNumber}`;
    if (inFlight.current[key]) return;
    if (missionReadinessById[unitNumber]) return;
    inFlight.current[key] = true;
    setEngineLoading(unitNumber, 'readiness', true);
    try {
      const data = await api.getMissionReadiness(unitNumber, MISSION_DURATION);
      setMissionReadinessById(prev => ({ ...prev, [unitNumber]: data }));
    } catch (e) {
      console.error(`[CONTEXT] fetchMissionReadiness(${unitNumber}) failed:`, e.message);
      setEngineError(unitNumber, 'readiness', e);
    } finally {
      setEngineLoading(unitNumber, 'readiness', false);
      delete inFlight.current[key];
    }
  }, [missionReadinessById]);

  // ── Fetch sensor analysis list ───────────────────────────────────────────────

  const fetchEngineSensors = useCallback(async (unitNumber) => {
    const key = `sensors_${unitNumber}`;
    if (inFlight.current[key]) return;
    if (engineSensorsById[unitNumber]) return;
    inFlight.current[key] = true;
    setEngineLoading(unitNumber, 'sensors', true);
    try {
      const data = await api.getEngineSensors(unitNumber);
      setEngineSensorsById(prev => ({ ...prev, [unitNumber]: data }));
    } catch (e) {
      console.error(`[CONTEXT] fetchEngineSensors(${unitNumber}) failed:`, e.message);
      setEngineError(unitNumber, 'sensors', e);
    } finally {
      setEngineLoading(unitNumber, 'sensors', false);
      delete inFlight.current[key];
    }
  }, [engineSensorsById]);

  // ── Fetch sensor history ─────────────────────────────────────────────────────

  const fetchSensorHistory = useCallback(async (unitNumber) => {
    const key = `history_${unitNumber}`;
    if (inFlight.current[key]) return;
    if (sensorHistoryById[unitNumber]) return;
    inFlight.current[key] = true;
    setEngineLoading(unitNumber, 'history', true);
    try {
      const data = await api.getSensorHistory(unitNumber, 50);
      setSensorHistoryById(prev => ({ ...prev, [unitNumber]: data }));
    } catch (e) {
      console.error(`[CONTEXT] fetchSensorHistory(${unitNumber}) failed:`, e.message);
      setEngineError(unitNumber, 'history', e);
    } finally {
      setEngineLoading(unitNumber, 'history', false);
      delete inFlight.current[key];
    }
  }, [sensorHistoryById]);

  /**
   * Fetch all data for a selected engine:
   * prediction + mission readiness + sensor analysis + sensor history
   */
  const fetchEngineData = useCallback(async (unitNumber) => {
    await Promise.all([
      fetchEnginePrediction(unitNumber),
      fetchMissionReadiness(unitNumber),
      fetchEngineSensors(unitNumber),
      fetchSensorHistory(unitNumber),
    ]);
  }, [fetchEnginePrediction, fetchMissionReadiness, fetchEngineSensors, fetchSensorHistory]);

  /**
   * Batch-load mission readiness for all engines.
   * Used by Fleet / Alerts / Maintenance pages.
   * Requests are serialised to avoid overwhelming the backend.
   */
  const fetchAllMissionReadiness = useCallback(async () => {
    for (const engine of engines) {
      await fetchMissionReadiness(engine.unit_number);
    }
  }, [engines, fetchMissionReadiness]);

  // ── CSV Upload ───────────────────────────────────────────────────────────────

  const uploadCSV = useCallback(async (file) => {
    setUploadState({ status: 'uploading', message: 'Uploading dataset...' });
    try {
      const result = await api.uploadData(file);

      // If no new data was found (same CSV re-uploaded), surface that to the user
      // without triggering a fake "processing" wait.
      if (result.engines_affected && result.engines_affected.length === 0) {
        setUploadState({ status: 'done', message: 'Dataset already loaded — no new data' });
        setTimeout(() => setUploadState({ status: 'idle', message: '' }), 4000);
        return;
      }

      setUploadState({ status: 'processing', message: 'Analyzing fleet...' });

      // Wait for backend pipeline background thread to finish, then re-fetch.
      // The 3s delay is a heuristic; real progress is not available from the backend.
      await new Promise(resolve => setTimeout(resolve, 3000));

      await fetchEngines();
      await fetchDatasetInfo();

      // Reset all cached per-engine data so stale data is not shown
      setEnginePredictionById({});
      setMissionReadinessById({});
      setEngineSensorsById({});
      setSensorHistoryById({});
      setLoadingById({});
      setErrorById({});

      setUploadState({ status: 'done', message: 'Analysis complete' });
      setTimeout(() => setUploadState({ status: 'idle', message: '' }), 4000);
    } catch (e) {
      console.error('[UPLOAD] Upload failed:', e.message);
      setUploadState({ status: 'error', message: e.message });
    }
  }, [fetchEngines, fetchDatasetInfo]);

  // ── Reset dataset (explicit user action only) ────────────────────────────────

  const resetDataset = useCallback(async () => {
    try {
      await api.resetDataset();

      // Clear all local state
      setEngines([]);
      setActiveDataset(null);
      setEnginePredictionById({});
      setMissionReadinessById({});
      setEngineSensorsById({});
      setSensorHistoryById({});
      setLoadingById({});
      setErrorById({});
      setEnginesError(null);

      return { success: true };
    } catch (e) {
      console.error('[RESET] Dataset reset failed:', e.message);
      return { success: false, error: e.message };
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchEngines();
    fetchDatasetInfo();
  }, [fetchEngines, fetchDatasetInfo]);

  // ── Context value ─────────────────────────────────────────────────────────────

  return (
    <AppDataContext.Provider value={{
      // Engine list
      engines,
      enginesLoading,
      enginesError,
      fetchEngines,

      // Active dataset info
      activeDataset,
      datasetLoading,
      fetchDatasetInfo,

      // Per-engine data (keyed by unit_number)
      engineDetailsById,
      enginePredictionById,
      missionReadinessById,
      engineSensorsById,
      sensorHistoryById,

      // Loading/error
      loadingById,
      errorById,
      isLoading,

      // Fetch actions
      fetchEnginePrediction,
      fetchMissionReadiness,
      fetchEngineSensors,
      fetchSensorHistory,
      fetchEngineData,
      fetchAllMissionReadiness,

      // Upload
      uploadCSV,
      uploadState,

      // Reset (explicit user action)
      resetDataset,

      // Constants
      MISSION_DURATION,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
