/**
 * Reports.jsx
 * ===========
 * Fleet summary from uploaded dataset.
 * Readable charts — no 100 labels on axes.
 * No fake export functionality.
 * All values from backend ML pipeline.
 */
import { useContext } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { FileText, Activity, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { AppDataContext } from '../context/AppDataContext';

export default function ReportsPage() {
  const {
    engines, enginesLoading,
    missionReadinessById, enginePredictionById,
    activeDataset,
  } = useContext(AppDataContext);

  const loadedReadiness = Object.values(missionReadinessById);
  const loadedCount = loadedReadiness.length;

  // Summary counts
  const highCount     = loadedReadiness.filter(r => r.combined_assessment?.maintenance_priority === 'HIGH').length;
  const totalAbnormal = loadedReadiness.reduce((s, r) => s + (r.current_health?.abnormal_sensors ?? 0), 0);
  const criticalCount = engines.filter(e => {
    const pred = enginePredictionById[e.unit_number];
    return pred && pred.rul_predicted < 30;
  }).length;

  // RUL chart — bucketed (no 100 labels)
  const buckets = [
    { label: '0–20',   min: 0,   max: 20,      count: 0 },
    { label: '21–40',  min: 21,  max: 40,       count: 0 },
    { label: '41–60',  min: 41,  max: 60,       count: 0 },
    { label: '61–80',  min: 61,  max: 80,       count: 0 },
    { label: '81–100', min: 81,  max: 100,      count: 0 },
    { label: '100+',   min: 101, max: Infinity, count: 0 },
  ];
  engines.forEach(e => {
    const pred = enginePredictionById[e.unit_number];
    if (!pred) return;
    const b = buckets.find(b => pred.rul_predicted >= b.min && pred.rul_predicted <= b.max);
    if (b) b.count++;
  });
  const rulData = buckets.filter(b => b.count > 0);

  if (enginesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-textMuted animate-spin" />
      </div>
    );
  }

  if (engines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-borderLight">
        <p className="text-base font-semibold text-textPrimary mb-1">No fleet data available</p>
        <p className="text-sm text-textSecondary">Upload a CSV to generate reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Dataset info banner */}
      {activeDataset?.dataset_loaded && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-borderLight"
          style={{ background: 'rgba(244,244,242,0.8)', backdropFilter: 'blur(8px)' }}
        >
          <FileText className="w-4 h-4 text-textMuted shrink-0" />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-textSecondary">
            <span><strong className="text-textPrimary">{activeDataset.engine_count}</strong> engine{activeDataset.engine_count !== 1 ? 's' : ''} in dataset</span>
            {activeDataset.latest_cycle != null && (
              <span>Latest cycle: <strong className="text-textPrimary">{activeDataset.latest_cycle}</strong></span>
            )}
            {activeDataset.latest_upload && (
              <span>Last updated: <strong className="text-textPrimary">{new Date(activeDataset.latest_upload).toLocaleString()}</strong></span>
            )}
          </div>
          <span className="ml-auto text-[11px] text-textMuted">All values from ML pipeline · backend API</span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets',    value: engines.length, icon: Activity,      color: '' },
          { label: 'Analyzed',        value: loadedCount,    icon: Shield,        color: '' },
          { label: 'High Priority',   value: highCount,      icon: AlertTriangle, color: 'text-danger' },
          { label: 'RUL < Mission',   value: criticalCount,  icon: FileText,      color: 'text-danger' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-borderLight p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Icon className="w-4 h-4 text-textMuted mb-3" />
            <p className={`text-3xl font-bold ${color || 'text-textPrimary'}`}>{value}</p>
            <p className="text-[10px] text-textMuted uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* RUL distribution chart */}
      <div className="bg-white rounded-2xl border border-borderLight p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-textPrimary">RUL Distribution</p>
            <p className="text-[11px] text-textMuted">Assets by remaining useful life · ML predictions</p>
          </div>
        </div>
        {rulData.length === 0 ? (
          <p className="text-sm text-textMuted py-8 text-center">
            {loadedCount === 0 ? 'No prediction data loaded yet' : 'No prediction data available'}
          </p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rulData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#929292' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#929292' }} axisLine={false} tickLine={false}
                  label={{ value: 'Assets', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#929292', dy: 25 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #E7E7E5', fontSize: '12px', padding: '8px 12px', background: '#fff' }}
                  formatter={(v) => [v, 'Assets']}
                  labelFormatter={(l) => `RUL range: ${l} cycles`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40} fill="#181818" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Fleet analysis table */}
      {loadedCount > 0 && (
        <div className="bg-white rounded-2xl border border-borderLight overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-5 py-4 border-b border-borderLight">
            <p className="text-sm font-semibold text-textPrimary">Fleet Analysis Summary</p>
            <p className="text-[11px] text-textMuted">All values from ML pipeline</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-borderLight bg-subtle">
                  {['Unit', 'Cycle', 'RUL (cy)', 'Status', 'Priority', 'Normal', 'Degrading', 'Abnormal'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold tracking-wider text-textMuted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {engines.map(e => {
                  const pred = enginePredictionById[e.unit_number];
                  const r    = missionReadinessById[e.unit_number];
                  const cycle = r?.latest_cycle ?? e.latest_cycle;
                  return (
                    <tr key={e.unit_number} className="border-b border-borderLight hover:bg-subtle transition-colors last:border-0">
                      <td className="px-4 py-3 text-sm font-bold text-textPrimary">{e.unit_number}</td>
                      <td className="px-4 py-3 text-sm text-textSecondary">
                        {cycle != null ? cycle : <span className="text-textMuted text-xs">Unavailable</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-textPrimary">
                        {pred ? pred.rul_predicted.toFixed(1) : <span className="text-textMuted text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-textSecondary">
                        {r?.combined_assessment?.mission_readiness ?? <span className="text-textMuted text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r?.combined_assessment?.maintenance_priority ? (
                          <span className={`text-xs font-semibold ${
                            r.combined_assessment.maintenance_priority === 'HIGH' ? 'text-danger' :
                            r.combined_assessment.maintenance_priority === 'MEDIUM' ? 'text-warning' : 'text-textMuted'
                          }`}>
                            {r.combined_assessment.maintenance_priority}
                          </span>
                        ) : <span className="text-textMuted text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-textSecondary">{r?.current_health?.normal_sensors ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-textSecondary">{r?.current_health?.degrading_sensors ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-textSecondary">{r?.current_health?.abnormal_sensors ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-[10px] text-textMuted border-t border-borderLight bg-subtle">
            All values sourced from ML pipeline via backend API · {loadedCount} of {engines.length} asset{engines.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>
      )}
    </div>
  );
}
