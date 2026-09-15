/**
 * ModelAnalysis.jsx
 * =================
 * Model & Analysis page.
 * Shows LSTM RUL model metrics and IsolationForest health model info.
 * Metrics are actual offline evaluation results — NOT labeled as "accuracy".
 * R² explained in plain language.
 * Data sourced from GET /api/v1/system/model-info.
 */
import { useEffect, useState } from 'react';
import { Cpu, Activity, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className="bg-subtle rounded-xl border border-borderLight p-4 text-center">
      <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-textPrimary' : 'text-textPrimary'}`}>{value}</p>
      {sub && <p className="text-[10px] text-textMuted mt-1">{sub}</p>}
    </div>
  );
}

function InfoNote({ children }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-subtle rounded-xl border border-borderLight">
      <Info className="w-3.5 h-3.5 text-textMuted mt-0.5 shrink-0" />
      <p className="text-[12px] text-textSecondary leading-relaxed">{children}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-borderLight overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-borderLight">
        <Icon className="w-4 h-4 text-textMuted" />
        <p className="text-sm font-semibold text-textPrimary">{title}</p>
      </div>
      <div className="px-5 py-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

export default function ModelAnalysisPage() {
  const [info, setInfo]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.getModelInfo()
      .then(data => { setInfo(data); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-textMuted animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-borderLight">
        <p className="text-base font-semibold text-textPrimary mb-1">Could not load model info</p>
        <p className="text-sm text-textSecondary">{error}</p>
      </div>
    );
  }

  const rul    = info?.rul_model;
  const health = info?.health_model;
  const notes  = info?.notes;

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Page intro */}
      <div>
        <h2 className="text-xl font-bold text-textPrimary">Model & Analysis</h2>
        <p className="text-sm text-textSecondary mt-1">
          Technical details about the ML models powering this application.
          Metrics are offline evaluation results — not recalculated at runtime.
        </p>
      </div>

      {/* RUL model */}
      <Section icon={Cpu} title="RUL Prediction Model">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-3 p-4 bg-subtle rounded-xl border border-borderLight">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-textSecondary">
              <span><strong className="text-textPrimary">Model:</strong> {rul?.type ?? 'LSTM'}</span>
              <span><strong className="text-textPrimary">Input:</strong> {rul?.input ?? '30-cycle sensor sequence'}</span>
              <span><strong className="text-textPrimary">Output:</strong> Remaining Useful Life (cycles)</span>
              <span><strong className="text-textPrimary">Features:</strong> {rul?.features ?? 14} smoothed sensor channels</span>
              <span><strong className="text-textPrimary">Sequence length:</strong> {rul?.sequence_length ?? 30} cycles</span>
              <span><strong className="text-textPrimary">Optimal epochs:</strong> {rul?.optimal_epochs ?? 7}</span>
              <span><strong className="text-textPrimary">Training engines:</strong> {rul?.training_engines ?? 100}</span>
              <span><strong className="text-textPrimary">Cross-validation:</strong> {rul?.cross_validation ?? '5-fold Group K-Fold by engine'}</span>
              {rul?.loaded != null && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${rul.loaded ? 'text-accent' : 'text-textMuted'}`} />
                  <strong className="text-textPrimary">Status:</strong>
                  {rul.loaded ? ' Loaded' : ' Not loaded'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Validation metrics */}
        <div>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-2">Validation Metrics</p>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="MAE" value={`${rul?.validation_metrics?.mae ?? 10.05}`} sub="cycles" />
            <MetricCard label="RMSE" value={`${rul?.validation_metrics?.rmse ?? 13.38}`} sub="cycles" />
            <MetricCard label="Validation R²" value={`${rul?.validation_metrics?.r2 ?? 0.8968}`} sub="not accuracy" highlight />
          </div>
        </div>

        {/* Test metrics */}
        <div>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-2">Test Metrics</p>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="MAE" value={`~${rul?.test_metrics?.mae ?? 11.3}`} sub="cycles" />
            <MetricCard label="RMSE" value={`~${rul?.test_metrics?.rmse ?? 14.7}`} sub="cycles" />
            <MetricCard label="Test R²" value={`~${rul?.test_metrics?.r2 ?? 0.865}`} sub="not accuracy" />
          </div>
        </div>

        <InfoNote>
          {notes?.r2_explanation ?? 'R² (R-squared) indicates how well the model explains variation in the validation data. A value of 0.8968 means ~90% of variance is explained. This is NOT classification accuracy.'}
        </InfoNote>
      </Section>

      {/* Health model */}
      <Section icon={Activity} title="Health Monitoring Model">
        <div className="p-4 bg-subtle rounded-xl border border-borderLight">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-textSecondary">
            <span><strong className="text-textPrimary">Model:</strong> {health?.type ?? 'Isolation Forest'}</span>
            <span><strong className="text-textPrimary">Input:</strong> {health?.input ?? '14 smoothed sensor features'}</span>
            <span><strong className="text-textPrimary">Reference population:</strong> {health?.reference_population ?? 'Healthy observations with RUL > 100'}</span>
            <span><strong className="text-textPrimary">Estimators:</strong> {health?.estimators ?? 100}</span>
            <span><strong className="text-textPrimary">Temporal window:</strong> {health?.temporal_window ?? 5} cycles</span>
            <span><strong className="text-textPrimary">Persistence threshold:</strong> {health?.persistence_threshold != null ? `${Math.round(health.persistence_threshold * 100)}%` : '60%'} of window</span>
            {health?.loaded != null && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${health.loaded ? 'text-accent' : 'text-textMuted'}`} />
                <strong className="text-textPrimary">Status:</strong>
                {health.loaded ? ' Loaded' : ' Not loaded'}
              </span>
            )}
          </div>
        </div>

        {/* Sensor states */}
        <div>
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-2">Sensor States</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { state: 'NORMAL',    dot: 'bg-textSecondary', desc: 'No persistent anomaly detected' },
              { state: 'DEGRADING', dot: 'bg-warning',       desc: 'Anomalous + trend aligns with degradation' },
              { state: 'ABNORMAL',  dot: 'bg-danger',        desc: 'Persistently anomalous, trend direction unclear' },
              { state: 'UNKNOWN',   dot: 'bg-borderSecondary', desc: 'Historical trend direction unavailable' },
            ].map(({ state, dot, desc }) => (
              <div key={state} className="p-3 bg-subtle rounded-xl border border-borderLight">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="text-[11px] font-semibold text-textPrimary">{state}</span>
                </div>
                <p className="text-[10px] text-textMuted leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <InfoNote>
          {notes?.health_note ?? 'Isolation Forest identifies sensor behaviour that is statistically unusual compared with the healthy reference population and checks whether the behaviour persists over recent cycles. It does not prove a specific physical component failure.'}
        </InfoNote>
      </Section>

      {/* Training data note */}
      <div
        className="p-4 rounded-2xl border border-borderLight text-[12px] text-textSecondary leading-relaxed"
        style={{ background: 'rgba(244,244,242,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <p className="font-semibold text-textPrimary mb-1.5">About Training Data</p>
        <p>
          These models were trained on the NASA C-MAPSS turbofan dataset (FD001, 100 training engines).
          This training data is used <strong>only</strong> for offline model development and is not part of the
          production fleet. The production application only displays data from your uploaded CSV.
        </p>
      </div>
    </div>
  );
}
