import { useState } from 'react'
import { Search, Filter, Plane, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Heart, TrendingDown, Clock } from 'lucide-react'

const aircraft = [
  { id: 'F-102', type: 'Fighter Aircraft', health: 92, risk: 'Low', status: 'Mission Ready', missions: 142, flightHours: 2840, lastMaintained: 'Oct 12, 2026', nextInspection: 'Nov 28, 2026' },
  { id: 'F-118', type: 'Fighter Aircraft', health: 78, risk: 'High', status: 'At Risk', missions: 98, flightHours: 1920, lastMaintained: 'Sep 28, 2026', nextInspection: 'Dec 03, 2026' },
  { id: 'F-204', type: 'Fighter Aircraft', health: 71, risk: 'High', status: 'At Risk', missions: 87, flightHours: 1750, lastMaintained: 'Sep 15, 2026', nextInspection: 'Dec 12, 2026' },
  { id: 'F-307', type: 'Transport Aircraft', health: 95, risk: 'Low', status: 'Mission Ready', missions: 203, flightHours: 4100, lastMaintained: 'Oct 05, 2026', nextInspection: 'Jan 05, 2027' },
  { id: 'F-410', type: 'Transport Aircraft', health: 88, risk: 'Medium', status: 'Mission Ready', missions: 156, flightHours: 3200, lastMaintained: 'Oct 18, 2026', nextInspection: 'Dec 22, 2026' },
  { id: 'F-505', type: 'Reconnaissance', health: 91, risk: 'Low', status: 'Mission Ready', missions: 67, flightHours: 1340, lastMaintained: 'Oct 20, 2026', nextInspection: 'Dec 18, 2026' },
  { id: 'F-612', type: 'Fighter Aircraft', health: 65, risk: 'Critical', status: 'Critical', missions: 45, flightHours: 1100, lastMaintained: 'Aug 30, 2026', nextInspection: 'Nov 15, 2026' },
  { id: 'F-720', type: 'Transport Aircraft', health: 93, risk: 'Low', status: 'Mission Ready', missions: 178, flightHours: 3560, lastMaintained: 'Oct 01, 2026', nextInspection: 'Dec 28, 2026' },
]

function StatusBadge({ status }) {
  if (status === 'Mission Ready') return <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wide">Mission Ready</span>
  if (status === 'At Risk') return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wide">At Risk</span>
  return <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-wide">Critical</span>
}

export default function FleetPage() {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = aircraft.filter((a) => {
    const matchSearch = a.id.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || a.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search aircraft..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent w-full max-w-sm placeholder:text-slate-400"
          />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-0.5">
          {['All', 'Mission Ready', 'At Risk', 'Critical'].map((f) => (
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

      {selected && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-navy-900">{selected.id}</h3>
              <p className="text-sm text-slate-500">{selected.type}</p>
            </div>
            <button onClick={() => setSelected(null)} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              Close
            </button>
          </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-xs text-slate-500">Health Score</span>
              </div>
              <p className="text-2xl font-bold text-navy-900">{selected.health}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-aviation-500" />
                <span className="text-xs text-slate-500">Failure Risk</span>
              </div>
              <p className="text-2xl font-bold text-navy-900">{selected.risk}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">Missions</span>
              </div>
              <p className="text-2xl font-bold text-navy-900">{selected.missions}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">Flight Hours</span>
              </div>
              <p className="text-2xl font-bold text-navy-900">{selected.flightHours}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Last Maintained</p>
              <p className="text-sm font-medium text-slate-700">{selected.lastMaintained}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Next Inspection</p>
              <p className="text-sm font-medium text-slate-700">{selected.nextInspection}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Status</p>
              <StatusBadge status={selected.status} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-5">
        {filtered.map((asset) => (
          <button
            key={asset.id}
            onClick={() => setSelected(asset)}
            className="text-left bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-navy-900">{asset.id}</span>
              <StatusBadge status={asset.status} />
            </div>
            <p className="text-xs text-slate-500 mb-4">{asset.type}</p>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Health</span>
                <span className="text-xs font-bold text-slate-600">{asset.health}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${asset.health >= 90 ? 'bg-green-500' : asset.health >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${asset.health}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              {asset.risk === 'Low' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : asset.risk === 'Medium' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
              <span className="text-[11px] text-slate-500">Failure Risk: {asset.risk}</span>
            </div>

            <div className="flex items-center gap-1 mt-2 text-[11px] text-aviation-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View Details <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}