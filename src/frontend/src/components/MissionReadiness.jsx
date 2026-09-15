import { Target, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

export default function MissionReadiness() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-aviation-600" />
        <span className="text-[10px] font-semibold tracking-widest text-aviation-600 uppercase">Mission Status</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none" stroke="#3355d9"
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${0.94 * 251.2} ${251.2}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-navy-900">94%</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Ready</span>
          </div>
        </div>

        <p className="text-sm font-semibold text-navy-900 mb-3">Mission Ready</p>

        <div className="w-full space-y-2">
          <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">Ready</span>
            </div>
            <span className="text-sm font-bold text-green-700">24</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">At Risk</span>
            </div>
            <span className="text-sm font-bold text-amber-700">3</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-700">Critical</span>
            </div>
            <span className="text-sm font-bold text-red-700">1</span>
          </div>
        </div>
      </div>
    </div>
  )
}