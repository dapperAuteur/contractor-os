'use client';

import { TrendingUp } from 'lucide-react';
import { isCalendarYear, getFiscalQuarter, type FiscalConfig } from '@/lib/fiscal';

interface RollingPeriod {
  confirmed: number;
  unscheduled: number;
  projected: number;
  total: number;
}

interface FiscalQuarter {
  label: string;
  quarter: number;
  start: string;
  end: string;
  confirmed: number;
  projected: number;
  total: number;
}

interface ForecastData {
  rolling_periods: Record<string, RollingPeriod>;
  fiscal: {
    config: FiscalConfig;
    label: string;
    ytd_income: number;
    quarters: FiscalQuarter[];
  };
  pipeline: { total: number; count: number };
  historical_avg_monthly: number;
}

interface Props {
  forecast: ForecastData | null;
  period: number;
  onPeriodChange: (days: number) => void;
  loading?: boolean;
}

const PERIODS = [30, 60, 90, 180, 270, 365];

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function IncomeForecastSection({ forecast, period, onPeriodChange, loading }: Props) {
  if (loading && !forecast) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-amber-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const current = forecast.rolling_periods[`${period}d`];
  if (!current) return null;

  const today = new Date().toISOString().split('T')[0];
  const currentQ = getFiscalQuarter(today, forecast.fiscal.config);
  const showFiscal = !isCalendarYear(forecast.fiscal.config);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" aria-hidden="true" />
          Income Forecast
        </h2>
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Forecast period selector">
          {PERIODS.map((d) => (
            <button
              key={d}
              onClick={() => onPeriodChange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border min-h-8 ${
                period === d
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="text-center py-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
          {period}-Day Forecast
        </p>
        <p className="text-3xl font-bold text-slate-900">
          ${fmt(current.total)}
        </p>
        {forecast.historical_avg_monthly > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            Avg monthly income: ${fmt(forecast.historical_avg_monthly)}
          </p>
        )}
      </div>

      {/* Three-tier breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Confirmed</p>
          <p className="text-xl font-bold text-emerald-600">${fmt(current.confirmed)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Known dates & amounts</p>
        </div>
        <div className="border border-dashed border-amber-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">In Pipeline</p>
          <p className="text-xl font-bold text-amber-600">${fmt(current.unscheduled)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {forecast.pipeline.count} job{forecast.pipeline.count !== 1 ? 's' : ''}, no pay date yet
          </p>
        </div>
        <div className="border border-dashed border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Trend Projected</p>
          <p className="text-xl font-bold text-slate-500">${fmt(current.projected)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Based on 6-month history</p>
        </div>
      </div>

      {/* Fiscal YTD + Quarters (only if non-calendar year) */}
      {showFiscal && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              {forecast.fiscal.label}
            </h3>
            <span className="text-sm font-medium text-slate-500">
              YTD: <span className="text-slate-900">${fmt(forecast.fiscal.ytd_income)}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {forecast.fiscal.quarters.map((q) => {
              const isCurrent = q.quarter === currentQ.quarter;
              return (
                <div
                  key={q.label}
                  className={`text-center p-3 rounded-lg ${
                    isCurrent
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-slate-50'
                  }`}
                >
                  <p className={`text-xs font-medium ${isCurrent ? 'text-amber-700' : 'text-slate-500'}`}>
                    {q.label}
                  </p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    ${fmt(q.total)}
                  </p>
                  {q.confirmed > 0 && q.projected > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      ${fmt(q.confirmed)} confirmed
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar year: show quarters without fiscal label */}
      {!showFiscal && forecast.fiscal.quarters.some((q) => q.total > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Quarterly Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {forecast.fiscal.quarters.map((q) => {
              const isCurrent = q.quarter === currentQ.quarter;
              return (
                <div
                  key={q.label}
                  className={`text-center p-3 rounded-lg ${
                    isCurrent
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-slate-50'
                  }`}
                >
                  <p className={`text-xs font-medium ${isCurrent ? 'text-amber-700' : 'text-slate-500'}`}>
                    {q.label}
                  </p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    ${fmt(q.total)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
