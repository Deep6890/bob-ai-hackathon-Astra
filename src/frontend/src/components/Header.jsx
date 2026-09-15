import { Search, Radio, Bell, User } from 'lucide-react'

export default function Header({ title = 'AeroReady AI' }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div>
        <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets..."
            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent w-48 md:w-64 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-700">System Online</span>
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <button className="flex items-center gap-2 p-1.5 pr-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 rounded-md bg-aviation-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-700">Cdr. J. Hayes</p>
            <p className="text-[10px] text-slate-400">Ops Lead</p>
          </div>
        </button>
      </div>
    </header>
  )
}