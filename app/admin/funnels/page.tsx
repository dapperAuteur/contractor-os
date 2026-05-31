'use client';

// app/admin/funnels/page.tsx
// Conversion funnel dashboard — visualize user journey from signup to retention.

import { useEffect, useState, useCallback } from 'react';
import { Filter, Loader2, TrendingDown, ArrowDown } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface FunnelStage {
  name: string;
  count: number;
  dropoff_pct: number;
}

export default function FunnelsPage() {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await offlineFetch('/api/admin/funnels');
    if (res.ok) {
      const data = await res.json();
      setStages(data.stages ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-label="Loading funnel data">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" aria-hidden="true" />
      </div>
    );
  }

  const maxCount = stages.length > 0 ? stages[0].count : 1;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Filter className="w-6 h-6 text-amber-600" aria-hidden="true" />
          Conversion Funnel
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track how users progress from signup to retained subscriber
        </p>
      </div>

      {/* Funnel visualization */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-8">
        <div className="space-y-0">
          {stages.map((stage, i) => {
            const widthPct = maxCount > 0 ? Math.max(8, (stage.count / maxCount) * 100) : 8;
            const isLast = i === stages.length - 1;
            const conversionFromTop = maxCount > 0
              ? Math.round((stage.count / maxCount) * 100)
              : 0;

            return (
              <div key={stage.name}>
                {/* Stage bar */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Label */}
                  <div className="w-28 sm:w-36 shrink-0 text-right">
                    <p className="text-sm font-medium text-slate-900">{stage.name}</p>
                    <p className="text-xs text-slate-500">{conversionFromTop}% of total</p>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="h-10 sm:h-12 rounded-lg flex items-center justify-end px-3 transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: i === 0
                          ? '#f59e0b'
                          : `hsl(${38 - i * 5}, ${85 - i * 8}%, ${50 + i * 3}%)`,
                      }}
                    >
                      <span className="text-sm font-bold text-white drop-shadow-sm">
                        {stage.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drop-off indicator between stages */}
                {!isLast && stage.dropoff_pct > 0 && (
                  <div className="flex items-center gap-3 sm:gap-4 py-1.5">
                    <div className="w-28 sm:w-36" />
                    <div className="flex items-center gap-1.5 text-xs pl-2">
                      <ArrowDown className="w-3 h-3 text-red-400" aria-hidden="true" />
                      <span className={`font-medium ${
                        stage.dropoff_pct > 50 ? 'text-red-600' : stage.dropoff_pct > 25 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {stage.dropoff_pct}% drop-off
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      {stages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Biggest drop-off */}
          {(() => {
            const worstDrop = stages.reduce((worst, s) =>
              s.dropoff_pct > worst.dropoff_pct ? s : worst
            , stages[0]);
            return (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-2 text-xs text-red-500 uppercase tracking-wider mb-2">
                  <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                  Biggest Drop-off
                </div>
                <p className="text-lg font-bold text-slate-900">{worstDrop.name}</p>
                <p className="text-sm text-slate-500">{worstDrop.dropoff_pct}% of users lost at this stage</p>
              </div>
            );
          })()}

          {/* Overall conversion */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs text-amber-600 uppercase tracking-wider mb-2">
              Signup → Subscribed
            </div>
            <p className="text-lg font-bold text-slate-900">
              {stages.length >= 5 && stages[0].count > 0
                ? `${Math.round((stages[4].count / stages[0].count) * 100)}%`
                : '—'
              }
            </p>
            <p className="text-sm text-slate-500">conversion rate</p>
          </div>

          {/* Retention */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs text-lime-600 uppercase tracking-wider mb-2">
              90-Day Retention
            </div>
            <p className="text-lg font-bold text-slate-900">
              {stages.length >= 6 && stages[4].count > 0
                ? `${Math.round((stages[5].count / stages[4].count) * 100)}%`
                : '—'
              }
            </p>
            <p className="text-sm text-slate-500">of subscribers active in last 90 days</p>
          </div>
        </div>
      )}
    </div>
  );
}
