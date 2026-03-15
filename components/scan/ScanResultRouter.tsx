'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  ChevronDown,
  DollarSign,
  ChefHat,
  Wrench,
  Fuel,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Package,
  HardHat,
  FileText,
  ClipboardList,
  Stethoscope,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import type { DocumentType } from '@/lib/ocr/classify';
import type {
  ReceiptExtraction,
  ReceiptLineItem,
  RecipeExtraction,
  MaintenanceExtraction,
  PayStubExtraction,
  InvoiceExtraction,
  CallSheetExtraction,
} from '@/lib/ocr/extractors';
import ContactAutocomplete from '@/components/ui/ContactAutocomplete';
import type { ScanResult } from './ScanButton';

interface ItemMatch {
  original_name: string;
  normalized_name: string;
  matches: {
    id: string;
    name: string;
    last_price: number | null;
    last_date: string | null;
    vendor_name: string | null;
    source_table: string;
  }[];
  is_new: boolean;
}

interface ScanResultRouterProps {
  result: ScanResult;
  onCreateTransaction?: (data: ReceiptExtraction, contactId?: string, scanImageId?: string) => void;
  onCreateRecipe?: (data: RecipeExtraction, contactId?: string) => void;
  onCreateMaintenance?: (data: MaintenanceExtraction, contactId?: string) => void;
  onCreateJob?: (prefill: Record<string, unknown>) => void;
  onCreateInvoice?: (prefill: Record<string, unknown>) => void;
  onAddToJob?: (prefill: Record<string, unknown>) => void;
  onDismiss: () => void;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  receipt: 'Store/Restaurant Receipt',
  recipe: 'Recipe',
  fuel_receipt: 'Fuel Receipt',
  maintenance_invoice: 'Maintenance Invoice',
  pay_stub: 'Pay Stub / Estimated Pay',
  invoice: 'Billing Invoice',
  call_sheet: 'Call Sheet / Work Assignment',
  medical: 'Medical Document',
  unknown: 'Unknown Document',
};

const DOC_TYPE_ICONS: Record<DocumentType, typeof DollarSign> = {
  receipt: DollarSign,
  recipe: ChefHat,
  fuel_receipt: Fuel,
  maintenance_invoice: Wrench,
  pay_stub: DollarSign,
  invoice: FileText,
  call_sheet: ClipboardList,
  medical: Stethoscope,
  unknown: AlertCircle,
};

const OVERRIDE_OPTIONS: DocumentType[] = [
  'receipt', 'recipe', 'fuel_receipt', 'maintenance_invoice',
  'pay_stub', 'invoice', 'call_sheet', 'medical',
];

