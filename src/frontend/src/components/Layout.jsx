import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
  Overview:             'Fleet Overview',
  'Asset Dashboard':    'Asset Dashboard',
  'Sensor Health':      'Asset Health',
  'Predictive Insights':'Predictive Insights',
  Maintenance:          'Maintenance Queue',
  Alerts:               'Alerts',
  Reports:              'Reports',
  'AI Copilot':         'Structured Analysis',
  'Model & Analysis':   'Model & Analysis',
};

export default function Layout({ activePage, onNavigate, engineContext, children }) {
  const title = pageTitles[activePage] || 'AeroReady AI';
  const displayTitle = engineContext ? `Unit ${engineContext} / ${title}` : title;

  return (
    <div className="flex h-screen bg-page overflow-hidden">
      <Sidebar activeItem={activePage} onNavigate={onNavigate} engineContext={engineContext} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={displayTitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
