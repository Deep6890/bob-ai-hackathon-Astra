import { Calendar, Clock, ArrowUpRight } from 'lucide-react'

const maintenance = [
  { asset: 'F-102', task: 'Engine inspection', date: 'Nov 28, 2026', priority: 'High', type: 'Scheduled' },
  { asset: 'F-118', task: 'Hydraulic fluid replacement', date: 'Dec 03, 2026', priority: 'Medium', type: 'Predictive' },
  { asset: 'F-204', task: 'Battery system overhaul', date: 'Dec 12, 2026', priority: 'Medium', type: 'Scheduled' },
  { asset: 'F-307', task: 'Avionics calibration', date: 'Jan 05, 2027', priority: 'Low', type: 'Routine' },
]

const priorityColors = {
  High: 'bg-red-50 text-red-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
}

export default function UpcomingMaintenance() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-aviation-600" />
          <span className="text-[10px] font-semibold tracking-widest text-aviation-600 uppercase">Maintenance</span>
        </div>
        <button className="text-xs text-aviation-600 hover:text-aviation-700 font-medium flex items-center gap-0.5 transition-colors">
          View all <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 overflow-auto">
        {maintenance.map((item) => (
          <div key={item.asset + item.task} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white transition-all">
            <div className="w-1 h-10 rounded-full bg-aviation-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-navy-900">{item.asset}</p>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${priorityColors[item.priority]}`}>
                  {item.priority}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">{item.task}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Calendar className="w-3 h-3" />
                {item.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}