export default function ScanResultRouter({
  result,
  onCreateTransaction,
  onCreateRecipe,
  onCreateMaintenance,
  onCreateJob,
  onCreateInvoice,
  onAddToJob,
  onDismiss,
}: ScanResultRouterProps) {
  const [documentType, setDocumentType] = useState<DocumentType>(result.documentType);
  const [extracted] = useState<Record<string, unknown>>(result.extracted);
  const [showOverride, setShowOverride] = useState(false);
  const [reExtracting, setReExtracting] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactId] = useState<string | undefined>();
  const [itemMatches, setItemMatches] = useState<ItemMatch[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    const data = result.extracted;
    if (result.documentType === 'receipt' && (data as unknown as ReceiptExtraction).vendor) {
      setContactName((data as unknown as ReceiptExtraction).vendor || '');
    } else if (result.documentType === 'maintenance_invoice' && (data as unknown as MaintenanceExtraction).shop_name) {
      setContactName((data as unknown as MaintenanceExtraction).shop_name || '');
    } else if (result.documentType === 'invoice' && (data as unknown as InvoiceExtraction).vendor) {
      setContactName((data as unknown as InvoiceExtraction).vendor || '');
    } else if (result.documentType === 'call_sheet' && (data as unknown as CallSheetExtraction).client_name) {
      setContactName((data as unknown as CallSheetExtraction).client_name || '');
    } else if (result.documentType === 'pay_stub' && (data as unknown as PayStubExtraction).client_name) {
      setContactName((data as unknown as PayStubExtraction).client_name || '');
    }
  }, [result]);

  const matchItems = useCallback(async (data: Record<string, unknown>) => {
    const receipt = data as unknown as ReceiptExtraction;
    if (!receipt.line_items?.length) return;
    setMatchLoading(true);
    try {
      const res = await offlineFetch('/api/ocr/match-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: receipt.line_items.map((li: ReceiptLineItem) => ({
            name: li.description,
            unit_price: li.unit_price,
            category_hint: li.category_hint,
          })),
        }),
      });
      if (res.ok) {
        const { results } = await res.json();
        setItemMatches(results);
      }
    } catch {
      // Non-fatal
    } finally {
      setMatchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (documentType === 'receipt') matchItems(extracted);
  }, [documentType, extracted, matchItems]);

  const handleOverride = async (newType: DocumentType) => {
    if (newType === documentType) { setShowOverride(false); return; }
    setReExtracting(true);
    setShowOverride(false);
    setDocumentType(newType);
    setReExtracting(false);
  };

  const confidenceColor =
    result.confidence >= 0.8
      ? 'text-green-400 bg-green-900/30'
      : result.confidence >= 0.5
        ? 'text-amber-400 bg-amber-900/30'
        : 'text-red-400 bg-red-900/30';

  const Icon = DOC_TYPE_ICONS[documentType];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-900/30 rounded-lg">
            <Icon className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {DOC_TYPE_LABELS[documentType]}
            </h3>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${confidenceColor}`}>
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 min-h-11"
          >
            Change type <ChevronDown className="w-3 h-3" />
          </button>
          {showOverride && (
            <div className="absolute right-0 top-12 bg-slate-100 border border-slate-200 rounded-xl shadow-lg z-10 w-56">
              {OVERRIDE_OPTIONS.map((type) => (
                <button
                  key={type}
                  onClick={() => handleOverride(type)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 first:rounded-t-xl last:rounded-b-xl ${
                    type === documentType ? 'bg-amber-900/30 text-amber-400 font-medium' : 'text-slate-700'
                  }`}
                >
                  {DOC_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {reExtracting && (
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <Sparkles className="w-4 h-4 animate-pulse" />
          Re-analyzing document...
        </div>
      )}

      {/* Contact attachment */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {documentType === 'recipe' ? 'Author / Source' : 'Vendor / Client'}
        </label>
        <ContactAutocomplete
          value={contactName}
          onChange={(name, defaultCategoryId) => {
            setContactName(name);
            void defaultCategoryId;
          }}
          contactType="vendor"
          placeholder={
            documentType === 'recipe'
              ? 'Recipe author or source...'
              : 'Store, client, or service provider...'
          }
        />
      </div>

      {/* Saved image indicator */}
      {result.imageUrl && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/30 px-3 py-2 rounded-lg">
          <ImageIcon className="w-4 h-4" />
          Image saved
        </div>
      )}

      {/* Module-specific previews */}
      {documentType === 'receipt' && (
        <ReceiptPreview data={extracted as unknown as ReceiptExtraction} itemMatches={itemMatches} matchLoading={matchLoading} />
      )}
      {documentType === 'recipe' && (
        <RecipePreview data={extracted as unknown as RecipeExtraction} />
      )}
      {documentType === 'maintenance_invoice' && (
        <MaintenancePreview data={extracted as unknown as MaintenanceExtraction} />
      )}
      {documentType === 'pay_stub' && (
        <PayStubPreview data={extracted as unknown as PayStubExtraction} />
      )}
      {documentType === 'invoice' && (
        <InvoicePreview data={extracted as unknown as InvoiceExtraction} />
      )}
      {documentType === 'call_sheet' && (
        <CallSheetPreview data={extracted as unknown as CallSheetExtraction} />
      )}

      {/* Confidence notes */}
      {(extracted as { confidence_notes?: string }).confidence_notes && (
        <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-900/30 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {(extracted as { confidence_notes: string }).confidence_notes}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {documentType === 'receipt' && onCreateTransaction && (
          <button
            onClick={() => onCreateTransaction(extracted as unknown as ReceiptExtraction, contactId, result.scanImageId)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition min-h-11"
          >
            <DollarSign className="w-4 h-4" />
            Create Transaction
          </button>
        )}
        {documentType === 'recipe' && onCreateRecipe && (
          <button
            onClick={() => onCreateRecipe(extracted as unknown as RecipeExtraction, contactId)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition min-h-11"
          >
            <ChefHat className="w-4 h-4" />
            Create Recipe
          </button>
        )}
        {documentType === 'maintenance_invoice' && onCreateMaintenance && (
          <button
            onClick={() => onCreateMaintenance(extracted as unknown as MaintenanceExtraction, contactId)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition min-h-11"
          >
            <Wrench className="w-4 h-4" />
            Create Maintenance Record
          </button>
        )}
        {(documentType === 'pay_stub' || documentType === 'call_sheet') && onCreateJob && result.prefills?.job && (
          <button
            onClick={() => onCreateJob(result.prefills.job!)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition min-h-11"
          >
            <HardHat className="w-4 h-4" />
            Create Job
          </button>
        )}
        {(documentType === 'pay_stub' || documentType === 'call_sheet') && onAddToJob && result.prefills?.job && (
          <button
            onClick={() => onAddToJob(result.prefills.job!)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-amber-600/50 text-amber-400 rounded-xl font-medium hover:bg-amber-600/10 transition min-h-11"
          >
            <HardHat className="w-4 h-4" />
            Add to Existing Job
          </button>
        )}
        {documentType === 'invoice' && onCreateInvoice && result.prefills?.invoice && (
          <button
            onClick={() => onCreateInvoice(result.prefills.invoice!)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition min-h-11"
          >
            <FileText className="w-4 h-4" />
            Create Invoice
          </button>
        )}
        <button
          onClick={onDismiss}
          className="px-4 py-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition min-h-11"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Pay Stub Preview ────────────────────────────────────────────

function PayStubPreview({ data }: { data: PayStubExtraction }) {
  const totalEarnings = data.earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) ?? 0;
  const totalBenefits = data.benefits?.reduce((sum, b) => sum + (b.amount || 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.client_name && (
          <SummaryCard label="Client" value={data.client_name} />
        )}
        {data.event_name && (
          <SummaryCard label="Event" value={data.event_name} />
        )}
        {data.work_date && (
          <SummaryCard label="Work Date" value={data.work_date} />
        )}
        {data.total_hours != null && (
          <SummaryCard label="Hours" value={`${data.total_hours}h`} />
        )}
      </div>

      {data.earnings?.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-2">Earnings</h5>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Type</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Rate</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Hours</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.earnings.map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-900">{e.type}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{e.rate != null ? `$${e.rate.toFixed(2)}` : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{e.hours ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-900">${e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-sm text-slate-500 text-right">
            Total Earnings: <span className="text-slate-900 font-medium">${totalEarnings.toFixed(2)}</span>
          </div>
        </div>
      )}

      {data.benefits?.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-2">Benefits</h5>
          <ul className="space-y-1 text-sm">
            {data.benefits.map((b, i) => (
              <li key={i} className="flex justify-between text-slate-700">
                <span>{b.name}</span>
                <span className="text-slate-900">${b.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 text-sm text-slate-500 text-right">
            Total Benefits: <span className="text-slate-900 font-medium">${totalBenefits.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-4 text-sm text-slate-500">
        {data.time_in && <span>In: {data.time_in}</span>}
        {data.time_out && <span>Out: {data.time_out}</span>}
        {data.est_pay_date && <span>Pay Date: {data.est_pay_date}</span>}
      </div>
    </div>
  );
}

// ── Invoice Preview ─────────────────────────────────────────────

function InvoicePreview({ data }: { data: InvoiceExtraction }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.vendor && <SummaryCard label="Vendor" value={data.vendor} />}
        {data.invoice_number && <SummaryCard label="Invoice #" value={data.invoice_number} />}
        {data.date && <SummaryCard label="Date" value={data.date} />}
        {data.total != null && <SummaryCard label="Total" value={`$${data.total.toFixed(2)}`} />}
      </div>

      {data.line_items?.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-2">Line Items ({data.line_items.length})</h5>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Description</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Price</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.line_items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-900">{item.description}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-slate-700">${item.unit_price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-slate-900">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-4 text-sm text-slate-500">
        {data.subtotal != null && <span>Subtotal: ${data.subtotal.toFixed(2)}</span>}
        {data.tax != null && <span>Tax: ${data.tax.toFixed(2)}</span>}
        {data.due_date && <span>Due: {data.due_date}</span>}
        {data.payment_terms && <span>{data.payment_terms}</span>}
      </div>
    </div>
  );
}

// ── Call Sheet Preview ──────────────────────────────────────────

function CallSheetPreview({ data }: { data: CallSheetExtraction }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.client_name && <SummaryCard label="Client" value={data.client_name} />}
        {data.event_name && <SummaryCard label="Event" value={data.event_name} />}
        {data.job_number && <SummaryCard label="Job #" value={data.job_number} />}
        {data.location_name && <SummaryCard label="Location" value={data.location_name} />}
        {data.department && <SummaryCard label="Department" value={data.department} />}
        {data.union_local && <SummaryCard label="Union" value={data.union_local} />}
      </div>

      {data.work_dates?.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-2">
            Work Dates ({data.work_dates.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {data.work_dates.map((date, i) => (
              <span key={i} className="px-2.5 py-1 bg-amber-900/30 text-amber-400 text-sm rounded-lg">
                {date}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 text-sm text-slate-500">
        {data.call_time && <span>Call: {data.call_time}</span>}
        {data.wrap_time && <span>Wrap: {data.wrap_time}</span>}
      </div>

      <div className="flex gap-4 text-sm text-slate-500">
        {data.poc_name && <span>POC: {data.poc_name} {data.poc_phone && `(${data.poc_phone})`}</span>}
        {data.crew_coordinator_name && <span>Coord: {data.crew_coordinator_name} {data.crew_coordinator_phone && `(${data.crew_coordinator_phone})`}</span>}
      </div>

      {data.notes && (
        <p className="text-sm text-slate-500 whitespace-pre-wrap">{data.notes}</p>
      )}
    </div>
  );
}

// ── Receipt Preview ─────────────────────────────────────────────

function ReceiptPreview({
  data,
  itemMatches,
  matchLoading,
}: {
  data: ReceiptExtraction;
  itemMatches: ItemMatch[];
  matchLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.vendor && <SummaryCard label="Vendor" value={data.vendor} />}
        {data.date && <SummaryCard label="Date" value={data.date} />}
        {data.total_amount != null && <SummaryCard label="Total" value={`$${data.total_amount.toFixed(2)}`} />}
        {data.suggested_category && <SummaryCard label="Category" value={data.suggested_category} />}
      </div>

      {data.line_items?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Line Items ({data.line_items.length})</h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Item</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Price</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.line_items.map((item, i) => {
                  const match = itemMatches.find(
                    (m) => m.original_name.toLowerCase() === item.description.toLowerCase(),
                  );
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-900">{item.description}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-900">${item.total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        {matchLoading ? (
                          <span className="text-xs text-slate-400">...</span>
                        ) : match && !match.is_new ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            Found
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">
                            <Package className="w-3 h-3" />
                            New
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-4 text-sm text-slate-500">
        {data.subtotal != null && <span>Subtotal: ${data.subtotal.toFixed(2)}</span>}
        {data.tax != null && <span>Tax: ${data.tax.toFixed(2)}</span>}
        {data.tip != null && <span>Tip: ${data.tip.toFixed(2)}</span>}
        {data.payment_method && <span className="capitalize">{data.payment_method}</span>}
      </div>
    </div>
  );
}

// ── Recipe Preview ──────────────────────────────────────────────

function RecipePreview({ data }: { data: RecipeExtraction }) {
  return (
    <div className="space-y-4">
      {data.title && <h4 className="text-lg font-semibold text-slate-900">{data.title}</h4>}
      <div className="flex gap-4 text-sm text-slate-500">
        {data.servings && <span>Serves {data.servings}</span>}
        {data.prep_time_minutes && <span>Prep: {data.prep_time_minutes}m</span>}
        {data.cook_time_minutes && <span>Cook: {data.cook_time_minutes}m</span>}
      </div>
      {data.ingredients?.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-2">Ingredients ({data.ingredients.length})</h5>
          <ul className="space-y-1 text-sm text-slate-700">
            {data.ingredients.map((ing, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-slate-400 min-w-[4rem] text-right">
                  {ing.quantity != null ? `${ing.quantity} ${ing.unit || ''}` : ''}
                </span>
                <span>{ing.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.instructions && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-1">Instructions</h5>
          <p className="text-sm text-slate-500 line-clamp-4 whitespace-pre-wrap">{data.instructions}</p>
        </div>
      )}
    </div>
  );
}

// ── Maintenance Preview ─────────────────────────────────────────

function MaintenancePreview({ data }: { data: MaintenanceExtraction }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.shop_name && <SummaryCard label="Shop" value={data.shop_name} />}
        {data.date && <SummaryCard label="Date" value={data.date} />}
        {data.total_cost != null && <SummaryCard label="Total" value={`$${data.total_cost.toFixed(2)}`} />}
        {data.odometer != null && <SummaryCard label="Odometer" value={`${data.odometer.toLocaleString()} mi`} />}
      </div>
      {data.services?.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-2">Services</h5>
          <ul className="space-y-1 text-sm">
            {data.services.map((s, i) => (
              <li key={i} className="flex justify-between text-slate-700">
                <span>{s.description}</span>
                <span className="text-slate-900">${s.cost.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.parts?.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-2">Parts</h5>
          <ul className="space-y-1 text-sm">
            {data.parts.map((p, i) => (
              <li key={i} className="flex justify-between text-slate-700">
                <span>{p.name} {p.quantity > 1 ? `x${p.quantity}` : ''}</span>
                <span className="text-slate-900">${p.cost.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Shared summary card ─────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-100 rounded-lg p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-medium text-slate-900 truncate">{value}</div>
    </div>
  );
}
