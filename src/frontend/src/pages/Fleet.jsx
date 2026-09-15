/**
 * Fleet.jsx
 * =========
 * Compact searchable/sortable/filterable table.
 * Replaces the 100-card grid.
 * All data from backend — no hardcoded values.
 */
import { useContext, useEffect, useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Loader2, ArrowUpDown, Filter } from 'lucide-react';
import { AppDataContext } from '../context/AppDataContext';

function StatusDot({ status }) {
  if (!status) return <span className="w-2 h-2 rounded-full bg-borderSecondary inline-block" />;
  const s = status.toUpperCase();
  const color =
    s === 'SAFE' || s === 'READY' ? 'bg-accent' :
    s === 'MARGINAL' || s === 'WARNING' ? 'bg-warning' :
    'bg-danger';
  return <span className={`w-2 h-2 rounded-full ${color} inline-block shrink-0`} />;
}

function PriorityBadge({ priority }) {
  if (!priority) return <span className="text-textMuted text-xs">—</span>;
  const cls =
    priority === 'HIGH'   ? 'text-danger font-bold' :
    priority === 'MEDIUM' ? 'text-warning font-semibold' :
    'text-textMuted';
  return <span className={`text-xs ${cls}`}>{priority}</span>;
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-textMuted ml-1 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-textPrimary ml-1 inline" />
    : <ChevronDown className="w-3 h-3 text-textPrimary ml-1 inline" />;
}

