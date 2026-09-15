import { useContext, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, Database, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { AppDataContext } from '../context/AppDataContext';

/* ── Confirmation Modal ────────────────────────────────────────────────────── */
function ConfirmResetModal({ onConfirm, onCancel, engineCount }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-textPrimary/20 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative bg-white rounded-2xl border border-borderLight shadow-lg max-w-sm w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <div>
            <p className="text-sm font-bold text-textPrimary">Start a new analysis?</p>
            <p className="text-xs text-textMuted mt-0.5">This action cannot be undone</p>
          </div>
          <button
            onClick={onCancel}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg hover:bg-subtle transition-colors"
          >
            <X className="w-3.5 h-3.5 text-textMuted" />
          </button>
        </div>

        <p className="text-xs text-textSecondary leading-relaxed mb-5">
          This will clear the current dataset
          {engineCount > 0 ? ` (${engineCount} engine${engineCount !== 1 ? 's' : ''})` : ''} and
          all associated analysis results. You can then upload a new CSV file to begin a fresh analysis.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-borderLight text-sm font-medium text-textSecondary hover:bg-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors"
          >
            Clear &amp; Upload New
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Upload Status Chip ────────────────────────────────────────────────────── */
function UploadChip({ uploadState }) {
  const { status, message } = uploadState;
  if (status === 'idle') return null;

  const isUploading = status === 'uploading' || status === 'processing';

  return (
    <div className={[
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium',
      status === 'error'
        ? 'bg-danger/5 border-danger/20 text-danger'
        : 'bg-subtle border-borderLight text-textSecondary',
    ].join(' ')}>
      {isUploading && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'done' && <CheckCircle2 className="w-3 h-3 text-accent" />}
      {status === 'error' && <AlertCircle className="w-3 h-3" />}
      <span className="max-w-[200px] truncate">{message}</span>
    </div>
  );
}

/* ── Header ────────────────────────────────────────────────────────────────── */
export default function Header({ title = 'Mission Readiness' }) {
  const {
    uploadCSV,
    uploadState,
    resetDataset,
    activeDataset,
    engines,
    fetchEngines,
    fetchDatasetInfo,
  } = useContext(AppDataContext);

  const fileInputRef = useRef(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'processing';
  const hasData = engines.length > 0;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadCSV(file);
    e.target.value = '';
  }

  async function handleConfirmReset() {
    setShowConfirm(false);
    setResetting(true);
    try {
      await resetDataset();
      // After reset, open the file picker so user can upload immediately
      setTimeout(() => {
        setResetting(false);
        fileInputRef.current?.click();
      }, 300);
    } catch {
      setResetting(false);
    }
  }

  function handleNewAnalysis() {
    if (hasData) {
      setShowConfirm(true);
    } else {
      fileInputRef.current?.click();
    }
  }

  return (
    <>
      <header
        className="h-14 border-b border-borderLight flex items-center justify-between px-6 shrink-0"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Left — page title */}
        <h2 className="text-sm font-semibold text-textPrimary">{title}</h2>

        {/* Center — active dataset pill (shows when data is loaded) */}
        {activeDataset?.dataset_loaded && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] text-textSecondary absolute left-1/2 -translate-x-1/2"
            style={{
              background: 'rgba(244,244,242,0.8)',
              borderColor: 'rgba(231,231,229,0.8)',
            }}
          >
            <Database className="w-3 h-3 text-textMuted" />
            <span className="font-medium text-textPrimary">
              {activeDataset.engine_count} engine{activeDataset.engine_count !== 1 ? 's' : ''}
            </span>
            {activeDataset.latest_cycle != null && (
              <>
                <span className="text-borderSecondary">·</span>
                <span>Latest cycle: {activeDataset.latest_cycle}</span>
              </>
            )}
          </div>
        )}

        {/* Right — actions */}
        <div className="flex items-center gap-2.5">
          {/* System status */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[11px] text-textSecondary font-medium hidden sm:block">System Online</span>
          </div>

          {/* Upload status feedback */}
          <UploadChip uploadState={uploadState} />

          {/* Start New Analysis / Upload CSV */}
          {hasData ? (
            <button
              onClick={handleNewAnalysis}
              disabled={isUploading || resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-textPrimary text-white rounded-full text-[12px] font-medium hover:bg-neutral transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />
              }
              New Analysis
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-textPrimary text-white rounded-full text-[12px] font-medium hover:bg-neutral transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-3 h-3" />
              Upload CSV
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* Confirmation modal */}
      {showConfirm && (
        <ConfirmResetModal
          engineCount={engines.length}
          onConfirm={handleConfirmReset}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
