/**
 * PredictiveInsights.jsx
 * ======================
 * Real analytical summaries from backend data.
 * RUL distribution (bucketed, no 100 labels), risk concentration,
 * sensor health breakdown, priority breakdown.
 * No hardcoded values.
 */
import { useContext, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { TrendingUp, Shield, AlertTriangle, Activity, Loader2 } from 'lucide-react';
import { AppDataContext } from '../context/AppDataContext';

export default function PredictiveInsights({ engineContext }) {
  const {
    enginesLoading,
    missionReadinessById, enginePredictionById,
    fetchEngineData,
  } = useContext(AppDataContext);

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

  const pred = enginePredictionById[engineContext];
  const readiness = missionReadinessById[engineContext];

  if (!pred && !readiness) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-borderLight">
        <p className="text-sm text-textMuted">Loading predictions...</p>
      </div>
    );
  }

  const rul = pred?.rul_predicted;
  const margin = readiness?.rul_assessment?.margin_of_safety;
  const priority = readiness?.combined_assessment?.maintenance_priority;
  
  const h = readiness?.current_health;
  const normal = h?.normal_sensors ?? 0;
  const degrading = h?.degrading_sensors ?? 0;
  const abnormal = h?.abnormal_sensors ?? 0;
  const total = normal + degrading + abnormal;

  return (
    <div className="space-y-6">

      {/* KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-borderLight p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-2">Predicted RUL</p>
          <p className="text-4xl font-bold text-textPrimary">
            {rul != null ? rul.toFixed(1) : '—'} <span className="text-sm font-medium text-textSecondary">cycles</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-borderLight p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-2">Margin of Safety</p>
          <p className={`text-4xl font-bold ${margin == null ? 'text-textPrimary' : margin < 0 ? 'text-danger' : margin < 15 ? 'text-warning' : 'text-textPrimary'}`}>
            {margin != null ? `${margin >= 0 ? '+' : ''}${margin.toFixed(1)}` : '—'} <span className="text-sm font-medium text-textSecondary">cycles</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-borderLight p-6 flex flex-col justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-2">Maintenance Priority</p>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
              priority === 'HIGH' ? 'bg-danger/10 text-danger' :
              priority === 'MEDIUM' ? 'bg-warning/10 text-warning' : 'bg-subtle text-textSecondary'
            }`}>
              {priority || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Sensor health breakdown */}
      <div className="bg-white rounded-2xl border border-borderLight p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-textMuted" />
          <div>
            <h3 className="text-base font-bold text-textPrimary">Sensor Health Distribution</h3>
            <p className="text-[11px] text-textMuted">Based on {total} total sensors for Unit {engineContext}</p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          {[
            { label: 'Normal',    value: normal,    color: '#181818', dot: 'bg-textPrimary' },
            { label: 'Degrading', value: degrading, color: '#F2B84B', dot: 'bg-warning' },
            { label: 'Abnormal',  value: abnormal,  color: '#F05D5E', dot: 'bg-danger' },
          ].map(({ label, value, color, dot }) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-sm font-medium text-textSecondary">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-textPrimary">{value}</span>
                    <span className="text-xs text-textMuted w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-subtle rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
