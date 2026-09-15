import { Layers, Plane, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

export default function FleetOverview() {
  const stats = [
    { label: 'Total Assets', value: '28', icon: Layers, color: 'text-navy-900' },
    { label: 'Mission Ready', value: '24', icon: CheckCircle2, color: 'text-green-600' },
    { label: 'At Risk', value: '3', icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Critical', value: '1', icon: XCircle, color: 'text-red-600' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Plane className="w-4 h-4 text-aviation-600" />
        <span className="text-[10px] font-semibold tracking-widest text-aviation-600 uppercase">Fleet</span>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Icon className={`w-5 h-5 mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
              <p className="text-[11px] text-slate-500">{stat.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}