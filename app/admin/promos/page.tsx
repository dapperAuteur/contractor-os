'use client';

// app/admin/promos/page.tsx
// Admin promo campaign manager — create, toggle, view campaigns.

import { useEffect, useState, useCallback } from 'react';
import { Tag, Plus, Loader2, ToggleLeft, ToggleRight, X, Trash2 } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  stripe_coupon_id: string | null;
  plan_types: string[];
  promo_code: string | null;
  start_date: string;
  end_date: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

const DISCOUNT_LABELS: Record<string, string> = {
  percentage: '% Off',
  fixed: '$ Off',
  free_months: 'Free Months',
};

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';

export default function AdminPromosPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await offlineFetch('/api/admin/promos');
    if (res.ok) setCampaigns(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!name.trim() || !discountValue) return;
    setCreating(true);
    await offlineFetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: Number(discountValue),
        promo_code: promoCode.trim().toUpperCase() || null,
        end_date: endDate || null,
        max_uses: maxUses ? Number(maxUses) : null,
      }),
    });
    setName(''); setDescription(''); setDiscountValue(''); setPromoCode(''); setEndDate(''); setMaxUses('');
    setShowCreate(false);
    await load();
    setCreating(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await offlineFetch(`/api/admin/promos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this campaign?')) return;
    await offlineFetch(`/api/admin/promos/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Tag className="w-6 h-6 text-amber-600" aria-hidden="true" />
            Promo Campaigns
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage discount promotions with Stripe coupon integration</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition min-h-11 text-sm"
          aria-expanded={showCreate}
        >
          {showCreate ? <X className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
          {showCreate ? 'Cancel' : 'New Campaign'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="promo-name" className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
              <input id="promo-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Summer Sale" />
            </div>
            <div>
              <label htmlFor="promo-code" className="block text-sm font-medium text-slate-700 mb-1">Promo Code (optional)</label>
              <input id="promo-code" type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} className={`${inputClass} uppercase`} placeholder="SUMMER2026" />
            </div>
          </div>
          <div>
            <label htmlFor="promo-desc" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input id="promo-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="20% off lifetime for early adopters" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="discount-type" className="block text-sm font-medium text-slate-700 mb-1">Discount Type</label>
              <select id="discount-type" value={discountType} onChange={(e) => setDiscountType(e.target.value)} className={inputClass}>
                <option value="percentage">Percentage Off</option>
                <option value="fixed">Fixed Amount Off</option>
                <option value="free_months">Free Months</option>
              </select>
            </div>
            <div>
              <label htmlFor="discount-value" className="block text-sm font-medium text-slate-700 mb-1">
                {discountType === 'percentage' ? 'Percent Off' : discountType === 'fixed' ? 'Dollar Amount' : 'Months Free'}
              </label>
              <input id="discount-value" type="number" step={discountType === 'percentage' ? '1' : '0.01'} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className={inputClass} placeholder={discountType === 'percentage' ? '20' : '10.00'} />
            </div>
            <div>
              <label htmlFor="max-uses" className="block text-sm font-medium text-slate-700 mb-1">Max Uses (optional)</label>
              <input id="max-uses" type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={inputClass} placeholder="Unlimited" />
            </div>
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">End Date (optional)</label>
            <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !discountValue}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition disabled:opacity-50 min-h-11"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Create Campaign
          </button>
        </div>
      )}

      {/* Campaign list */}
      {loading ? (
        <div className="flex justify-center py-12" role="status">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" aria-hidden="true" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p>No promo campaigns yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.is_active ? 'bg-lime-100 text-lime-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                      {c.discount_value}{DISCOUNT_LABELS[c.discount_type] || ''}
                    </span>
                  </div>
                  {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                    {c.promo_code && <span>Code: <strong className="text-slate-700">{c.promo_code}</strong></span>}
                    <span>Uses: {c.current_uses}{c.max_uses ? `/${c.max_uses}` : ''}</span>
                    {c.end_date && <span>Ends: {new Date(c.end_date).toLocaleDateString()}</span>}
                    <span>Plans: {(c.plan_types ?? []).join(', ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(c.id, c.is_active)}
                    className="flex items-center justify-center min-h-11 min-w-11 p-2 rounded-lg transition hover:bg-slate-50"
                    aria-label={c.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {c.is_active
                      ? <ToggleRight className="w-5 h-5 text-lime-600" aria-hidden="true" />
                      : <ToggleLeft className="w-5 h-5 text-slate-400" aria-hidden="true" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="flex items-center justify-center min-h-11 min-w-11 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
