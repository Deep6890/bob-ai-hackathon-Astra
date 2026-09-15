import { useState } from 'react'
import { Search, Filter, Activity, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Calendar, Gauge, Wrench, Radio } from 'lucide-react'

const assets = [
  { id: 'F-102', type: 'Fighter Aircraft', health: 92, risk: 'Low', status: 'Mission Ready', lastMaintenance: 'Oct 12, 2026', nextInspection: 'Nov 28, 2026', engine: 94, hydraulics: 89, avionics: 91, fuel: 87, landingGear: 96 },
  { id: 'F-118', type: 'Fighter Aircraft', health: 78, risk: 'High', status: 'At Risk', lastMaintenance: 'Sep 28, 2026', nextInspection: 'Dec 03, 2026', engine: 72, hydraulics: 65, avionics: 88, fuel: 82, landingGear: 85 },
  { id: 'F-204', type: 'Fighter Aircraft', health: 71, risk: 'High', status: 'At Risk', lastMaintenance: 'Sep 15, 2026', nextInspection: 'Dec 12, 2026', engine: 75, hydraulics: 68, avionics: 80, fuel: 62, landingGear: 79 },
  { id: 'F-307', type: 'Transport Aircraft', health: 95, risk: 'Low', status: 'Mission Ready', lastMaintenance: 'Oct 05, 2026', nextInspection: 'Jan 05, 2027', engine: 96, hydraulics: 93, avionics: 95, fuel: 94, landingGear: 96 },
  { id: 'F-410', type: 'Transport Aircraft', health: 88, risk: 'Medium', status: 'Mission Ready', lastMaintenance: 'Oct 18, 2026', nextInspection: 'Dec 22, 2026', engine: 90, hydraulics: 84, avionics: 89, fuel: 86, landingGear: 92 },
  { id: 'F-505', type: 'Reconnaissance', health: 91, risk: 'Low', status: 'Mission Ready', lastMaintenance: 'Oct 20, 2026', nextInspection: 'Dec 18, 2026', engine: 92, hydraulics: 88, avionics: 94, fuel: 89, landingGear: 90 },
  { id: 'F-612', type: 'Fighter Aircraft', health: 65, risk: 'Critical', status: 'Critical', lastMaintenance: 'Aug 30, 2026', nextInspection: 'Nov 15, 2026', engine: 58, hydraulics: 55, avionics: 78, fuel: 60, landingGear: 70 },
  { id: 'F-720', type: 'Transport Aircraft', health: 93, risk: 'Low', status: 'Mission Ready', lastMaintenance: 'Oct 01, 2026', nextInspection: 'Dec 28, 2026', engine: 94, hydraulics: 91, avionics: 93, fuel: 92, landingGear: 95 },
]

function HealthBar({ value }) {
  const color = value >= 90 ? 'bg-green-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
    </div>
  )
}

export default function AssetHealthPage() {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = assets.filter((a) =>
    a.id.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent w-full max-w-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-aviation-600" />
                {selected.id} — Component Health
              </h3>
              <p className="text-sm text-slate-500">{selected.type}</p>
            </div>
            <button onClick={() => setSelected(null)} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              Close
            </button>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Engine', value: selected.engine },
              { label: 'Hydraulics', value: selected.hydraulics },
              { label: 'Avionics', value: selected.avionics },
              { label: 'Fuel System', value: selected.fuel },
              { label: 'Landing Gear', value: selected.landingGear },
            ].map((sys) => (
              <div key={sys.label} className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 mb-2">{sys.label}</p>
                <HealthBar value={sys.value} />
                <p className="text-sm font-bold text-navy-900 mt-2">{sys.value}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Asset</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Health Score</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Risk Level</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Last Maintenance</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Next Inspection</th>
                <th className="px-6 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{asset.id}</p>
                      <p className="text-[11px] text-slate-500">{asset.type}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-20">
                        <HealthBar value={asset.health} />
                      </div>
                      <span className="text-sm font-bold text-navy-900">{asset.health}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      asset.risk === 'Low' ? 'bg-green-50 text-green-700' : asset.risk === 'Medium' ? 'bg-amber-50 text-amber-700' : asset.risk === 'High' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {asset.risk}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      asset.status === 'Mission Ready' ? 'bg-green-50 text-green-700' : asset.status === 'At Risk' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{asset.lastMaintenance}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{asset.nextInspection}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelected(asset)}
                      className="text-xs font-medium text-aviation-600 hover:text-aviation-800 flex items-center gap-1 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}