const PRIORITY_FILTERS = ['All', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_FILTERS   = ['All', 'SAFE', 'MARGINAL', 'CRITICAL', 'READY', 'WARNING', 'NOT READY'];

export default function FleetPage({ onNavigate }) {
  const {
    engines,
    enginesLoading,
    enginesError,
    enginePredictionById,
    missionReadinessById,
    fetchEngineData,
  } = useContext(AppDataContext);

  const [search,          setSearch]         = useState('');
  const [priorityFilter,  setPriorityFilter]  = useState('All');
  const [statusFilter,    setStatusFilter]    = useState('All');
  const [sortField,       setSortField]       = useState('priority');
  const [sortDir,         setSortDir]         = useState('asc');
  const [showFilters,     setShowFilters]     = useState(false);

  // Load data for all engines when fleet page mounts
  useEffect(() => {
    engines.forEach(e => fetchEngineData(e.unit_number));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engines.length]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const rows = useMemo(() => {
    const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

    return engines
      .map(e => {
        const pred     = enginePredictionById[e.unit_number];
        const r        = missionReadinessById[e.unit_number];
        return {
          unit:     e.unit_number,
          cycle:    r?.latest_cycle ?? e.latest_cycle,
          rul:      r?.rul_assessment?.predicted_rul_cycles ?? pred?.rul_predicted,
          margin:   r?.rul_assessment?.margin_of_safety,
          status:   r?.combined_assessment?.mission_readiness,
          priority: r?.combined_assessment?.maintenance_priority,
        };
      })
      .filter(row => {
        if (search && !String(row.unit).includes(search)) return false;
        if (priorityFilter !== 'All' && row.priority !== priorityFilter) return false;
        if (statusFilter !== 'All') {
          const s = row.status?.toUpperCase();
          if (s !== statusFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'unit')     cmp = a.unit - b.unit;
        else if (sortField === 'cycle')    cmp = (a.cycle ?? 0) - (b.cycle ?? 0);
        else if (sortField === 'rul')      cmp = (a.rul ?? 999) - (b.rul ?? 999);
        else if (sortField === 'margin')   cmp = (a.margin ?? 999) - (b.margin ?? 999);
        else if (sortField === 'priority') cmp = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [engines, enginePredictionById, missionReadinessById, search, priorityFilter, statusFilter, sortField, sortDir]);

  if (enginesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-textMuted animate-spin" />
      </div>
    );
  }

  if (enginesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-danger/20">
        <p className="text-base font-semibold text-textPrimary mb-1">Unable to load fleet data</p>
        <p className="text-sm text-danger">{enginesError}</p>
      </div>
    );
  }

  if (engines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-borderLight">
        <p className="text-base font-semibold text-textPrimary mb-1">No fleet data available</p>
        <p className="text-sm text-textSecondary">Upload a CSV to begin analysis.</p>
      </div>
    );
  }

  const loadedCount = Object.keys(missionReadinessById).length;

  return (
    <div className="space-y-4">

      {/* Controls row */}
      <div
        className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-borderLight"
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted" />
          <input
            type="text"
            placeholder="Search unit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-white border border-borderLight rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-borderSecondary w-44 placeholder:text-textMuted"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-medium transition-colors ${
            showFilters ? 'bg-textPrimary text-white border-textPrimary' : 'bg-white border-borderLight text-textSecondary hover:border-borderSecondary'
          }`}
        >
          <Filter className="w-3 h-3" /> Filters
        </button>

        {/* Priority filter */}
        {showFilters && PRIORITY_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setPriorityFilter(f)}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-medium transition-colors ${
              priorityFilter === f
                ? 'bg-textPrimary text-white border-textPrimary'
                : 'bg-white text-textSecondary border-borderLight hover:border-borderSecondary'
            }`}
          >
            {f === 'All' ? 'All priorities' : f}
          </button>
        ))}

        <span className="ml-auto text-[11px] text-textMuted">
          {rows.length} of {engines.length} asset{engines.length !== 1 ? 's' : ''}
          {loadedCount < engines.length && ` · ${loadedCount} analyzed`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-borderLight overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-borderLight bg-subtle">
                {[
                  { label: 'Unit',    field: 'unit' },
                  { label: 'Cycle',   field: 'cycle' },
                  { label: 'RUL (cycles)', field: 'rul' },
                  { label: 'Safety Margin', field: 'margin' },
                  { label: 'Status',  field: null },
                  { label: 'Priority', field: 'priority' },
                  { label: '',        field: null },
                ].map(({ label, field }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-[10px] font-semibold tracking-wider text-textMuted uppercase select-none ${field ? 'cursor-pointer hover:text-textPrimary' : ''}`}
                    onClick={() => field && handleSort(field)}
                  >
                    {label}
                    {field && <SortIcon field={field} sortField={sortField} sortDir={sortDir} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-textMuted">
                    No assets match the current filters
                  </td>
                </tr>
              ) : rows.map(row => (
                <tr key={row.unit} className="border-b border-borderLight hover:bg-subtle transition-colors last:border-0">
                  <td className="px-4 py-3 text-sm font-bold text-textPrimary">
                    Unit {row.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-textSecondary">
                    {row.cycle != null ? row.cycle : <span className="text-textMuted text-xs">Cycle unavailable</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-textPrimary">
                    {row.rul != null ? `${row.rul.toFixed(1)}` : <span className="text-textMuted text-xs">Unavailable</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.margin != null ? (
                      <span className={`text-sm font-semibold ${
                        row.margin < 0 ? 'text-danger' :
                        row.margin < 15 ? 'text-warning' :
                        'text-textPrimary'
                      }`}>
                        {row.margin >= 0 ? '+' : ''}{row.margin.toFixed(1)}
                      </span>
                    ) : <span className="text-textMuted text-xs">Unavailable</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={row.status} />
                      <span className="text-xs font-medium text-textPrimary">
                        {row.status ?? <span className="text-textMuted">—</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={row.priority} />
                  </td>
                  <td className="px-4 py-3">
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('Asset Health', row.unit)}
                        className="text-[11px] text-textSecondary hover:text-textPrimary font-medium underline-offset-2 hover:underline transition-colors"
                      >
                        Inspect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loadedCount < engines.length && (
          <div className="px-4 py-3 border-t border-borderLight bg-subtle">
            <p className="text-[11px] text-textMuted flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading analysis for {engines.length - loadedCount} remaining asset{engines.length - loadedCount !== 1 ? 's' : ''}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
