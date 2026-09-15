import { useContext, useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Loader2, X, ChevronRight, Activity } from 'lucide-react';
import { AppDataContext } from '../context/AppDataContext';

/* ── UI Components ───────────────────────────────────────────────────────── */
function StatusIndicator({ state }) {
  if (!state) return <span className="w-1.5 h-1.5 rounded-full bg-borderSecondary" />;
  const s = state.toUpperCase();
  if (s === 'NORMAL') return <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />;
  if (s === 'DEGRADING') return <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />;
  if (s === 'ABNORMAL') return <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-borderSecondary" />;
}

function stateColors(state) {
  if (!state) return 'text-textMuted';
  const s = state.toUpperCase();
  if (s === 'NORMAL') return 'text-[#10B981]';
  if (s === 'DEGRADING') return 'text-[#F59E0B] font-medium';
  if (s === 'ABNORMAL') return 'text-[#EF4444] font-medium';
  return 'text-textMuted';
}

function getAttentionLevel(sensor) {
  if (!sensor || sensor.state === 'UNKNOWN') return 'UNAVAILABLE';
  if (sensor.state === 'NORMAL') return 'LOW';
  
  const isPersistent = sensor.persistence >= 0.6;
  const isStrongDev = sensor.normalized_deviation != null && Math.abs(sensor.normalized_deviation) > 2.0;
  
  if (sensor.state === 'DEGRADING' && isPersistent && isStrongDev) return 'HIGH';
  if (sensor.state === 'DEGRADING' && isPersistent) return 'HIGH';
  if (sensor.state === 'ABNORMAL' && isPersistent) return 'MEDIUM';
  if (sensor.state === 'ABNORMAL') return 'MEDIUM';
  return 'LOW';
}

function formatDeviation(dev) {
  if (dev == null) return '—';
  const sign = dev > 0 ? '+' : '';
  return `${sign}${dev.toFixed(2)}σ`;
}

function formatTrend(slope) {
  if (slope == null) return '—';
  if (Math.abs(slope) < 1e-4) return 'Stable';
  const dirIcon = slope > 0 ? '↑' : '↓';
  const dirText = slope > 0 ? 'increasing' : 'decreasing';
  return (
    <span className="flex items-center gap-1">
      <span className="font-mono text-[10px]">{dirIcon}</span> {dirText}
    </span>
  );
}

function generateEvidenceText(sensor) {
  if (!sensor || sensor.state === 'UNKNOWN') {
    return "Health classification is unavailable because the backend did not provide sufficient classification evidence.";
  }
  if (sensor.state === 'NORMAL') {
    return "No persistent anomaly was detected in the recent observation window.";
  }
  if (sensor.state === 'DEGRADING') {
    return "Persistent anomalous behaviour was observed over the recent window. The sensor trend is aligning with the historical degradation direction.";
  }
  if (sensor.state === 'ABNORMAL') {
    return "The sensor has remained anomalous across the recent observation window, but the current trend does not provide enough evidence to classify it as degrading.";
  }
  return "Insufficient data.";
}

