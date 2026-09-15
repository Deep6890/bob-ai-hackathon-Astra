import { Bot, RefreshCw, Zap } from 'lucide-react'

export default function AICopilot() {
  return (
    <div className="bg-white rounded-2xl border border-navy-900/20 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-navy-900 flex items-center justify-center">
          <Bot className="w-4 h-4 text-aviation-300" />
        </div>
        <span className="text-[10px] font-semibold tracking-widest text-navy-700 uppercase">AI Copilot</span>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
          <p className="text-[11px] text-slate-400 mb-1">Query</p>
          <p className="text-sm font-semibold text-navy-900">"Why is F-102 at risk?"</p>
        </div>

        <div className="bg-aviation-50 rounded-xl p-3.5 border border-aviation-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3 h-3 text-aviation-600" />
            <p className="text-[10px] font-semibold text-aviation-700 uppercase tracking-wider">AI Analysis</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            F-102 shows elevated engine vibration patterns (6.2 Hz above baseline) correlated with fuel system pressure variance. Predicted component degradation in 14 days.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-2">
            <RefreshCw className="w-3 h-3 text-slate-500" />
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Recommendation</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Schedule engine diagnostic within 48h. Inspect fuel pump assembly. Estimated 2h maintenance window.
          </p>
        </div>
      </div>
    </div>
  )
}