'use client';

// app/dashboard/scan/page.tsx
// Universal Smart Scan page — scan any document and route to the right module.

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ScanLine, ExternalLink } from 'lucide-react';
import ScanButton from '@/components/scan/ScanButton';
import ScanResultRouter from '@/components/scan/ScanResultRouter';
import type { ScanResult } from '@/components/scan/ScanButton';
import type { ReceiptExtraction, MaintenanceExtraction } from '@/lib/ocr/extractors';
import { offlineFetch } from '@/lib/offline/offline-fetch';

export default function ScanPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState<{ type: string; href: string } | null>(null);

  const handleScanResult = useCallback((data: ScanResult) => {
    setScanResult(data);
    setError('');
    setSuccess(null);
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setScanResult(null);
  }, []);

  const handleCreateTransaction = useCallback(
    async (data: ReceiptExtraction, contactId?: string, scanImageId?: string) => {
      setCreating(true);
      try {
        const description = data.line_items?.length
          ? data.line_items.map((li) => li.description).join(', ')
          : undefined;

        const res = await offlineFetch('/api/finance/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: data.total_amount,
            type: 'expense',
            description: description?.slice(0, 500),
            vendor: data.vendor,
            transaction_date: data.date || new Date().toISOString().slice(0, 10),
            source: 'scan',
            tags: data.suggested_category ? [data.suggested_category] : [],
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to create transaction' }));
          setError(err.error);
          return;
        }

        const { transaction } = await res.json();

        if (data.line_items?.length) {
          await Promise.allSettled(
            data.line_items.map((li) =>
              offlineFetch('/api/items/prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  item_name: li.description,
                  category: li.category_hint || data.suggested_category,
                  price: li.total,
                  unit: 'each',
                  unit_price: li.unit_price,
                  vendor_contact_id: contactId || null,
                  vendor_name: data.vendor,
                  recorded_date: data.date || new Date().toISOString().slice(0, 10),
                  source: 'scan',
                }),
              }),
            ),
          );

          await offlineFetch('/api/finance/transactions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: transaction.id,
              source_module: 'scan',
              source_module_id: scanImageId || transaction.id,
            }),
          });
        }

        setSuccess({ type: 'Transaction', href: `/dashboard/finance/transactions/${transaction.id}` });
        setScanResult(null);
      } catch {
        setError('Failed to create transaction');
      } finally {
        setCreating(false);
      }
    },
    [],
  );

  const handleCreateMaintenance = useCallback(
    async (data: MaintenanceExtraction) => {
      setCreating(true);
      try {
        const params = new URLSearchParams();
        if (data.shop_name) params.set('vendor', data.shop_name);
        if (data.date) params.set('date', data.date);
        if (data.total_cost != null) params.set('cost', String(data.total_cost));
        if (data.odometer != null) params.set('odometer', String(data.odometer));
        if (data.services?.length) {
          params.set('description', data.services.map((s) => s.description).join(', '));
        }
        router.push(`/dashboard/travel/maintenance?${params.toString()}`);
      } finally {
        setCreating(false);
      }
    },
    [router],
  );

  const handleCreateJob = useCallback(
    (prefill: Record<string, unknown>) => {
      sessionStorage.setItem('scan_job_prefill', JSON.stringify(prefill));
      router.push('/dashboard/contractor/jobs/new?from=scan');
    },
    [router],
  );

  const handleAddToJob = useCallback(
    (prefill: Record<string, unknown>) => {
      sessionStorage.setItem('scan_job_prefill', JSON.stringify(prefill));
      router.push('/dashboard/contractor/jobs?action=scan-import');
    },
    [router],
  );

  const handleCreateInvoice = useCallback(
    (prefill: Record<string, unknown>) => {
      sessionStorage.setItem('scan_invoice_prefill', JSON.stringify(prefill));
      router.push('/dashboard/finance/invoices?from=scan');
    },
    [router],
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-amber-50 rounded-xl">
          <ScanLine className="w-6 h-6 text-amber-600" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Smart Scan</h1>
          <p className="text-sm text-slate-500">
            Scan documents to auto-fill jobs, invoices, and expenses
          </p>
        </div>
      </div>

      {/* Scan area */}
      {!scanResult && !success && (
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4 hover:border-amber-400 transition">
          <Camera className="w-12 h-12 text-slate-400 mx-auto" aria-hidden="true" />
          <div>
            <p className="text-slate-900 font-medium">
              Take a photo or select files
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Supports pay stubs, call sheets, invoices, receipts, and more (up to 10 files)
            </p>
          </div>
          <ScanButton
            onResult={handleScanResult}
            onError={handleError}
            label="Scan Document"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition cursor-pointer text-base min-h-11"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 underline hover:no-underline min-h-11"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scan result */}
      {scanResult && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <ScanResultRouter
            result={scanResult}
            onCreateTransaction={handleCreateTransaction}
            onCreateMaintenance={handleCreateMaintenance}
            onCreateJob={handleCreateJob}
            onCreateInvoice={handleCreateInvoice}
            onAddToJob={handleAddToJob}
            onDismiss={() => setScanResult(null)}
          />
          {creating && (
            <div className="mt-4 text-center text-sm text-amber-600">
              Creating...
            </div>
          )}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-green-700 font-medium">
            {success.type} created successfully!
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => router.push(success.href)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition min-h-11"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              View {success.type}
            </button>
            <ScanButton
              onResult={handleScanResult}
              onError={handleError}
              label="Scan Another"
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition cursor-pointer min-h-11"
            />
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
        <h3 className="font-semibold text-slate-900">Tips for best results</h3>
        <ul className="space-y-2 text-sm text-slate-500">
          <li>- Use good lighting and lay documents flat</li>
          <li>- Avoid glare on thermal receipt paper</li>
          <li>- Fill the frame with the document text</li>
          <li>- Up to 10 images/PDFs per scan for multi-page documents</li>
          <li>- Always review extracted values before saving</li>
        </ul>
      </div>
    </div>
  );
}
