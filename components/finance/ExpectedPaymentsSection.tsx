'use client';

import { Briefcase, FileText, CalendarCheck } from 'lucide-react';

interface ExpectedPayment {
  source_type: 'job' | 'invoice';
  source_id: string;
  expected_date: string;
  label: string;
  reference_number: string | null;
  expected_amount: number;
  status: string;
  brand_id: string | null;
}

interface Props {
  payments: ExpectedPayment[];
  totalAmount: number;
  loading?: boolean;
}

export default function ExpectedPaymentsSection({ payments, totalAmount, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="h-24 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-amber-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (payments.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />
          Expected Payments
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
            {payments.length} payment{payments.length !== 1 ? 's' : ''}
          </span>
          <span className="text-sm font-bold text-emerald-600">
            ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2" role="list" aria-label="Expected incoming payments">
        {payments.map((p) => (
          <div
            key={`${p.source_type}-${p.source_id}`}
            className="min-w-48 border border-dashed border-emerald-300 rounded-xl p-3 shrink-0"
            role="listitem"
          >
            <div className="flex items-center gap-2 mb-1.5">
              {p.source_type === 'job' ? (
                <Briefcase className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              )}
              <span className="text-xs font-medium text-slate-400">
                {p.source_type === 'job' ? 'Job' : 'Invoice'}
                {p.reference_number && ` ${p.reference_number}`}
              </span>
            </div>
            <p className="text-sm font-semibold text-emerald-600">
              ${Number(p.expected_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-800 truncate mt-0.5">{p.label}</p>
            <p className="text-xs text-slate-400 mt-1">
              {new Date(p.expected_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
