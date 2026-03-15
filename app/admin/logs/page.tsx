'use client';

// app/admin/logs/page.tsx
// Admin app logs viewer with filtering, severity badges, and review actions.

import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, AlertCircle, Info, CheckCircle, Search, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import PaginationBar from '@/components/ui/PaginationBar';

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  module: string | null;
  message: string;
  metadata: Record<string, unknown>;
  user_id: string | null;
  is_reviewed: boolean;
  created_at: string;
}

const LEVELS = ['all', 'error', 'warn', 'info'] as const;
const SOURCES = ['all', 'api', 'webhook', 'sync', 'cron'] as const;

const LEVEL_STYLES: Record<string, { bg: string; text: string; icon: typeof AlertCircle }> = {
  error: { bg: 'bg-red-50', text: 'text-red-500', icon: AlertCircle },
  warn: { bg: 'bg-amber-50', text: 'text-amber-500', icon: AlertTriangle },
  info: { bg: 'bg-slate-50', text: 'text-slate-500', icon: Info },
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [level, setLevel] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [module, setModule] = useState('');
  const [search, setSearch] = useState('');
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Summary counts
  const [summary, setSummary] = useState({ errors24h: 0, warnings24h: 0, total24h: 0 });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (level !== 'all') params.set('level', level);
    if (source !== 'all') params.set('source', source);
    if (module) params.set('module', module);
    if (search) params.set('search', search);
    if (unreviewedOnly) params.set('unreviewed', 'true');
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    params.set('page', String(page));
    params.set('limit', '50');

    try {
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [level, source, module, search, unreviewedOnly, fromDate, toDate, page]);

  // Fetch 24h summary
  const fetchSummary = useCallback(async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    try {
      const [errRes, warnRes, allRes] = await Promise.all([
        fetch(`/api/admin/logs?level=error&from=${yesterday}&to=${today}&limit=1`),
        fetch(`/api/admin/logs?level=warn&from=${yesterday}&to=${today}&limit=1`),
        fetch(`/api/admin/logs?from=${yesterday}&to=${today}&limit=1`),
      ]);
      const [errData, warnData, allData] = await Promise.all([errRes.json(), warnRes.json(), allRes.json()]);
      setSummary({
        errors24h: errData.total ?? 0,
        warnings24h: warnData.total ?? 0,
        total24h: allData.total ?? 0,
      });
    } catch {}
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const markReviewed = async (id: string) => {
    await fetch(`/api/admin/logs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_reviewed: true }),
    });
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, is_reviewed: true } : l));
  };

  const markAllReviewed = async () => {
    const ids = logs.filter((l) => !l.is_reviewed && l.level !== 'info').map((l) => l.id);
    if (!ids.length) return;
    await fetch('/api/admin/logs/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    setLogs((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, is_reviewed: true } : l));
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">App Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Structured logs from API routes, webhooks, and background tasks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-500 uppercase tracking-wider">Errors (24h)</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.errors24h}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-500 uppercase tracking-wider">Warnings (24h)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary.warnings24h}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total (24h)</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{summary.total24h}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Level pills */}
          <div className="flex gap-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => { setLevel(l); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition min-h-11 ${
                  level === l ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {l === 'all' ? 'All' : l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>

          {/* Source select */}
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            className="bg-white text-sm text-slate-900 rounded-lg px-3 py-1.5 border border-slate-300"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Sources' : s}</option>
            ))}
          </select>

          {/* Module input */}
          <input
            type="text"
            placeholder="Module..."
            value={module}
            onChange={(e) => { setModule(e.target.value); setPage(1); }}
            className="bg-white text-sm text-slate-900 rounded-lg px-3 py-1.5 border border-slate-300 w-28 placeholder-slate-400"
          />

          {/* Date range */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="bg-white text-sm text-slate-900 rounded-lg px-2 py-1.5 border border-slate-300"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="bg-white text-sm text-slate-900 rounded-lg px-2 py-1.5 border border-slate-300"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white text-sm text-slate-900 rounded-lg pl-9 pr-3 py-2 border border-slate-300 placeholder-slate-400"
            />
          </div>

          {/* Unreviewed toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={unreviewedOnly}
              onChange={(e) => { setUnreviewedOnly(e.target.checked); setPage(1); }}
              className="rounded"
            />
            Unreviewed only
          </label>

          {/* Refresh */}
          <button onClick={fetchLogs} aria-label="Refresh logs" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition min-h-11 min-w-11 flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Mark all reviewed */}
          <button
            onClick={markAllReviewed}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-700 hover:bg-slate-200 transition min-h-11"
          >
            Mark page reviewed
          </button>
        </div>
      </div>

      {/* Results info */}
      <p className="text-xs text-slate-500">{total} log{total !== 1 ? 's' : ''} found</p>

      {/* Log Table */}
      <div className="space-y-1">
        {logs.map((log) => {
          const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;
          const LevelIcon = style.icon;
          const isExpanded = expandedId === log.id;

          return (
            <div key={log.id} className={`rounded-lg border border-slate-200 ${log.is_reviewed ? 'opacity-60' : ''}`}>
              <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition ${style.bg}`}
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <LevelIcon className={`w-4 h-4 shrink-0 ${style.text}`} />
                <span className={`text-xs font-mono uppercase w-12 ${style.text}`}>{log.level}</span>
                <span className="text-xs text-slate-500 w-16">{log.source}</span>
                {log.module && <span className="text-xs text-amber-600 w-24">{log.module}</span>}
                <span className="text-sm text-slate-800 flex-1 truncate">{log.message}</span>
                <span className="text-xs text-slate-500 shrink-0">{timeAgo(log.created_at)}</span>
                {!log.is_reviewed && log.level !== 'info' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markReviewed(log.id); }}
                    className="p-1 rounded hover:bg-slate-200 transition"
                    title="Mark reviewed"
                    aria-label="Mark as reviewed"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </button>
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </div>

              {isExpanded && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-2">
                    <div>ID: <span className="text-slate-700 font-mono">{log.id}</span></div>
                    <div>Time: <span className="text-slate-700">{new Date(log.created_at).toLocaleString()}</span></div>
                    {log.user_id && <div>User ID: <span className="text-slate-700 font-mono">{log.user_id}</span></div>}
                    <div>Reviewed: <span className="text-slate-700">{log.is_reviewed ? 'Yes' : 'No'}</span></div>
                  </div>
                  {Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 mb-1">Metadata:</p>
                      <pre className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-3 overflow-auto max-h-48">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!loading && logs.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Info className="w-8 h-8 mx-auto mb-2" />
            <p>No logs found matching your filters</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
