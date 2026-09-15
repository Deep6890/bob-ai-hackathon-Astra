import { useState } from 'react'
import { FileText, Download, CheckCircle2, Calendar, TrendingUp, BarChart3, Activity, Shield, Zap, Clock, Heart, AlertTriangle, Wrench } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts'

const reportCards = [
  { id: 'r1', title: 'Mission Readiness Report', description: 'Current readiness status across all assets', metric: '94%', metricLabel: 'Fleet Ready', icon: Shield, color: 'green' },
  { id: 'r2', title: 'Fleet Health Report', description: 'Component health breakdown by system', metric: '86%', metricLabel: 'Avg Health', icon: Activity, color: 'blue' },
  { id: 'r3', title: 'Maintenance Forecast', description: 'Projected maintenance needs for next 90 days', metric: '12', metricLabel: 'Upcoming', icon: Calendar, color: 'amber' },
  { id: 'r4', title: 'Failure Risk Report', description: 'AI-predicted failure probabilities', metric: '34%', metricLabel: 'Risk Score', icon: TrendingUp, color: 'red' },
]

const readinessData = [
  { name: 'F-102', value: 92 },
  { name: 'F-118', value: 78 },
  { name: 'F-204', value: 71 },
  { name: 'F-307', value: 95 },
  { name: 'F-410', value: 88 },
  { name: 'F-505', value: 91 },
  { name: 'F-612', value: 65 },
  { name: 'F-720', value: 93 },
]

const colorMap = { green: '#22c55e', blue: '#3355d9', amber: '#f59e0b', red: '#ef4444' }

export default function ReportsPage() {
  const [generated, setGenerated] = useState(null)

  const generateReport = (id) => {
    setGenerated(id)
    setTimeout(() => setGenerated(null), 2000)
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-navy-900">Reports & Analytics</h3>
          <p className="text-sm text-slate-500">Generate comprehensive fleet intelligence reports</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {reportCards.map((report) => {
          const Icon = report.icon
          return (
            <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${colorMap[report.color]}15` }}>
                  <Icon className="w-5 h-5" style={{ color: colorMap[report.color] }} />
                </div>
                {generated === report.id && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              </div>
              <p className="text-sm font-semibold text-navy-900 mb-1">{report.title}</p>
              <p className="text-xs text-slate-500 mb-4">{report.description}</p>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-navy-900">{report.metric}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{report.metricLabel}</p>
                </div>
              </div>
              <button
                onClick={() => generateReport(report.id)}
                className="w-full py-2 text-xs font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: colorMap[report.color] }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colorMap[report.color]}dd`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colorMap[report.color]}
              >
                <FileText className="w-3.5 h-3.5" />
                {generated === report.id ? 'Generated' : 'Generate Report'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-aviation-600" />
            <span className="text-sm font-semibold text-navy-900">Fleet Readiness Distribution</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={readinessData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {readinessData.map((entry, index) => {
                    const colors = ['#22c55e', '#22c55e', '#ef4444', '#22c55e', '#22c55e', '#22c55e', '#ef4444', '#22c55e']
                    return <Cell key={`cell-${index}`} fill={colors[index] || '#22c55e'} />
                  })}
                </Pie>
                <ReTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-aviation-600" />
              <span className="text-sm font-semibold text-navy-900">Summary</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Assets', value: '28', icon: Activity },
                { label: 'Avg Health', value: '86%', icon: Heart },
                { label: 'Critical Alerts', value: '1', icon: AlertTriangle },
                { label: 'Pending Maint.', value: '6', icon: Wrench },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-navy-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}