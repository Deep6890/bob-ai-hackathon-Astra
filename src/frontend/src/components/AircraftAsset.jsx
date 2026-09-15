import { Shield, AlertTriangle, XCircle, CheckCircle2, Radio } from 'lucide-react'

function HealthBar({ value }) {
  const color = value >= 90 ? 'bg-green-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
    </div>
  )
}

function ComponentIndicator({ label, value, icon: Icon, status }) {
  const statusColor = status === 'ok' ? 'text-green-600 bg-green-50' : status === 'warning' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
  const dotColor = status === 'ok' ? 'bg-green-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${statusColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-700">{label}</p>
          <p className="text-[10px] text-slate-400">{value}</p>
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
    </div>
  )
}

export default function AircraftAsset() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-aviation-600" />
            <span className="text-[10px] font-semibold tracking-widest text-aviation-600 uppercase">Asset Detail</span>
          </div>
          <h3 className="text-2xl font-bold text-navy-900">F-102</h3>
          <p className="text-sm text-slate-500">Fighter Aircraft</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-semibold text-green-700">Mission Ready</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 mb-5 min-h-[180px] relative overflow-hidden">
        <svg viewBox="0 0 200 120" className="w-full max-w-xs opacity-90">
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3355d9" />
              <stop offset="100%" stopColor="#1a2e77" />
            </linearGradient>
            <linearGradient id="wingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5276e8" />
              <stop offset="100%" stopColor="#3355d9" />
            </linearGradient>
          </defs>
          <ellipse cx="100" cy="60" rx="80" ry="8" fill="rgba(51,85,217,0.08)" />
          <path d="M30 60 L170 60 L160 56 L40 56 Z" fill="url(#bodyGrad)" opacity="0.9" />
          <path d="M55 60 L95 60 L85 25 L50 25 Z" fill="url(#bodyGrad)" opacity="0.85" />
          <path d="M105 60 L145 60 L135 25 L110 25 Z" fill="url(#bodyGrad)" opacity="0.85" />
          <path d="M75 60 L82 55 L90 60 Z" fill="url(#bodyGrad)" opacity="0.9" />
          <path d="M120 60 L127 55 L135 60 Z" fill="url(#bodyGrad)" opacity="0.9" />
          <path d="M85 58 L50 30 L45 32 L82 58 Z" fill="url(#wingGrad)" opacity="0.7" />
          <path d="M115 58 L150 30 L155 32 L125 58 Z" fill="url(#wingGrad)" opacity="0.7" />
          <path d="M85 58 L55 85 L52 82 L82 58 Z" fill="url(#wingGrad)" opacity="0.5" />
          <path d="M115 58 L145 85 L148 82 L125 58 Z" fill="url(#wingGrad)" opacity="0.5" />
          <circle cx="50" cy="62" r="3" fill="#1a2e77" opacity="0.6" />
          <circle cx="100" cy="62" r="3" fill="#1a2e77" opacity="0.6" />
          <circle cx="150" cy="62" r="3" fill="#1a2e77" opacity="0.6" />
          <circle cx="90" cy="25" r="2" fill="#7894f2" />
          <circle cx="115" cy="25" r="2" fill="#7894f2" />
          <line x1="90" y1="25" x2="115" y2="25" stroke="#7894f2" strokeWidth="1" opacity="0.5" />
          <line x1="100" y1="60" x2="100" y2="18" stroke="#7894f2" strokeWidth="0.8" opacity="0.4" strokeDasharray="2 2" />
          <circle cx="100" cy="16" r="2" fill="#3355d9" opacity="0.5" />
        </svg>
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-aviation-500" />
          <span className="text-[10px] font-medium text-slate-400 tracking-wide">TELEMETRY ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ComponentIndicator label="Engine" value="94% Health" icon={Shield} status="ok" />
        <ComponentIndicator label="Hydraulics" value="89% Health" icon={Shield} status="ok" />
        <ComponentIndicator label="Avionics" value="91% Health" icon={Shield} status="ok" />
        <ComponentIndicator label="Fuel System" value="87% Health" icon={Shield} status="ok" />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Overall Health Score</span>
          <span className="text-sm font-bold text-navy-900">92%</span>
        </div>
        <HealthBar value={92} />
      </div>
    </div>
  )
}