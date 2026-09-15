import { useState } from 'react'
import { Bot, Brain, Sparkles, Send, User, ArrowRight, Zap, Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

const suggestedQuestions = [
  'Why is F-102 at risk?',
  'Which aircraft need maintenance today?',
  'What component is most likely to fail?',
  'What should we inspect before the next mission?',
]

const responses = {
  'Why is F-102 at risk?': {
    analysis: 'F-102 shows elevated engine vibration patterns (6.2 Hz above baseline) correlated with fuel system pressure variance. AI models predict component degradation within 14 days with 96% confidence.',
    factors: [
      'Engine vibration trending upward for 72 hours',
      'Fuel pressure 18% below optimal range',
      'Hydraulic temperature elevated by 4.2C',
    ],
    recommendation: 'Schedule engine diagnostic within 48 hours. Inspect fuel pump assembly and hydraulic lines. Estimated 2-hour maintenance window.',
  },
  'Which aircraft need maintenance today?': {
    analysis: '2 aircraft require attention today. F-612 has a critical engine issue requiring immediate action. F-118 has a high-priority hydraulic failure in progress.',
    factors: [
      'F-612: Engine vibration anomaly — critical',
      'F-118: Hydraulic pressure drop — in progress',
      'F-204: Battery degradation — scheduled for Dec 12',
    ],
    recommendation: 'Prioritize F-612 for emergency inspection. Allocate maintenance crew to F-118 hydraulic system repair. Estimated combined downtime: 14 hours.',
  },
  'What component is most likely to fail?': {
    analysis: 'Based on AI analysis of 2,840 flight hours across the fleet, the F-118 hydraulic pump assembly has the highest probability of failure at 72% within the next 30 days.',
    factors: [
      'Pressure variance detected in system B',
      'Seal wear pattern matches pre-failure signature',
      'Operating temperature 3.8C above historical average',
    ],
    recommendation: 'Pre-emptive replacement of hydraulic pump assembly recommended. Part number HP-4471-B in inventory. Estimated 6-hour replacement window.',
  },
  'What should we inspect before the next mission?': {
    analysis: 'Pre-mission inspection should focus on engine health (4 assets), hydraulic systems (3 assets), and avionics calibration (2 assets) based on flight hour thresholds and anomaly detection.',
    factors: [
      'F-612: Full engine diagnostic required',
      'F-118: Hydraulic pressure verification needed',
      'F-204: Battery system check required',
      'F-410: Avionics calibration overdue',
    ],
    recommendation: 'Run comprehensive pre-flight checks on 4 aircraft. Allow 3 hours for inspections. Clear F-612 from mission rotation until engine issue resolved.',
  },
}

function ChatMessage({ message, isUser }) {
  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="bg-aviation-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm">{message}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-aviation-600 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-aviation-400" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3 h-3 text-aviation-500" />
          <span className="text-[10px] font-semibold text-aviation-600 uppercase tracking-wider">AeroReady AI</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
      </div>
    </div>
  )
}

function ChatResponse({ analysis, factors, recommendation }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3 h-3 text-aviation-500" />
        <span className="text-[10px] font-semibold text-aviation-600 uppercase tracking-wider">AeroReady AI</span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed mb-3">{analysis}</p>
      <div className="bg-slate-50 rounded-lg p-3 mb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Contributing Factors</p>
        <ul className="space-y-1.5">
          {factors.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-start gap-2 p-3 bg-aviation-50 rounded-lg border border-aviation-100">
        <Zap className="w-3.5 h-3.5 text-aviation-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-semibold text-aviation-700 uppercase tracking-wider mb-1">Recommendation</p>
          <p className="text-xs text-aviation-800 leading-relaxed">{recommendation}</p>
        </div>
      </div>
    </div>
  )
}

export default function AICopilotPage() {
  const [messages, setMessages] = useState([
    { text: 'Welcome to AeroReady AI Copilot. Ask me anything about fleet readiness, maintenance predictions, or asset health.', isUser: false },
  ])
  const [input, setInput] = useState('')

  const handleSend = (text) => {
    if (!text.trim()) return
    const userMsg = { text, isUser: true }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    setTimeout(() => {
      let responseKey = text
      let found = false
      for (const key of Object.keys(responses)) {
        if (text.toLowerCase().includes(key.toLowerCase().split(' ').slice(0, 3).join(' '))) {
          responseKey = key
          found = true
          break
        }
      }
      if (!found && text.includes('F-102')) {
        responseKey = 'Why is F-102 at risk?'
        found = true
      }

      const response = responses[responseKey] || {
        analysis: `Analyzing query: "${text}". Based on current fleet data, I recommend reviewing the Predictive Insights page for detailed risk analysis and the Fleet page for asset-specific information.`,
        factors: ['Cross-referencing 2,840 data points', 'Pattern matching against historical records', 'AI confidence: 91%'],
        recommendation: 'Check related assets and components for more detailed analysis.',
      }

      setMessages((prev) => [...prev, { text: JSON.stringify(response), isUser: false }])
    }, 800)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-[1100px] mx-auto">
      <div className="bg-white rounded-t-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
            <Brain className="w-5 h-5 text-aviation-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-navy-900">AeroReady AI Copilot</h3>
            <p className="text-xs text-slate-400">Predictive maintenance intelligence</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[11px] font-medium text-green-700">Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 border-x border-slate-200 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, i) => {
          if (msg.isUser) {
            return <ChatMessage key={i} message={msg.text} isUser />
          }
          try {
            const parsed = JSON.parse(msg.text)
            return <ChatResponse key={i} {...parsed} />
          } catch {
            return <ChatMessage key={i} message={msg.text} isUser={false} />
          }
        })}
      </div>

      <div className="bg-white rounded-b-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-aviation-50 hover:border-aviation-200 hover:text-aviation-700 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input) }}
              placeholder="Ask AeroReady..."
              className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-aviation-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => handleSend(input)}
            className="px-5 py-3 bg-aviation-600 text-white rounded-xl text-sm font-medium hover:bg-aviation-700 transition-colors flex items-center gap-2 shrink-0"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}