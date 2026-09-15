/**
 * AICopilotPage.jsx
 * =================
 * Mission Readiness Copilot — conversational interface for evidence-grounded
 * natural-language Q&A about engine readiness and sensor health.
 *
 * Key product value:
 *   ML detects risk → Mission Readiness engine evaluates operational risk
 *   → Copilot explains WHY in plain language.
 *
 * Design principles:
 * - AeroReady visual language (not a generic chat clone)
 * - Every answer backed by evidence panel showing the raw fields cited
 * - Clear user / assistant distinction
 * - No hallucination — all facts from backend data
 */
import { useContext, useState, useEffect, useRef } from 'react';
import { Brain, Send, Loader2, ChevronDown, ChevronUp, AlertCircle, Shield, Activity, Gauge } from 'lucide-react';
import { AppDataContext, MISSION_DURATION } from '../context/AppDataContext';
import { api } from '../api';

// ── Starter questions suggested to the user ───────────────────────────────────
const STARTER_QUESTIONS = [
  'Is this engine ready for the mission?',
  'What is the predicted RUL?',
  'Which sensors are concerning?',
  'What maintenance is recommended?',
];

// ── Evidence panel — shows raw fields cited in the answer ─────────────────────
function EvidencePanel({ evidence }) {
  const [open, setOpen] = useState(false);
  if (!evidence || Object.keys(evidence).length === 0) return null;

  const fields = [
    { key: 'rul_predicted',       label: 'Predicted RUL',    fmt: v => `${v.toFixed(1)} cycles` },
    { key: 'risk_flag',           label: 'Risk Flag',        fmt: v => v },
    { key: 'margin_of_safety',    label: 'Safety Margin',    fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)} cycles` },
    { key: 'maintenance_priority',label: 'Priority',         fmt: v => v },
    { key: 'mission_duration',    label: 'Mission Duration', fmt: v => `${v} cycles` },
    { key: 'normal_count',        label: 'Normal Sensors',   fmt: v => v },
    { key: 'degrading_count',     label: 'Degrading',        fmt: v => v },
    { key: 'abnormal_count',      label: 'Abnormal',         fmt: v => v },
  ].filter(f => evidence[f.key] !== undefined && evidence[f.key] !== null);

  const sensorLists = [
    { key: 'degrading_sensors', label: 'Degrading sensors', color: 'text-warning' },
    { key: 'abnormal_sensors',  label: 'Abnormal sensors',  color: 'text-danger' },
  ].filter(f => evidence[f.key]?.length > 0);

  if (fields.length === 0 && sensorLists.length === 0) return null;

  return (
    <div className="mt-2.5 border border-borderLight rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-subtle hover:bg-borderLight/40 transition-colors text-left"
      >
        <span className="text-[11px] font-semibold text-textMuted uppercase tracking-wider">
          Evidence — ML Pipeline Data
        </span>
        {open ? <ChevronUp className="w-3 h-3 text-textMuted" /> : <ChevronDown className="w-3 h-3 text-textMuted" />}
      </button>

      {open && (
        <div className="px-3 py-3 bg-white space-y-2">
          {fields.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {fields.map(({ key, label, fmt }) => (
                <div key={key} className="bg-subtle rounded-lg px-2.5 py-2">
                  <p className="text-[10px] text-textMuted uppercase tracking-wider mb-0.5">{label}</p>
                  <p className={`text-xs font-semibold ${
                    key === 'risk_flag' && evidence[key] === 'CRITICAL' ? 'text-danger' :
                    key === 'risk_flag' && evidence[key] === 'MARGINAL' ? 'text-warning' :
                    key === 'margin_of_safety' && evidence[key] < 0 ? 'text-danger' :
                    'text-textPrimary'
                  }`}>
                    {fmt(evidence[key])}
                  </p>
                </div>
              ))}
            </div>
          )}

          {sensorLists.map(({ key, label, color }) => (
            <div key={key}>
              <p className={`text-[11px] font-semibold ${color} mb-1`}>{label}:</p>
              <p className="text-[11px] font-mono text-textSecondary">
                {evidence[key].join(', ')}
              </p>
            </div>
          ))}

          <p className="text-[10px] text-textMuted pt-1 border-t border-borderLight/50">
            All values sourced from the AeroReady ML pipeline · backend database
          </p>
        </div>
      )}
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm"
          style={{ background: '#181818', color: '#fff' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  const isError = message.isError;

  return (
    <div className="flex gap-2.5 items-start">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-xl bg-textPrimary flex items-center justify-center shrink-0 mt-0.5">
        <Brain className="w-3.5 h-3.5 text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed ${
            isError
              ? 'bg-danger/8 border border-danger/20 text-danger'
              : 'bg-white border border-borderLight text-textSecondary'
          }`}
          style={isError ? {} : { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          {isError && <AlertCircle className="w-4 h-4 inline mr-1.5 mb-0.5" />}
          {/* Render answer with line breaks preserved */}
          {message.content.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < message.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>

        {/* Evidence panel (only for non-error assistant messages) */}
        {!isError && message.evidence && (
          <EvidencePanel evidence={message.evidence} />
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-xl bg-textPrimary flex items-center justify-center shrink-0 mt-0.5">
        <Brain className="w-3.5 h-3.5 text-accent" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-borderLight"
           style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Loader2 className="w-4 h-4 text-textMuted animate-spin" />
      </div>
    </div>
  );
}

// ── Status badges in the header ───────────────────────────────────────────────
function HeaderBadges({ engineContext, missionReadinessById }) {
  const r = missionReadinessById[engineContext];
  if (!r) return null;

  const flag   = r.combined_assessment?.mission_readiness;
  const rul    = r.rul_assessment?.predicted_rul_cycles;
  const margin = r.rul_assessment?.margin_of_safety;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {rul != null && (
        <div className="flex items-center gap-1 px-2 py-1 bg-subtle rounded-lg border border-borderLight">
          <Gauge className="w-3 h-3 text-textMuted" />
          <span className="text-[11px] font-semibold text-textPrimary">{rul.toFixed(1)} cy RUL</span>
        </div>
      )}
      {margin != null && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
          margin < 0 ? 'bg-danger/8 border-danger/20' :
          margin < 15 ? 'bg-warning/8 border-warning/20' :
          'bg-subtle border-borderLight'
        }`}>
          <Shield className="w-3 h-3 text-textMuted" />
          <span className={`text-[11px] font-semibold ${
            margin < 0 ? 'text-danger' : margin < 15 ? 'text-warning' : 'text-textPrimary'
          }`}>
            {margin >= 0 ? '+' : ''}{margin.toFixed(1)} cy margin
          </span>
        </div>
      )}
      {flag && (
        <div className={`px-2 py-1 rounded-lg border text-[11px] font-semibold ${
          flag === 'SAFE' || flag === 'READY' ? 'bg-accent/10 border-accent/30 text-textPrimary' :
          flag === 'MARGINAL' || flag === 'WARNING' ? 'bg-warning/10 border-warning/30 text-warning' :
          'bg-danger/10 border-danger/30 text-danger'
        }`}>
          {flag}
        </div>
      )}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────
export default function AICopilotPage({ engineContext }) {
  const { engines, enginesLoading, missionReadinessById, fetchEngineData } = useContext(AppDataContext);

  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const messagesEndRef              = useRef(null);
  const inputRef                    = useRef(null);

  // Fetch engine data when engine changes
  useEffect(() => {
    if (engineContext) {
      fetchEngineData(engineContext);
    }
  }, [engineContext, fetchEngineData]);

  // Send starter question when engine changes
  useEffect(() => {
    if (!engineContext) return;
    setMessages([]);
    // Short delay so the engine data fetch can start first
    const timer = setTimeout(() => {
      sendMessage(`What is the current mission readiness status of Engine ${engineContext}?`, engineContext);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineContext]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text, overrideEngineId) {
    const questionText = (text ?? input).trim();
    if (!questionText || loading) return;

    const eid = overrideEngineId ?? engineContext;
    setInput('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: questionText }]);
    setLoading(true);

    try {
      const result = await api.getCopilotResponse(eid, questionText);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        evidence: result.evidence,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Unable to get a response: ${err.message}`,
        isError: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!engineContext) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-borderLight">
        <Brain className="w-8 h-8 text-borderSecondary mb-3" />
        <p className="text-sm font-semibold text-textPrimary mb-1">No Engine Selected</p>
        <p className="text-xs text-textMuted">Select an engine from the fleet to start the Copilot.</p>
      </div>
    );
  }

  if (enginesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-textMuted animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">

      {/* Header */}
      <div
        className="flex items-start gap-4 p-4 rounded-2xl border border-borderLight mb-4 shrink-0"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)' }}
      >
        <div className="w-10 h-10 rounded-xl bg-textPrimary flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-textPrimary">Mission Readiness Copilot</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-subtle rounded-full border border-borderLight text-textMuted">
              Unit {engineContext}
            </span>
          </div>
          <HeaderBadges engineContext={engineContext} missionReadinessById={missionReadinessById} />
          <p className="text-[11px] text-textMuted mt-1.5">
            Evidence-grounded analysis · Every answer cited from ML pipeline data · No LLM
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-[11px] text-textSecondary">Connected</span>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1">
        {messages.length === 0 && !loading && (
          <div className="text-center py-8">
            <Activity className="w-5 h-5 text-borderSecondary mx-auto mb-2" />
            <p className="text-xs text-textMuted">Initialising analysis…</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Starter chips — shown when only 1 initial message exists */}
      {messages.length <= 1 && !loading && (
        <div className="flex flex-wrap gap-2 py-2 shrink-0">
          {STARTER_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-[11px] px-3 py-1.5 rounded-full border border-borderLight bg-white text-textSecondary hover:border-borderSecondary hover:text-textPrimary transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div
        className="flex items-end gap-2.5 p-3 rounded-2xl border border-borderLight mt-2 shrink-0"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask about this engine's readiness, RUL, sensor health, or maintenance priority…"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-textPrimary placeholder:text-textMuted focus:outline-none py-1 leading-relaxed disabled:opacity-50 max-h-28 overflow-y-auto"
          style={{ fontFamily: 'inherit' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-xl bg-textPrimary text-white flex items-center justify-center shrink-0 hover:bg-neutral transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-textMuted mt-2 shrink-0">
        All statements derived from AeroReady ML pipeline output · Mission duration: {MISSION_DURATION} cycles
      </p>
    </div>
  );
}
