import { useState } from 'react'
import { Search, Wrench, Clock, AlertTriangle, CheckCircle2, Filter, ArrowRight, Calendar } from 'lucide-react'

const maintenanceItems = [
  { id: 'M-001', asset: 'F-102', task: 'Engine inspection', reason: 'Scheduled 500hr service', action: 'Run full diagnostic suite', downtime: '4 hours', priority: 'Scheduled', status: 'Pending' },
  { id: 'M-002', asset: 'F-118', task: 'Hydraulic pressure repair', reason: 'Pressure drop in system B', action: 'Replace hydraulic pump assembly', downtime: '6 hours', priority: 'Critical', status: 'In Progress' },
  { id: 'M-003', asset: 'F-204', task: 'Battery system overhaul', reason: 'Degradation above threshold', action: 'Replace battery cells and BMS', downtime: '3 hours', priority: 'High', status: 'Pending' },
  { id: 'M-004', asset: 'F-612', task: 'Emergency engine diagnostic', reason: 'Vibration anomaly detected', action: 'Inspect turbine blades and mounts', downtime: '8 hours', priority: 'Critical', status: 'Queued' },
  { id: 'M-005', asset: 'F-307', task: 'Avionics software update', reason: 'Firmware patch required', action: 'Deploy verified update package', downtime: '2 hours', priority: 'Scheduled', status: 'Pending' },
  { id: 'M-006', asset: 'F-410', task: 'Landing gear servicing', reason: 'Routine wear inspection', action: 'Inspect and lubricate gear mechanisms', downtime: '5 hours', priority: 'Medium', status: 'Pending' },
  { id: 'M-007', asset: 'F-505', task: 'Fuel system cleaning', reason: 'Contamination detected', action: 'Flush fuel lines and replace filters', downtime: '3 hours', priority: 'Medium', status: 'Queued' },
  { id: 'M-008', asset: 'F-720', task: 'Hydraulic fluid replacement', reason: 'Scheduled maintenance cycle', action: 'Drain and refill with spec fluid', downtime: '2 hours', priority: 'Scheduled', status: 'Pending' },
]

const priorityConfig = {
  Critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  High: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
}

export default function MaintenancePage() {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [resolved, setResolved] = useState(new Set())

  const filtered = maintenanceItems.filter((item) => {
    const matchFilter = filter === 'All' || item.priority === filter
    const matchSearch = item.asset.toLowerCase().includes(search.toLowerCase()) || item.task.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch && !resolved.has(item.id)
  })

  const activeCount = maintenanceItems.filter((i) => i.priority === 'Critical' && !resolved.has(i.id)).length
  const highCount = maintenanceItems.filter((i) => i.priority === 'High' && !resolved.has(i.id)).length

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search maintenance..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent w-full max-w-sm placeholder:text-slate-400"
            />
          </div>
          <div className="flex bg-white border border-slate-200 rounded-xl p-0.5">
            {['All', 'Critical', 'High', 'Medium', 'Scheduled'].map((f) => (
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
            <span className="text-xs font-bold text-red-700">{activeCount} Critical</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs font-bold text-orange-700">{highCount} High</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Asset</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Task</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Reason</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Recommended Action</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Downtime</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Priority</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No maintenance items match your filters</td>
                </tr>
              ) : filtered.map((item) => {
                const pc = priorityConfig[item.priority]
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-navy-900">{item.asset}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">{item.task}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.reason}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px]">{item.action}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.downtime}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${pc.bg} ${pc.text}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">{item.status}</span>
                        <button
                          onClick={() => setResolved((prev) => new Set([...prev, item.id]))}
                          className="p-1 hover:bg-green-50 rounded transition-colors"
                          title="Resolve"
                        >
                          <CheckCircle2 className="w-4 h-4 text-slate-300 hover:text-green-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}