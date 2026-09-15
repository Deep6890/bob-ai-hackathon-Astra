/**
 * Maintenance.jsx
 * ===============
 * Action-oriented maintenance queue.
 * Sorted HIGH → MEDIUM. Compact rows.
 * No fake dates, technicians, work orders, costs.
 * All data from backend ML pipeline.
 */
import { useContext, useEffect } from 'react';
import { Wrench, Loader2, ChevronRight } from 'lucide-react';
import { AppDataContext } from '../context/AppDataContext';

function PriorityBadge({ priority }) {
  const cfg = {
    HIGH:   { bg: 'bg-danger/10',   text: 'text-danger',   dot: 'bg-danger' },
    MEDIUM: { bg: 'bg-warning/10',  text: 'text-warning',  dot: 'bg-warning' },
    LOW:    { bg: 'bg-subtle',      text: 'text-textMuted', dot: 'bg-borderSecondary' },
  }[priority] ?? { bg: 'bg-subtle', text: 'text-textMuted', dot: 'bg-borderSecondary' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {priority}
    </span>
  );
}

export default function MaintenancePage({ engineContext }) {
  const { enginesLoading, missionReadinessById, fetchEngineData } = useContext(AppDataContext);

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

  const r = missionReadinessById[engineContext];
  if (!r) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-borderLight">
        <p className="text-sm text-textMuted">No maintenance data available for Unit {engineContext}</p>
      </div>
    );
  }

  const priority = r.combined_assessment?.maintenance_priority ?? 'LOW';
  const rul = r.rul_assessment?.predicted_rul_cycles;
  const margin = r.rul_assessment?.margin_of_safety;
  const status = r.combined_assessment?.mission_readiness;
  const rec = r.combined_assessment?.recommendation;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="w-5 h-5 text-textMuted" />
        <h2 className="text-2xl font-bold text-textPrimary">Maintenance Context</h2>
      </div>

      <div className="bg-white rounded-2xl border border-borderLight p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between border-b border-borderLight/50 pb-4 mb-4">
          <div>
            <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-1">Unit</p>
            <p className="text-lg font-bold text-textPrimary">Engine {engineContext}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-1">Priority</p>
            <PriorityBadge priority={priority} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-textSecondary mb-1">Predicted RUL</p>
            <p className="text-xl font-bold text-textPrimary">
              {rul != null ? `${rul.toFixed(1)} cycles` : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-textSecondary mb-1">Margin of Safety</p>
            <p className={`text-xl font-bold ${
              margin == null ? 'text-textMuted' : margin < 0 ? 'text-danger' : margin < 15 ? 'text-warning' : 'text-textPrimary'
            }`}>
              {margin != null ? `${margin >= 0 ? '+' : ''}${margin.toFixed(1)} cycles` : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-textSecondary mb-1">Status</p>
            <p className="text-lg font-semibold text-textPrimary truncate">{status || '—'}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-borderLight/50">
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-3">Backend Recommendation</p>
          <div className="bg-subtle p-4 rounded-xl border border-borderLight/50">
            <p className="text-sm text-textSecondary leading-relaxed">
              {rec || 'No specific recommendation provided by the backend.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
