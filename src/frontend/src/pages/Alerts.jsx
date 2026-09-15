/**
 * Alerts.jsx
 * ==========
 * Compact alert list with filters (All / High / Medium).
 * Alerts derived from real backend analysis data only.
 * No duplicate alerts on refresh.
 * No hardcoded alerts.
 */
import { useContext, useEffect, useState } from 'react';
import { Bell, Loader2, ChevronRight } from 'lucide-react';
import { AppDataContext } from '../context/AppDataContext';

const FILTERS = ['All', 'HIGH', 'MEDIUM'];

export default function AlertsPage({ engineContext }) {
  const { enginesLoading, missionReadinessById, engineSensorsById, fetchEngineData } = useContext(AppDataContext);

  const [filter, setFilter] = useState('All');

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
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-borderLight">
        <p className="text-base font-semibold text-textPrimary mb-1">No Engine Selected</p>
      </div>
    );
  }

  // Build alert list from real backend data for the current engine
  const allAlerts = [];
  const seen = new Set();
  const readiness = missionReadinessById[engineContext];
  const sensors   = engineSensorsById[engineContext];

  if (readiness?.combined_assessment?.maintenance_priority === 'HIGH') {
    const id = `${engineContext}-priority`;
    if (!seen.has(id)) {
      seen.add(id);
      allAlerts.push({
        id,
        unit:     engineContext,
        severity: 'HIGH',
        type:     'High Priority',
        sensor:   null,
        rul:      readiness.rul_assessment?.predicted_rul_cycles,
        margin:   readiness.rul_assessment?.margin_of_safety,
        message:  readiness.combined_assessment?.recommendation ?? 'Maintenance priority flagged as HIGH by ML pipeline.',
      });
    }
  }

  if (sensors) {
    sensors.filter(s => s.state === 'ABNORMAL').forEach(s => {
      const id = `${engineContext}-${s.sensor}-abnormal`;
      if (!seen.has(id)) {
        seen.add(id);
        allAlerts.push({
          id,
          unit:     engineContext,
          severity: 'HIGH',
          type:     'Abnormal Sensor',
          sensor:   s.sensor,
          rul:      readiness?.rul_assessment?.predicted_rul_cycles,
          margin:   readiness?.rul_assessment?.margin_of_safety,
          message:  `${s.sensor} shows persistent anomalous behaviour.${s.persistence != null ? ` Observed in ${Math.round(s.persistence * 100)}% of recent window.` : ''}${s.normalized_deviation != null ? ` Deviation: ${s.normalized_deviation.toFixed(2)}σ.` : ''}`,
        });
      }
    });

    sensors.filter(s => s.state === 'DEGRADING').forEach(s => {
      const id = `${engineContext}-${s.sensor}-degrading`;
      if (!seen.has(id)) {
        seen.add(id);
        allAlerts.push({
          id,
          unit:     engineContext,
          severity: 'MEDIUM',
          type:     'Degrading Sensor',
          sensor:   s.sensor,
          rul:      readiness?.rul_assessment?.predicted_rul_cycles,
          margin:   readiness?.rul_assessment?.margin_of_safety,
          message:  `${s.sensor} shows a degradation trend aligned with historical patterns.${s.degradation_direction ? ` Direction: ${s.degradation_direction}.` : ''}`,
        });
      }
    });
  }

  // Sort: HIGH first
  allAlerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1;
    return 0;
  });

  const filtered = filter === 'All' ? allAlerts : allAlerts.filter(a => a.severity === filter);

  return (
    <div className="space-y-4">

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 p-3 rounded-2xl border border-borderLight"
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <Bell className="w-4 h-4 text-textMuted shrink-0" />
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                filter === f
                  ? 'bg-textPrimary text-white border-textPrimary'
                  : 'bg-white border-borderLight text-textSecondary hover:border-borderSecondary'
              }`}
            >
              {f === 'All' ? `All (${allAlerts.length})` : `${f} (${allAlerts.filter(a => a.severity === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 bg-white rounded-2xl border border-borderLight">
          <Bell className="w-7 h-7 text-borderSecondary mb-2" />
          <p className="text-sm text-textMuted">
            {allAlerts.length === 0
              ? 'No alerts detected by ML analysis'
              : `No ${filter} alerts`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => (
            <div
              key={alert.id}
              className="bg-white rounded-xl border border-borderLight p-4"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
            >
              <div className="flex items-start gap-3">
                {/* Severity dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${alert.severity === 'HIGH' ? 'bg-danger' : 'bg-warning'}`} />

                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold text-textPrimary">Unit {alert.unit}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      alert.severity === 'HIGH'
                        ? 'bg-danger/8 border-danger/20 text-danger'
                        : 'bg-warning/8 border-warning/20 text-warning'
                    }`}>
                      {alert.type}
                    </span>
                    {alert.sensor && (
                      <span className="text-[10px] text-textMuted font-mono">{alert.sensor}</span>
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-xs text-textSecondary leading-relaxed mb-2">{alert.message}</p>

                  {/* RUL / margin inline */}
                  <div className="flex flex-wrap gap-4 text-[11px] text-textMuted">
                    {alert.rul != null && (
                      <span>RUL: <strong className="text-textPrimary">{alert.rul.toFixed(1)} cycles</strong></span>
                    )}
                    {alert.margin != null && (
                      <span>Margin: <strong className={alert.margin < 0 ? 'text-danger' : 'text-textPrimary'}>
                        {alert.margin >= 0 ? '+' : ''}{alert.margin.toFixed(1)} cycles
                      </strong></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
