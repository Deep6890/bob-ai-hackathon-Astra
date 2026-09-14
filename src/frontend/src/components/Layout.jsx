import Sidebar from './Sidebar'
import Header from './Header'

const pageTitles = {
  Overview: 'Mission Readiness',
  Fleet: 'Fleet Management',
  'Asset Health': 'Asset Health',
  'Predictive Insights': 'Predictive Insights',
  Maintenance: 'Maintenance',
  Alerts: 'Alerts',
  Reports: 'Reports',
  'AI Copilot': 'AI Copilot',
  Settings: 'Settings',
}

export default function Layout({ activePage, onNavigate, children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activeItem={activePage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={pageTitles[activePage] || 'AeroReady AI'} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}