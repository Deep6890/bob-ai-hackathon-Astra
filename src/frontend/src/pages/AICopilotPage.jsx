/**
 * AICopilotPage.jsx
 * =================
 * Structured Analysis — derives insight from real backend fields.
 * No LLM. No fake chat. Clearly labeled as structured backend analysis.
 * Progressive disclosure: select asset → see full evidence.
 */
import { useContext, useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AppDataContext, MISSION_DURATION } from '../context/AppDataContext';

function StatusDot({ status }) {
  if (!status) return <span className="w-1.5 h-1.5 rounded-full bg-borderSecondary inline-block" />;
  const s = status.toUpperCase();
  const color =
    s === 'SAFE' || s === 'READY'       ? 'bg-accent' :
    s === 'MARGINAL' || s === 'WARNING' ? 'bg-warning' :
    'bg-danger';
  return <span className={`w-1.5 h-1.5 rounded-full ${color} inline-block shrink-0`} />;
}

function AnalysisCard({ engine, forceExpanded = false }) {
  const { missionReadinessById, enginePredictionById, engineSensorsById, loadingById } = useContext(AppDataContext);
  const [expanded, setExpanded] = useState(forceExpanded);

  const un        = engine.unit_number;
  const readiness = missionReadinessById[un];
  const pred      = enginePredictionById[un];
  const sensors   = engineSensorsById[un];
  const isLoading = loadingById[`${un}_readiness`];

  const combined  = readiness?.combined_assessment;
  const rul       = readiness?.rul_assessment;
  const health    = readiness?.current_health;
  const abnormal  = sensors?.filter(s => s.state === 'ABNORMAL')  ?? [];
  const degrading = sensors?.filter(s => s.state === 'DEGRADING') ?? [];
  const status    = combined?.mission_readiness;
  const priority  = combined?.maintenance_priority;
  const cycle     = readiness?.latest_cycle ?? engine.latest_cycle;

  const hasData = !!(combined || pred);

  return (
    <div className="bg-white rounded-2xl border border-borderLight overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Header — always visible */}
      {!forceExpanded && (
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-subtle transition-colors border-b border-borderLight"
      >
        <StatusDot status={status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-textPrimary">Unit {un}</span>
            {cycle != null && (
              <span className="text-[11px] text-textMuted">Cycle {cycle}</span>
            )}
            {priority && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                priority === 'HIGH'   ? 'bg-danger/10 text-danger' :
                priority === 'MEDIUM' ? 'bg-warning/10 text-warning' :
                'bg-subtle text-textMuted'
              }`}>
                {priority}
              </span>
            )}
          </div>
          {!hasData && !isLoading && (
            <p className="text-[11px] text-textMuted mt-0.5">Analysis not yet loaded</p>
          )}
          {isLoading && (
            <p className="text-[11px] text-textMuted mt-0.5 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading...
            </p>
          )}
          {hasData && status && (
            <p className="text-[11px] text-textMuted mt-0.5">
              {status} · {rul?.predicted_rul_cycles != null ? `RUL ${rul.predicted_rul_cycles.toFixed(1)} cycles` : '—'}
            </p>
          )}
        </div>
        <span className="ml-auto text-textMuted">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      )}

      {/* Expanded analysis */}
      {expanded && (
        <div className="p-5 space-y-3 text-[13px] text-textSecondary leading-relaxed">

          {!hasData && !isLoading && (
            <p className="text-textMuted text-sm">Select this asset on the Dashboard to load its analysis.</p>
          )}

          {/* RUL + margin */}
          {rul?.predicted_rul_cycles != null && (
            <div className="p-3 bg-subtle rounded-xl border border-borderLight">
              <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wider mb-2">RUL Assessment</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-textPrimary">{rul.predicted_rul_cycles.toFixed(1)}</p>
                  <p className="text-[10px] text-textMuted">Predicted RUL</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-textPrimary">{MISSION_DURATION}</p>
                  <p className="text-[10px] text-textMuted">Mission Duration</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${
                    rul.margin_of_safety == null ? 'text-textMuted' :
                    rul.margin_of_safety < 0 ? 'text-danger' :
                    rul.margin_of_safety < 15 ? 'text-warning' : 'text-textPrimary'
                  }`}>
                    {rul.margin_of_safety != null
                      ? `${rul.margin_of_safety >= 0 ? '+' : ''}${rul.margin_of_safety.toFixed(1)}`
                      : '—'}
                  </p>
                  <p className="text-[10px] text-textMuted">Safety Margin</p>
                </div>
              </div>
            </div>
          )}

          {/* Assessment breakdown */}
          {(status || priority) && (
            <div className="grid grid-cols-2 gap-2">
              {health?.status && (
                <div className="p-2.5 bg-subtle rounded-lg border border-borderLight">
                  <p className="text-[10px] text-textMuted mb-0.5">Current Health</p>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={health.status} />
                    <span className="text-xs font-semibold text-textPrimary">{health.status}</span>
                  </div>
                </div>
              )}
              {status && (
                <div className="p-2.5 bg-subtle rounded-lg border border-borderLight">
                  <p className="text-[10px] text-textMuted mb-0.5">Combined Assessment</p>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={status} />
                    <span className="text-xs font-semibold text-textPrimary">{status}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sensor summary */}
          {health && (
            <p>
              <span className="font-semibold text-textPrimary">Sensor health: </span>
              {health.normal_sensors} normal
              {health.degrading_sensors > 0 && `, ${health.degrading_sensors} degrading`}
              {health.abnormal_sensors > 0 && `, ${health.abnormal_sensors} abnormal`}
              {health.unknown_sensors > 0 && `, ${health.unknown_sensors} classification unavailable`}.
            </p>
          )}

          {/* Abnormal sensors */}
          {abnormal.length > 0 && (
            <p>
              <span className="font-semibold text-danger">Abnormal ({abnormal.length}): </span>
              {abnormal.map(s => s.sensor).join(', ')}.
              {' '}These sensors show persistent anomalous behaviour compared with the healthy reference population.
            </p>
          )}

          {/* Degrading sensors */}
          {degrading.length > 0 && (
            <p>
              <span className="font-semibold text-warning">Degrading ({degrading.length}): </span>
              {degrading.map(s => s.sensor).join(', ')}.
              {' '}Recent values show a trend aligned with historical degradation patterns.
            </p>
          )}

          {/* Recommendation */}
          {combined?.recommendation && (
            <div className="p-3 bg-subtle rounded-xl border border-borderLight">
              <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wider mb-1.5">Backend Recommendation</p>
              <p className="text-[13px] text-textSecondary leading-relaxed">{combined.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AICopilotPage({ engineContext }) {
  const { engines, enginesLoading, fetchEngineData } = useContext(AppDataContext);

  useEffect(() => {
    if (engineContext) {
      fetchEngineData(engineContext);
    }
  }, [engineContext, fetchEngineData]);

  if (enginesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-textMuted animate-spin" />
      </div>
    );
  }

  if (!engineContext) {
    return (
      <div className="bg-white rounded-2xl border border-borderLight p-8 text-center">
        <Brain className="w-8 h-8 text-borderSecondary mx-auto mb-3" />
        <p className="text-sm text-textMuted">No Engine Selected</p>
      </div>
    );
  }

  const engine = engines.find(e => e.unit_number === engineContext) || { unit_number: engineContext };

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div
        className="flex items-center gap-4 p-4 rounded-2xl border border-borderLight"
        style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)' }}
      >
        <div className="w-10 h-10 rounded-xl bg-textPrimary flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-textPrimary">Structured Analysis - Unit {engineContext}</h3>
          <p className="text-[11px] text-textMuted">
            Derived from ML pipeline results · No LLM — structured backend analysis
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-[11px] text-textSecondary">Backend connected</span>
        </div>
      </div>

      <AnalysisCard engine={engine} forceExpanded={true} />
    </div>
  );
}
