import { Activity, Gauge } from 'lucide-react'

function SystemBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 shrink-0 w-24">
        <Activity className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{value}%</span>
    </div>
  )
}

export default function AssetHealth() {
  const systems = [
    { label: 'Engine', value: 94, color: 'bg-green-500' },
    { label: 'Hydraulics', value: 89, color: 'bg-green-500' },
    { label: 'Avionics', value: 91, color: 'bg-green-500' },
    { label: 'Fuel System', value: 87, color: 'bg-green-500' },
    { label: 'Landing Gear', value: 96, color: 'bg-green-500' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <Gauge className="w-4 h-4 text-aviation-600" />
        <span className="text-[10px] font-semibold tracking-widest text-aviation-600 uppercase">Asset Health</span>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-4">
        {systems.map((sys) => (
          <SystemBar
            key={sys.label}
            label={sys.label}
            value={sys.value}
            color={sys.color}
          />
        ))}
      </div>
    </div>
  )
}