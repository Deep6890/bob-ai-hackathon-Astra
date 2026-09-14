import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import FleetPage from './pages/Fleet'
import AssetHealthPage from './pages/AssetHealth'
import PredictiveInsights from './pages/PredictiveInsights'
import MaintenancePage from './pages/Maintenance'
import AlertsPage from './pages/Alerts'
import AICopilotPage from './pages/AICopilotPage'
import ReportsPage from './pages/Reports'
import SettingsPage from './pages/Settings'

function App() {
  const [activePage, setActivePage] = useState('Overview')

  const renderPage = () => {
    switch (activePage) {
      case 'Overview': return <Dashboard />
      case 'Fleet': return <FleetPage />
      case 'Asset Health': return <AssetHealthPage />
      case 'Predictive Insights': return <PredictiveInsights />
      case 'Maintenance': return <MaintenancePage />
      case 'Alerts': return <AlertsPage />
      case 'AI Copilot': return <AICopilotPage />
      case 'Reports': return <ReportsPage />
      case 'Settings': return <SettingsPage />
      default: return <Dashboard />
    }
  }

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </Layout>
  )
}

export default App