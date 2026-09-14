import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Sparkles } from 'lucide-react'

const data = [
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

export default function FailureRisk() {
  const [period, setPeriod] = useState('12M')

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-aviation-600" />
          <span className="text-[10px] font-semibold tracking-widest text-aviation-600 uppercase">Failure Risk Prediction</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-aviation-500" />
          <span className="text-xs text-slate-400">AI Forecast</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
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

      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3355d9" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3355d9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
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
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#3355d9"
              strokeWidth={2}
              fill="url(#actualGrad)"
              name="Actual Risk"
              dot={{ r: 3, fill: '#3355d9', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#3355d9', strokeWidth: 2, stroke: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#7894f2"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#predictedGrad)"
              name="Predicted Risk"
              dot={{ r: 3, fill: '#7894f2', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#7894f2', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-aviation-600 rounded" />
          <span className="text-[11px] text-slate-500">Actual Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-aviation-300 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #7894f2, #7894f2 3px, transparent 3px, transparent 6px)' }} />
          <span className="text-[11px] text-slate-500">Predicted Risk</span>
        </div>
      </div>
    </div>
  )
}