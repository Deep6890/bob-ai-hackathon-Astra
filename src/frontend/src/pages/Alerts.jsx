import { useState } from 'react'
import { Search, Filter, Bell, CheckCircle2, XCircle, ChevronRight, AlertTriangle, ShieldAlert, Info, Clock } from 'lucide-react'

const alertsData = [
  { id: 'A-001', asset: 'F-102', component: 'Engine', type: 'Critical', message: 'Vibration levels exceeding threshold — 6.2 Hz above baseline', detail: 'Engine vibration has been trending upward for 72 hours. Current reading of 6.2 Hz exceeds the 3.0 Hz operational limit. Root cause analysis suggests bearing wear in turbine assembly.', time: '12m ago', resolved: false },
  { id: 'A-002', asset: 'F-118', component: 'Hydraulics', type: 'Critical', message: 'Pressure drop detected in system B', detail: 'Hydraulic pressure in system B has dropped 22% from baseline. Potential seal failure in line 7. Recommend immediate inspection before next mission cycle.', time: '47m ago', resolved: false },
  { id: 'A-003', asset: 'F-204', component: 'Battery', type: 'Warning', message: 'Battery degradation rate above normal parameters', detail: 'Battery cell #3 showing 18% degradation over 30 days, nearly double the expected rate. Thermal imaging shows hot spot at 44.5C.', time: '2h ago', resolved: false },
  { id: 'A-004', asset: 'F-612', component: 'Avionics', type: 'Critical', message: 'Navigation system intermittent failure', detail: 'GPS unit exhibiting signal drops every 8-12 minutes. Backup system active but primary navigation compromised. Possible antenna connector corrosion.', time: '3h ago', resolved: false },
  { id: 'A-005', asset: 'F-410', component: 'Fuel System', type: 'Warning', message: 'Fuel consumption higher than predicted', detail: 'Fuel flow rate 12% above predicted for current operating profile. Possible fuel line leak or injector malfunction.', time: '5h ago', resolved: false },
  { id: 'A-006', asset: 'F-307', component: 'Landing Gear', type: 'Warning', message: 'Slow gear deployment detected', detail: 'Gear deployment time 1.8 seconds longer than baseline. Hydraulic actuator response time degraded.', time: '8h ago', resolved: false },
  { id: 'A-007', asset: 'F-505', component: 'Engine', type: 'Resolved', message: 'Oil temperature fluctuation resolved', detail: 'Oil temperature was oscillating between 95-110C. Root cause: faulty thermocouple. Sensor replaced and temperatures normalized.', time: '1d ago', resolved: true },
  { id: 'A-008', asset: 'F-720', component: 'Avionics', type: 'Resolved', message: 'Communication link intermittent issue resolved', detail: 'Radio transponder was dropping signals during handoff. Firmware patch applied successfully.', time: '2d ago', resolved: true },
  { id: 'A-009', asset: 'F-102', component: 'Fuel System', type: 'Resolved', message: 'Fuel filter restriction cleared', detail: 'Fuel filter showed 73% restriction. Filter replaced and fuel system flushed. No further restrictions detected.', time: '3d ago', resolved: true },
]

const typeConfig = {
  Critical: { icon: ShieldAlert, bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', iconColor: 'text-red-500' },
  Warning: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', iconColor: 'text-amber-500' },
  Resolved: { icon: CheckCircle2, bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', iconColor: 'text-green-500' },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(alertsData)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  const filtered = alerts.filter((a) => {
    const matchFilter = filter === 'All' || a.type === filter
    const matchSearch = a.asset.toLowerCase().includes(search.toLowerCase()) || a.component.toLowerCase().includes(search.toLowerCase()) || a.message.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const resolveAlert = (id) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true, type: 'Resolved', message: a.message + ' — Resolved by operator' } : a))
  }

  const criticalCount = alerts.filter((a) => a.type === 'Critical' && !a.resolved).length
  const warningCount = alerts.filter((a) => a.type === 'Warning' && !a.resolved).length

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent w-full max-w-sm placeholder:text-slate-400"
            />
          </div>
          <div className="flex bg-white border border-slate-200 rounded-xl p-0.5">
            {['All', 'Critical', 'Warning', 'Resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === f ? 'bg-aviation-50 text-aviation-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-red-700">{criticalCount} Critical</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-amber-700">{warningCount} Warning</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((alert) => {
          const tc = typeConfig[alert.type]
          const Icon = tc.icon
          const isExpanded = expanded === alert.id

          return (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border ${alert.resolved ? 'border-slate-100 opacity-65' : 'border-slate-200'} p-4 shadow-sm hover:shadow-md transition-all`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tc.bg}`}>
                  <Icon className={`w-4 h-4 ${tc.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-navy-900">{alert.asset}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${tc.bg} ${tc.text}`}>
                      {alert.type}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium">{alert.component}</span>
                  </div>
                  <p className="text-sm text-slate-700">{alert.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {alert.time}
                  </p>

                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-600 leading-relaxed">{alert.detail}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : alert.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {!alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Resolve"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No alerts match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}