import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts'
import { TrendingUp, AlertTriangle, Brain, Zap, Shield } from 'lucide-react'

const riskData = [
  { month: 'Jan', actual: 8, predicted: 10 },
  { month: 'Feb', actual: 12, predicted: 14 },
  { month: 'Mar', actual: 15, predicted: 13 },
  { month: 'Apr', actual: 10, predicted: 11 },
  { month: 'May', actual: 7, predicted: 9 },
  { month: 'Jun', actual: 11, predicted: 8 },
  { month: 'Jul', actual: 14, predicted: 12 },
  { month: 'Aug', actual: 9, predicted: 11 },
  { month: 'Sep', actual: 6, predicted: 7 },
  { month: 'Oct', actual: 13, predicted: 10 },
  { month: 'Nov', actual: 8, predicted: 9 },
  { month: 'Dec', actual: 5, predicted: 6 },
]

const componentRisk = [
  { name: 'Engine', risk: 28 },
  { name: 'Hydraulics', risk: 42 },
  { name: 'Avionics', risk: 15 },
  { name: 'Fuel System', risk: 35 },
  { name: 'Landing Gear', risk: 10 },
]

const factors = [
  { factor: 'Engine vibration anomaly', probability: 78, severity: 'High' },
  { factor: 'Hydraulic pressure variance', probability: 65, severity: 'High' },
  { factor: 'Fuel system degradation', probability: 52, severity: 'Medium' },
  { factor: 'Avionics software drift', probability: 31, severity: 'Medium' },
  { factor: 'Landing gear wear pattern', probability: 18, severity: 'Low' },
  { factor: 'Battery cell imbalance', probability: 44, severity: 'Medium' },
]

export default function PredictiveInsights() {
  const [period, setPeriod] = useState('12M')
  const filteredRiskData = riskData.slice(period === '1M' ? -1 : period === '3M' ? -3 : period === '6M' ? -6 : -12)

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span className="text-xs text-slate-500">Total Risk Score</span>
          </div>
          <p className="text-3xl font-bold text-navy-900">34%</p>
          <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +5% from last month</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">Predicted Failures</span>
          </div>
          <p className="text-3xl font-bold text-navy-900">7</p>
          <p className="text-[11px] text-slate-400 mt-1">Within 90 days</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-aviation-600" />
            <span className="text-xs text-slate-500">AI Confidence</span>
          </div>
          <p className="text-3xl font-bold text-navy-900">96%</p>
          <p className="text-[11px] text-green-600 mt-1">Model accuracy</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500">High-Risk Assets</span>
          </div>
          <p className="text-3xl font-bold text-navy-900">3</p>
          <p className="text-[11px] text-slate-400 mt-1">Require attention</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-aviation-600" />
              <span className="text-sm font-semibold text-navy-900">Risk Trend Analysis</span>
            </div>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {['1M', '3M', '6M', '12M'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    period === p ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredRiskData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3355d9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3355d9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="riskPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7894f2" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7894f2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', padding: '8px 12px' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-2 text-xs">
                          <p className="font-medium text-slate-700 mb-1">{payload[0].payload.month}</p>
                          {payload.map((p) => (
                            <p key={p.dataKey} style={{ color: p.color }}>
                              {p.dataKey === 'actual' ? 'Actual: ' : 'Predicted: '}
                              {p.value}%
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area type="monotone" dataKey="actual" stroke="#3355d9" strokeWidth={2} fill="url(#riskActual)" name="Actual Risk" dot={{ r: 3, fill: '#3355d9', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="predicted" stroke="#7894f2" strokeWidth={2} strokeDasharray="6 3" fill="url(#riskPredicted)" name="Predicted Risk" dot={{ r: 3, fill: '#7894f2', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-aviation-600 rounded" />
              <span className="text-[11px] text-slate-500">Actual Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-aviation-300 rounded" />
              <span className="text-[11px] text-slate-500">Predicted Risk</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-aviation-600" />
            <span className="text-sm font-semibold text-navy-900">Component Risk</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={componentRisk} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="risk" radius={[0, 4, 4, 0]} barSize={16}>
                  {componentRisk.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk >= 40 ? '#ef4444' : entry.risk >= 25 ? '#f59e0b' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-aviation-600" />
          <span className="text-sm font-semibold text-navy-900">Top Failure Factors</span>
        </div>
        <div className="space-y-3">
          {factors.map((f) => (
            <div key={f.factor} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{f.factor}</p>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${f.severity === 'High' ? 'bg-red-500' : f.severity === 'Medium' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${f.probability}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-navy-900">{f.probability}%</p>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                  f.severity === 'High' ? 'bg-red-50 text-red-700' : f.severity === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                }`}>
                  {f.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}