/* ── Deep Inspection Drawer ──────────────────────────────────────────────── */
function SensorDrawer({ sensor, unitNumber, history, onClose }) {
  if (!sensor) return null;
  
  const level = getAttentionLevel(sensor);
  const evidenceText = generateEvidenceText(sensor);
  
  // Prepare history data
  const chartData = history?.filter(r => r[sensor.sensor] != null) || [];

  return (
    <div 
      className="absolute top-0 right-0 w-full md:w-[450px] h-full bg-white/70 border-l border-white/80 shadow-[-12px_0_40px_rgba(0,0,0,0.04)] overflow-y-auto flex flex-col z-10 transition-transform duration-300"
      style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className="px-6 py-5 border-b border-borderLight flex items-center justify-between sticky top-0 bg-white/50 backdrop-blur-md z-20">
        <div>
          <h3 className="text-lg font-bold font-mono text-textPrimary">{sensor.sensor}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs ${stateColors(sensor.state)}`}>{sensor.state}</span>
            <span className="text-xs text-textMuted">·</span>
            <span className="text-xs text-textSecondary">{level} attention</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors text-textMuted">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-8">
        
        {/* Evidence Metrics */}
        <div>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-4">Current Evidence</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-borderLight/50">
              <span className="text-sm text-textSecondary">Persistence</span>
              <span className="text-sm font-medium text-textPrimary">{sensor.persistence != null ? `${Math.round(sensor.persistence * 100)}%` : '—'}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-borderLight/50">
              <span className="text-sm text-textSecondary">Trend</span>
              <span className="text-sm font-medium text-textPrimary">{formatTrend(sensor.slope)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-borderLight/50">
              <span className="text-sm text-textSecondary">Deviation</span>
              <span className="text-sm font-medium text-textPrimary">{formatDeviation(sensor.normalized_deviation)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-borderLight/50">
              <span className="text-sm text-textSecondary">Anomaly Score</span>
              <span className="text-sm font-medium text-textPrimary">{sensor.anomaly_score != null ? sensor.anomaly_score.toFixed(3) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Why flagged */}
        <div>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-3">Why is this flagged?</p>
          <p className="text-sm text-textSecondary leading-relaxed bg-white/60 p-4 rounded-xl border border-white/80 shadow-subtle">
            {evidenceText}
          </p>
        </div>

        {/* History Chart */}
        <div>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-3">Sensor History</p>
          <div className="bg-white/60 p-4 rounded-xl border border-white/80 shadow-subtle h-56 flex flex-col">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E5" vertical={false} />
                  <XAxis 
                    dataKey="time_cycles" 
                    tick={{ fontSize: 10, fill: '#929292' }} 
                    axisLine={false} tickLine={false} 
                    tickFormatter={(v, i) => i === 0 || i === chartData.length - 1 ? `Cycle ${v}` : ''}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#929292' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E7E7E5', fontSize: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    formatter={(v) => [typeof v === 'number' ? v.toFixed(4) : v, 'Value']}
                    labelFormatter={(l) => `Cycle ${l}`}
                  />
                  <Line
                    type="monotone" dataKey={sensor.sensor}
                    stroke="#181818" strokeWidth={2}
                    dot={false} activeDot={{ r: 4, fill: '#181818', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-textMuted">No history available</div>
            )}
            <div className="mt-2 text-center">
              <span className="text-[10px] text-textMuted bg-borderSecondary/30 px-2 py-0.5 rounded-full">Observed data only</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Main Page Component ─────────────────────────────────────────────────── */
export default function AssetHealthPage({ engineContext }) {
  const { enginesLoading, engineSensorsById, sensorHistoryById, fetchEngineData } = useContext(AppDataContext);
  const [inspectingSensor, setInspectingSensor] = useState(null);

  useEffect(() => {
    if (engineContext) {
      fetchEngineData(engineContext);
    }
  }, [engineContext, fetchEngineData]);

  // Reset inspected sensor when changing engines
  useEffect(() => {
    setInspectingSensor(null);
  }, [engineContext]);

  if (enginesLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 text-textMuted animate-spin" /></div>;
  }
  if (!engineContext) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-borderLight">
        <p className="text-base font-semibold text-textPrimary mb-1">No Engine Selected</p>
      </div>
    );
  }

  const sensors = engineSensorsById[engineContext] || [];
  const history = sensorHistoryById[engineContext] || [];

  // Group and sort sensors
  const normal = [];
  const degrading = [];
  const abnormal = [];
  const unknown = [];

  sensors.forEach(s => {
    if (s.state === 'NORMAL') normal.push(s);
    else if (s.state === 'DEGRADING') degrading.push(s);
    else if (s.state === 'ABNORMAL') abnormal.push(s);
    else unknown.push(s);
  });

  const requiresAttentionCount = degrading.length + abnormal.length;

  // Sorting logic for ranking table:
  // 1. Degrading (High -> Medium -> Low)
  // 2. Abnormal (High -> Medium -> Low)
  // 3. Normal
  const sortedIssues = [...degrading, ...abnormal].sort((a, b) => {
    const levelOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNAVAILABLE': 0 };
    return levelOrder[getAttentionLevel(b)] - levelOrder[getAttentionLevel(a)];
  });

  return (
    <div className="relative min-h-[75vh] flex flex-col gap-6 -m-4 p-4" style={{ background: '#F7F7F5' }}>
      
      {/* Drawer overlay */}
      {inspectingSensor && (
        <div className="absolute inset-0 z-30 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-sm z-0" onClick={() => setInspectingSensor(null)} />
        <SensorDrawer 
            sensor={inspectingSensor} 
            unitNumber={engineContext} 
            history={history}
            onClose={() => setInspectingSensor(null)} 
          />
        </div>
      )}

      {/* Top Header & Selector */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary mb-1">Unit {engineContext}</h2>
          <p className="text-sm text-textSecondary">Sensor Health Investigation</p>
        </div>
      </div>

      {/* Health Overview */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-textMuted" />
          <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">Overall sensor condition</p>
        </div>
        
        {sensors.length > 0 ? (
          <>
            <h3 className={`text-lg font-bold mb-1 ${requiresAttentionCount > 0 ? 'text-[#EF4444]' : 'text-textPrimary'}`}>
              {requiresAttentionCount > 0 ? 'Attention required' : 'Optimal'}
            </h3>
            <p className="text-sm text-textSecondary mb-4">
              {requiresAttentionCount} sensors require inspection
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-sm font-medium text-[#F59E0B]">{degrading.length} Degrading</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-sm font-medium text-[#EF4444]">{abnormal.length} Abnormal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-sm text-textSecondary">{normal.length} Normal</span>
              </div>
            </div>
            
            {/* Horizontal Bar */}
            <div className="w-full h-1.5 flex rounded-full overflow-hidden mt-6 bg-borderSecondary/30">
              {degrading.length > 0 && <div style={{ width: `${(degrading.length/sensors.length)*100}%` }} className="bg-[#F59E0B]" />}
              {abnormal.length > 0 && <div style={{ width: `${(abnormal.length/sensors.length)*100}%` }} className="bg-[#EF4444]" />}
              {normal.length > 0 && <div style={{ width: `${(normal.length/sensors.length)*100}%` }} className="bg-[#10B981]" />}
              {unknown.length > 0 && <div style={{ width: `${(unknown.length/sensors.length)*100}%` }} className="bg-borderSecondary" />}
            </div>
          </>
        ) : (
          <div className="py-2">
            <h3 className="text-sm font-medium text-textPrimary">Classification unavailable</h3>
            <p className="text-xs text-textSecondary mt-1">No sensor-state evidence has been returned by the backend.</p>
          </div>
        )}
      </div>

      {/* Sensor Attention Ranking */}
      {sensors.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-borderLight/50">
            <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">Sensor Attention</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-borderLight/50">
                  <th className="px-6 py-3 text-[10px] font-semibold text-textMuted uppercase tracking-wider">Sensor</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-textMuted uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-textMuted uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-textMuted uppercase tracking-wider">Persistence</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-textMuted uppercase tracking-wider">Trend</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-textMuted uppercase tracking-wider">Deviation</th>
                  <th className="px-6 py-3 text-[10px] font-semibold text-textMuted uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLight/30">
                {/* 1. Issues first */}
                {sortedIssues.map((s) => (
                  <tr 
                    key={s.sensor} 
                    className="hover:bg-black/[0.02] transition-colors cursor-pointer group"
                    onClick={() => setInspectingSensor(s)}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-textPrimary">{s.sensor}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusIndicator state={s.state} />
                        <span className={`text-xs ${stateColors(s.state)}`}>{s.state}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold ${getAttentionLevel(s) === 'HIGH' ? 'text-[#EF4444]' : getAttentionLevel(s) === 'MEDIUM' ? 'text-[#F59E0B]' : 'text-textMuted'}`}>
                        {getAttentionLevel(s)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-textSecondary tabular-nums">{s.persistence != null ? `${Math.round(s.persistence * 100)}%` : '—'}</td>
                    <td className="px-6 py-4 text-xs text-textSecondary">{formatTrend(s.slope)}</td>
                    <td className="px-6 py-4 text-xs text-textSecondary tabular-nums">{formatDeviation(s.normalized_deviation)}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-medium text-textSecondary group-hover:text-textPrimary transition-colors flex items-center justify-end gap-1 w-full">
                        Inspect <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* 2. Normal sensors */}
                {normal.map((s) => (
                  <tr 
                    key={s.sensor} 
                    className="hover:bg-black/[0.02] transition-colors cursor-pointer group"
                    onClick={() => setInspectingSensor(s)}
                  >
                    <td className="px-6 py-3 text-sm font-mono text-textPrimary">{s.sensor}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <StatusIndicator state={s.state} />
                        <span className={`text-xs ${stateColors(s.state)}`}>{s.state}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs text-textMuted">{getAttentionLevel(s)}</td>
                    <td className="px-6 py-3 text-xs text-textSecondary tabular-nums">{s.persistence != null ? `${Math.round(s.persistence * 100)}%` : '—'}</td>
                    <td className="px-6 py-3 text-xs text-textSecondary">{formatTrend(s.slope)}</td>
                    <td className="px-6 py-3 text-xs text-textSecondary tabular-nums">{formatDeviation(s.normalized_deviation)}</td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-xs font-medium text-borderSecondary group-hover:text-textSecondary transition-colors flex items-center justify-end gap-1 w-full">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 3. Unknown Sensors collapsed */}
          {unknown.length > 0 && (
            <div className="px-6 py-4 bg-borderLight/20 border-t border-borderLight/50">
              <p className="text-xs text-textMuted">
                {unknown.length} sensor{unknown.length > 1 ? 's' : ''} without health classification.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
