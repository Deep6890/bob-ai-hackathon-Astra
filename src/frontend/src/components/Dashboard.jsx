/**
 * Dashboard.jsx
 * =============
 * Decision-oriented overview:
 *   1. Fleet KPI strip (4 numbers)
 *   2. Priority assets list (HIGH first, limited)
 *   3. RUL distribution chart (grouped buckets, no 100 labels)
 *   4. Fleet health summary (sensor state counts)
 *
 * NO ticker row of 100 engine cards.
 * All values from backend — nothing invented.
 */
import { useContext, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  AlertTriangle, CheckCircle2, Layers, TrendingDown,
  Activity, Upload, ChevronRight,
} from 'lucide-react';
import { AppDataContext, MISSION_DURATION } from '../context/AppDataContext';

/* ── Shared helpers ──────────────────────────────────────────────────────── */
function statusColor(status) {
  if (!status) return 'bg-borderSecondary';
  const s = status.toUpperCase();
  if (s === 'SAFE' || s === 'READY') return 'bg-accent';
  if (s === 'MARGINAL' || s === 'WARNING') return 'bg-warning';
  return 'bg-danger';
}

function priorityColor(priority) {
  if (priority === 'HIGH')   return 'text-danger';
  if (priority === 'MEDIUM') return 'text-warning';
  return 'text-textMuted';
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function EmptyDashboard({ uploadState, onUpload }) {
  const isUploading = uploadState?.status === 'uploading' || uploadState?.status === 'processing';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div
        className="bg-white rounded-2xl border border-borderLight p-10 flex flex-col items-center text-center max-w-md w-full"
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
      >
        <div className="w-14 h-14 rounded-2xl bg-subtle border border-borderLight flex items-center justify-center mb-5">
          <Layers className="w-6 h-6 text-textMuted" />
        </div>
        <h3 className="text-lg font-bold text-textPrimary mb-2">No fleet data available</h3>
        <p className="text-sm text-textSecondary mb-6 leading-relaxed">
          Upload a CSV file to begin analysis. The ML pipeline will process your data and generate
          RUL predictions, health assessments, and mission readiness evaluations.
        </p>

        {isUploading ? (
          <div className="flex items-center gap-2 text-sm text-textSecondary">
            <div className="w-4 h-4 rounded-full border-2 border-borderSecondary border-t-textPrimary animate-spin" />
            {uploadState.message}
          </div>
        ) : (
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-5 py-2.5 bg-textPrimary text-white rounded-full text-sm font-medium hover:bg-neutral transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload CSV Dataset
          </button>
        )}

        <div className="mt-6 pt-5 border-t border-borderLight w-full text-left space-y-2">
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-3">What to upload</p>
          {[
            'NASA C-MAPSS style turbofan sensor data',
            'Columns: unit_number, time_cycles, sensor_N',
            'Raw CMAPSS format (space-separated) also supported',
          ].map(t => (
            <p key={t} className="text-xs text-textSecondary flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-borderSecondary shrink-0" />
              {t}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── KPI strip ───────────────────────────────────────────────────────────── */
function KpiStrip({ engines, missionReadinessById }) {
  const total = engines.length;
  let ready = 0, warning = 0, high = 0;

  engines.forEach(e => {
    const r = missionReadinessById[e.unit_number];
    if (!r) return;
    const s = r.combined_assessment?.mission_readiness?.toUpperCase();
    const p = r.combined_assessment?.maintenance_priority;
    if (s === 'SAFE' || s === 'READY') ready++;
    else if (s === 'MARGINAL' || s === 'WARNING') warning++;
    if (p === 'HIGH') high++;
  });

  const kpis = [
    { label: 'Total Assets',       value: total,   icon: Layers,        color: 'text-textPrimary' },
    { label: 'Mission Ready',      value: ready,   icon: CheckCircle2,  color: 'text-accent' },
    { label: 'Needs Attention',    value: warning, icon: AlertTriangle,  color: 'text-warning' },
    { label: 'High Priority',      value: high,    icon: TrendingDown,   color: 'text-danger' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-white rounded-2xl border border-borderLight p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-textMuted uppercase tracking-wider">{label}</span>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <p className="text-3xl font-bold text-textPrimary">{value}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Engine Card ─────────────────────────────────────────────────────────── */
function EngineCard({ engine, readiness, onSelectEngine }) {
  const combined  = readiness?.combined_assessment;
  const rul_data  = readiness?.rul_assessment;
  const status    = combined?.mission_readiness ?? '—';
  const priority  = combined?.maintenance_priority ?? '—';
  const rul       = rul_data?.predicted_rul_cycles;
  const margin    = rul_data?.margin_of_safety;
  const cycle     = readiness?.latest_cycle ?? engine.latest_cycle;

  return (
    <div 
      className="bg-white rounded-2xl border border-borderLight p-5 hover:border-borderSecondary transition-all cursor-pointer group flex flex-col justify-between"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onClick={() => onSelectEngine(engine.unit_number)}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(status)}`} />
            <h3 className="text-base font-bold text-textPrimary">Unit {engine.unit_number}</h3>
          </div>
          <span className={`text-xs font-bold ${priorityColor(priority)} bg-subtle px-2 py-1 rounded-md`}>
            {priority}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-[10px] text-textMuted uppercase tracking-wider mb-0.5">Predicted RUL</p>
            <p className="text-sm font-semibold text-textPrimary">
              {rul != null ? `${rul.toFixed(1)} cycles` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-textMuted uppercase tracking-wider mb-0.5">Status</p>
            <p className="text-sm font-semibold text-textPrimary truncate">{status}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2 pt-3 border-t border-borderLight/50">
        <p className="text-[11px] text-textMuted">
          {cycle != null ? `Cycle ${cycle}` : 'Cycle unavailable'}
        </p>
        <button className="text-[11px] font-medium text-textSecondary group-hover:text-textPrimary flex items-center gap-1 transition-colors">
          Inspect <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── RUL distribution chart ──────────────────────────────────────────────── */
function RulDistributionChart({ engines, enginePredictionById, missionReadinessById }) {
  // Group into buckets instead of one bar per engine
  const buckets = [
    { label: '0–20',  min: 0,   max: 20,  count: 0, highCount: 0 },
    { label: '21–40', min: 21,  max: 40,  count: 0, highCount: 0 },
    { label: '41–60', min: 41,  max: 60,  count: 0, highCount: 0 },
    { label: '61–80', min: 61,  max: 80,  count: 0, highCount: 0 },
    { label: '81–100',min: 81,  max: 100, count: 0, highCount: 0 },
    { label: '100+',  min: 101, max: Infinity, count: 0, highCount: 0 },
  ];

  engines.forEach(e => {
    const pred = enginePredictionById[e.unit_number];
    const r    = missionReadinessById[e.unit_number];
    if (!pred) return;
    const rul  = pred.rul_predicted;
    const bucket = buckets.find(b => rul >= b.min && rul <= b.max);
    if (bucket) {
      bucket.count++;
      if (r?.combined_assessment?.maintenance_priority === 'HIGH') bucket.highCount++;
    }
  });

  const data = buckets.filter(b => b.count > 0);

  if (data.length === 0) return null;

  return (
    <div
      className="bg-white rounded-2xl border border-borderLight p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-textPrimary">RUL Distribution</p>
          <p className="text-[11px] text-textMuted">Assets grouped by remaining useful life</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-textMuted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger inline-block" /> HIGH priority</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-textPrimary inline-block" /> Other</span>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E5" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#929292' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#929292' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Assets', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#929292', dy: 25 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #E7E7E5',
                fontSize: '12px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
              }}
              formatter={(value, name) => [
                value,
                name === 'count' ? 'Total assets' : 'High priority',
              ]}
              labelFormatter={(l) => `RUL range: ${l} cycles`}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.highCount === entry.count && entry.count > 0 ? '#F05D5E' : '#181818'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Fleet health summary ────────────────────────────────────────────────── */
function FleetHealthSummary({ missionReadinessById }) {
  const loaded = Object.values(missionReadinessById);
  if (loaded.length === 0) return null;

  let normal = 0, degrading = 0, abnormal = 0, unknown = 0;
  loaded.forEach(r => {
    normal    += r.current_health?.normal_sensors    ?? 0;
    degrading += r.current_health?.degrading_sensors ?? 0;
    abnormal  += r.current_health?.abnormal_sensors  ?? 0;
    unknown   += r.current_health?.unknown_sensors   ?? 0;
  });
  const total = normal + degrading + abnormal + unknown;

  const items = [
    { label: 'Normal',    value: normal,    color: 'bg-accent',          dot: 'bg-accent' },
    { label: 'Degrading', value: degrading, color: 'bg-warning',         dot: 'bg-warning' },
    { label: 'Abnormal',  value: abnormal,  color: 'bg-danger',          dot: 'bg-danger' },
    { label: 'Unavailable', value: unknown, color: 'bg-borderSecondary', dot: 'bg-borderSecondary' },
  ];

  return (
    <div
      className="bg-white rounded-2xl border border-borderLight p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="mb-4">
        <p className="text-sm font-semibold text-textPrimary">Fleet Sensor Health</p>
        <p className="text-[11px] text-textMuted">{loaded.length} engine{loaded.length !== 1 ? 's' : ''} analyzed · {total} sensor readings</p>
      </div>
      <div className="space-y-3">
        {items.map(({ label, value, color, dot }) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="text-xs text-textSecondary">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-textPrimary">{value}</span>
                  <span className="text-[10px] text-textMuted w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────────────── */
export default function Dashboard({ onSelectEngine }) {
  const {
    engines,
    enginesLoading,
    enginesError,
    enginePredictionById,
    missionReadinessById,
    fetchEngineData,
    fetchAllMissionReadiness,
    uploadState,
  } = useContext(AppDataContext);

  // Load readiness for all engines so KPI strip has data
  useEffect(() => {
    if (engines.length > 0) {
      fetchAllMissionReadiness();
      // Also load predictions for RUL chart
      engines.forEach(e => fetchEngineData(e.unit_number));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engines.length]);

  if (enginesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-borderSecondary border-t-textPrimary animate-spin" />
          <p className="text-sm text-textSecondary">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  if (enginesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-danger/20 p-8 max-w-md text-center">
          <p className="text-base font-semibold text-textPrimary mb-2">Unable to load fleet data</p>
          <p className="text-sm text-danger leading-relaxed">{enginesError}</p>
          <p className="text-xs text-textMuted mt-3">Check that the backend is running on port 5000.</p>
        </div>
      </div>
    );
  }

  if (engines.length === 0) {
    return <EmptyDashboard uploadState={uploadState} />;
  }

  // Build grid list — all engines
  const allItems = engines
    .map(e => ({
      engine:    e,
      readiness: missionReadinessById[e.unit_number],
    }))
    .filter(item => item.readiness)
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const pa = a.readiness.combined_assessment?.maintenance_priority ?? 'LOW';
      const pb = b.readiness.combined_assessment?.maintenance_priority ?? 'LOW';
      if (pa !== pb) return (order[pa] ?? 3) - (order[pb] ?? 3);
      const ra = a.readiness.rul_assessment?.predicted_rul_cycles ?? 999;
      const rb = b.readiness.rul_assessment?.predicted_rul_cycles ?? 999;
      return ra - rb;
    });

  return (
    <div className="space-y-6">
      <KpiStrip engines={engines} missionReadinessById={missionReadinessById} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-textPrimary">Fleet Engines</h2>
          <span className="text-xs font-medium text-textSecondary bg-borderSecondary/30 px-3 py-1 rounded-full">
            {allItems.length} Assets
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allItems.map(({ engine, readiness }) => (
            <EngineCard
              key={engine.unit_number}
              engine={engine}
              readiness={readiness}
              onSelectEngine={onSelectEngine}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
