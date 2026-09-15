// src/frontend/src/App.jsx
import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FleetPage from './pages/Fleet';
import AssetHealthPage from './pages/AssetHealth';
import PredictiveInsights from './pages/PredictiveInsights';
import MaintenancePage from './pages/Maintenance';
import AlertsPage from './pages/Alerts';
import AICopilotPage from './pages/AICopilotPage';
import ReportsPage from './pages/Reports';
import ModelAnalysisPage from './pages/ModelAnalysis';
import { AppDataProvider } from './context/AppDataContext';

export default function App() {
  const [engineContext, setEngineContext] = useState(null);
  const [activePage, setActivePage] = useState('Overview');

  function handleNavigate(page) {
    if (page === 'Back to Fleet') {
      setEngineContext(null);
      setActivePage('Overview');
      return;
    }
    setActivePage(page);
  }

  function handleSelectEngine(unitNumber) {
    setEngineContext(unitNumber);
    setActivePage('Asset Dashboard');
  }

  function handleFleetInspect(page, unitNumber) {
    handleSelectEngine(unitNumber);
    setActivePage('Sensor Health');
  }

  const renderPage = () => {
    if (!engineContext) {
      // Fleet-level pages
      switch (activePage) {
        case 'Overview':
          return <Dashboard onSelectEngine={handleSelectEngine} />;
        case 'Fleet':
          return <FleetPage onNavigate={handleFleetInspect} />;
        case 'Reports':
          return <ReportsPage />;
        case 'Model & Analysis':
          return <ModelAnalysisPage />;
        default:
          return <Dashboard onSelectEngine={handleSelectEngine} />;
      }
    } else {
      // Asset-level pages
      switch (activePage) {
        case 'Asset Dashboard':
          return <PredictiveInsights engineContext={engineContext} />;
        case 'Sensor Health':
          return <AssetHealthPage engineContext={engineContext} />;
        case 'Maintenance':
          return <MaintenancePage engineContext={engineContext} />;
        case 'Alerts':
          return <AlertsPage engineContext={engineContext} />;
        case 'AI Copilot':
          return <AICopilotPage engineContext={engineContext} />;
        default:
          return <PredictiveInsights engineContext={engineContext} />;
      }
    }
  };

  return (
    <AppDataProvider>
      <Layout activePage={activePage} onNavigate={handleNavigate} engineContext={engineContext}>
        {renderPage()}
      </Layout>
    </AppDataProvider>
  );
}
