import { LayoutDashboard, Plane, Activity, TrendingUp, Wrench, Bell, FileText, Cpu, Bot, ArrowLeft, Layers } from 'lucide-react';

const fleetNavItems = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: Layers,          label: 'Fleet' },
  { icon: FileText,        label: 'Reports' },
  { icon: Cpu,             label: 'Model & Analysis' },
];

const assetNavItems = [
  { icon: ArrowLeft,       label: 'Back to Fleet' },
  { icon: LayoutDashboard, label: 'Asset Dashboard' },
  { icon: Activity,        label: 'Sensor Health' },
  { icon: TrendingUp,      label: 'Predictive Insights' },
  { icon: Wrench,          label: 'Maintenance' },
  { icon: Bell,            label: 'Alerts' },
  { icon: Bot,             label: 'AI Copilot' },
];

export default function Sidebar({ activeItem = 'Overview', onNavigate, engineContext }) {
  const navItems = engineContext ? assetNavItems : fleetNavItems;

  return (
    <aside className="w-56 bg-white border-r border-borderLight flex flex-col h-screen shrink-0 hidden lg:flex">

      {/* Logo */}
      <div className="px-5 py-[18px] flex items-center gap-3 border-b border-borderLight">
        <div className="w-7 h-7 rounded-lg bg-textPrimary flex items-center justify-center shrink-0">
          <Plane className="w-3.5 h-3.5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-bold text-textPrimary leading-none">AeroReady</p>
          <p className="text-[9px] text-textMuted tracking-widest uppercase mt-0.5">AI Platform</p>
        </div>
      </div>

      {/* Context Badge */}
      {engineContext && (
        <div className="px-4 pt-4 pb-2">
          <div className="bg-borderSecondary/30 rounded-lg px-3 py-2 flex items-center gap-2 border border-borderLight/50">
            <Plane className="w-3.5 h-3.5 text-textSecondary" />
            <span className="text-xs font-semibold text-textPrimary">Unit {engineContext}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 px-2.5 ${engineContext ? 'pt-1 pb-3' : 'py-3'} space-y-0.5 overflow-y-auto`}>
        {navItems.map(({ icon: Icon, label }) => {
          const isActive = label === activeItem;
          const isBack = label === 'Back to Fleet';
          return (
            <button
              key={label}
              id={`nav-${label.toLowerCase().replace(/[\s&]+/g, '-')}`}
              onClick={() => onNavigate && onNavigate(label)}
              className={[
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-left transition-colors',
                isActive
                  ? 'bg-textPrimary text-white'
                  : isBack
                  ? 'text-textSecondary hover:text-textPrimary bg-subtle mb-3 mt-1 border border-borderLight'
                  : 'text-textSecondary hover:text-textPrimary hover:bg-subtle',
              ].join(' ')}
            >
              {!isBack && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                  isActive ? 'bg-accent' : 'bg-transparent'
                }`} />
              )}
              {isBack && <div className="w-1.5 h-1.5 shrink-0" />}
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-borderLight">
        <p className="text-[10px] text-textMuted leading-relaxed">Mission Readiness Copilot</p>
        <p className="text-[10px] text-textMuted">IBM BoB Hackathon</p>
      </div>
    </aside>
  );
}
