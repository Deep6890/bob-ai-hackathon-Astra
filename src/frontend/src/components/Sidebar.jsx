import { LayoutDashboard, Plane, HeartPulse, Sparkles, Wrench, Bell, FileText, Bot, Settings } from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Plane, label: 'Fleet', active: false },
  { icon: HeartPulse, label: 'Asset Health', active: false },
  { icon: Sparkles, label: 'Predictive Insights', active: false },
  { icon: Wrench, label: 'Maintenance', active: false },
  { icon: Bell, label: 'Alerts', active: false },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Bot, label: 'AI Copilot', active: false },
  { icon: Settings, label: 'Settings', active: false },
]

export default function Sidebar({ activeItem = 'Overview', onNavigate }) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 hidden lg:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center">
          <Plane className="w-5 h-5 text-aviation-400" />
        </div>
        <div>
          <h1 className="font-bold text-navy-900 text-sm leading-tight">AeroReady</h1>
          <p className="text-[10px] text-slate-400 tracking-widest uppercase">AI</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.label === activeItem
          return (
            <button
              key={item.label}
              onClick={() => onNavigate && onNavigate(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-aviation-50 text-aviation-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}