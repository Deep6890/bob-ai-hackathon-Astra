import { AlertTriangle, ChevronRight, ShieldAlert } from 'lucide-react'

const alerts = [
  {
    asset: 'F-102',
    component: 'Engine',
    severity: 'critical',
    detail: 'Vibration levels exceeding threshold',
    time: '12m ago',
  },
  {
    asset: 'F-118',
    component: 'Hydraulics',
    severity: 'high',
    detail: 'Pressure drop detected in system B',
    time: '47m ago',
  },
  {
    asset: 'F-204',
    component: 'Battery',
    severity: 'medium',
    detail: 'Degradation rate above normal',
    time: '2h ago',
  },
]

export default function CriticalAlerts() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-aviation-600" />
          <span className="text-[10px] font-semibold tracking-widest text-aviation-600 uppercase">Critical Alerts</span>
        </div>
        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">3</span>
      </div>

      <div className="flex-1 flex flex-col gap-3 overflow-auto">
        {alerts.map((alert) => (
          <div
            key={`${alert.asset}-${alert.component}`}
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              alert.severity === 'critical' ? 'bg-red-50' : alert.severity === 'high' ? 'bg-amber-50' : 'bg-yellow-50'
            }`}>
              <AlertTriangle className={`w-4 h-4 ${
                alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'high' ? 'text-amber-500' : 'text-yellow-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">{alert.asset}</p>
                <span className="text-[10px] text-slate-400">{alert.time}</span>
              </div>
              <p className="text-xs text-slate-500">{alert.component}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{alert.detail}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  )
}