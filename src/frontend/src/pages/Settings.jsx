import { useState } from 'react'
import { User, Bell, Settings, Cpu, AlertTriangle, Brain, Save, CheckCircle2, Shield, FileText } from 'lucide-react'

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors flex items-center ${checked ? 'bg-aviation-600 justify-end' : 'bg-slate-200 justify-start'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'mr-0.5' : 'ml-0.5'}`} />
    </button>
  )
}

function SettingSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-aviation-600" />
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: 'Cdr. J. Hayes', role: 'Operations Lead', email: 'j.hayes@aeroready.mil', phone: '+1 (555) 0142' })
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    warningAlerts: true,
    maintenanceReminders: true,
    weeklyReports: false,
    aiInsights: true,
    systemUpdates: true,
  })
  const [fleetPrefs, setFleetPrefs] = useState({
    autoRefresh: true,
    refreshInterval: 30,
    defaultView: 'Overview',
    unitSystem: 'metric',
  })
  const [thresholds, setThresholds] = useState({
    vibrationWarning: 5.0,
    vibrationCritical: 7.0,
    pressureDropWarning: 15,
    pressureDropCritical: 25,
    temperatureWarning: 95,
    temperatureCritical: 110,
  })
  const [aiPrefs, setAiPrefs] = useState({
    confidenceLevel: 90,
    predictionHorizon: 30,
    sensitivity: 'High',
    modelVersion: 'v2.4.1',
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-navy-900">Settings</h3>
          <p className="text-sm text-slate-500">Manage your account preferences and system configuration</p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-aviation-600 text-white rounded-lg text-sm font-medium hover:bg-aviation-700 transition-colors flex items-center gap-2"
        >
          {saved && <CheckCircle2 className="w-4 h-4" />}
          {saved ? 'Saved' : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      {/* Profile */}
      <SettingSection title="Profile" icon={User}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-xl bg-aviation-600 flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900">{profile.name}</p>
            <p className="text-xs text-slate-500">{profile.role}</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text' },
            { label: 'Role', key: 'role', type: 'text' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Phone', key: 'phone', type: 'tel' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
              <input
                type={field.type}
                value={profile[field.key]}
                onChange={(e) => setProfile((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </SettingSection>

      {/* Notifications */}
      <SettingSection title="Notifications" icon={Bell}>
        <div className="space-y-3">
          {[
            { key: 'criticalAlerts', label: 'Critical Alerts', desc: 'Immediate notification for critical system failures', icon: AlertTriangle },
            { key: 'warningAlerts', label: 'Warning Alerts', desc: 'Notifications for at-risk assets', icon: AlertTriangle },
            { key: 'maintenanceReminders', label: 'Maintenance Reminders', desc: 'Scheduled and predictive maintenance alerts', icon: Cpu },
            { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Automated fleet summary every Monday', icon: FileText },
            { key: 'aiInsights', label: 'AI Insights', desc: 'Predictive analysis updates from AI Copilot', icon: Brain },
            { key: 'systemUpdates', label: 'System Updates', desc: 'Software update notifications', icon: Shield },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
              </div>
              <Toggle checked={notifications[item.key]} onChange={(v) => setNotifications((prev) => ({ ...prev, [item.key]: v }))} />
            </div>
          ))}
        </div>
      </SettingSection>

      {/* Fleet Preferences */}
      <SettingSection title="Fleet Preferences" icon={Settings}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-700">Auto-Refresh</p>
              <p className="text-[11px] text-slate-400">Automatically update fleet data</p>
            </div>
            <Toggle checked={fleetPrefs.autoRefresh} onChange={(v) => setFleetPrefs((prev) => ({ ...prev, autoRefresh: v }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Refresh Interval (seconds)</label>
            <input
              type="number"
              value={fleetPrefs.refreshInterval}
              onChange={(e) => setFleetPrefs((prev) => ({ ...prev, refreshInterval: parseInt(e.target.value) || 30 }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Default View</label>
            <select
              value={fleetPrefs.defaultView}
              onChange={(e) => setFleetPrefs((prev) => ({ ...prev, defaultView: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent"
            >
              <option>Overview</option>
              <option>Fleet</option>
              <option>Asset Health</option>
              <option>Predictive Insights</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Unit System</label>
            <select
              value={fleetPrefs.unitSystem}
              onChange={(e) => setFleetPrefs((prev) => ({ ...prev, unitSystem: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent"
            >
              <option value="metric">Metric (°C, km/h, bar)</option>
              <option value="imperial">Imperial (°F, mph, psi)</option>
            </select>
          </div>
        </div>
      </SettingSection>

      {/* Alert Thresholds */}
      <SettingSection title="Alert Thresholds" icon={AlertTriangle}>
        <div className="space-y-4">
          {[
            { label: 'Vibration Warning (Hz)', key: 'vibrationWarning' },
            { label: 'Vibration Critical (Hz)', key: 'vibrationCritical' },
            { label: 'Pressure Drop Warning (%)', key: 'pressureDropWarning' },
            { label: 'Pressure Drop Critical (%)', key: 'pressureDropCritical' },
            { label: 'Temperature Warning (°C)', key: 'temperatureWarning' },
            { label: 'Temperature Critical (°C)', key: 'temperatureCritical' },
          ].map((item) => (
            <div key={item.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{item.label}</label>
              <input
                type="number"
                step="0.5"
                value={thresholds[item.key]}
                onChange={(e) => setThresholds((prev) => ({ ...prev, [item.key]: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </SettingSection>

      {/* AI Preferences */}
      <SettingSection title="AI Preferences" icon={Brain}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Prediction Confidence: {aiPrefs.confidenceLevel}%</label>
            <input
              type="range"
              min="70"
              max="99"
              value={aiPrefs.confidenceLevel}
              onChange={(e) => setAiPrefs((prev) => ({ ...prev, confidenceLevel: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Prediction Horizon (days): {aiPrefs.predictionHorizon}</label>
            <input
              type="range"
              min="7"
              max="90"
              value={aiPrefs.predictionHorizon}
              onChange={(e) => setAiPrefs((prev) => ({ ...prev, predictionHorizon: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sensitivity</label>
            <select
              value={aiPrefs.sensitivity}
              onChange={(e) => setAiPrefs((prev) => ({ ...prev, sensitivity: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-2">
            <Brain className="w-4 h-4 text-aviation-500" />
            <p className="text-xs text-slate-500">Model version: <span className="font-mono text-slate-700">{aiPrefs.modelVersion}</span></p>
          </div>
        </div>
      </SettingSection>
    </div>
  )
}