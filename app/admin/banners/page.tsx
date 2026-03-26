'use client';

// app/admin/banners/page.tsx
// Admin page for managing in-app marketing banners.

import { useEffect, useState, useCallback } from 'react';
import { Megaphone, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Banner {
  id: string;
  title: string;
  body: string;
  cta_text: string;
  cta_url: string;
  target_tiers: string[];
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

const TIER_OPTIONS = ['free', 'monthly', 'lifetime'];

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ctaText, setCtaText] = useState('Upgrade');
  const [ctaUrl, setCtaUrl] = useState('/pricing');
  const [tiers, setTiers] = useState<string[]>(['free']);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await offlineFetch('/api/admin/banners');
    if (res.ok) setBanners(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleTier = (tier: string) => {
    setTiers((prev) => prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]);
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    setCreating(true);
    const res = await offlineFetch('/api/admin/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, body, cta_text: ctaText, cta_url: ctaUrl,
        target_tiers: tiers,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      }),
    });
    if (res.ok) {
      setTitle(''); setBody(''); setCtaText('Upgrade'); setCtaUrl('/pricing');
      setTiers(['free']); setStartsAt(''); setEndsAt('');
      setShowCreate(false);
      await load();
    }
    setCreating(false);
  };

  const toggleActive = async (banner: Banner) => {
    await offlineFetch(`/api/admin/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...banner, is_active: !banner.is_active }),
    });
    await load();
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    // Use a PATCH to deactivate since we don't have a DELETE route
    await offlineFetch('/api/admin/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: false }),
    });
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-label="Loading banners">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-amber-600" aria-hidden="true" />
            Marketing Banners
          </h1>
          <p className="text-sm text-slate-500 mt-1">In-app upgrade prompts shown to targeted users</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition min-h-11 text-sm"
          aria-expanded={showCreate}
        >
          {showCreate ? <X className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
          {showCreate ? 'Cancel' : 'New Banner'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Create Banner</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="banner-title" className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                id="banner-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unlock Pro Features"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label htmlFor="banner-cta" className="block text-sm font-medium text-slate-700 mb-1">CTA Button Text</label>
              <input
                id="banner-cta"
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="banner-body" className="block text-sm font-medium text-slate-700 mb-1">Body Text</label>
            <textarea
              id="banner-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Short promotional message"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="banner-url" className="block text-sm font-medium text-slate-700 mb-1">CTA URL</label>
              <input
                id="banner-url"
                type="text"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label htmlFor="banner-starts" className="block text-sm font-medium text-slate-700 mb-1">Start Date (optional)</label>
              <input
                id="banner-starts"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label htmlFor="banner-ends" className="block text-sm font-medium text-slate-700 mb-1">End Date (optional)</label>
              <input
                id="banner-ends"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700 mb-2">Target Tiers</legend>
            <div className="flex flex-wrap gap-3">
              {TIER_OPTIONS.map((tier) => (
                <label key={tier} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tiers.includes(tier)}
                    onChange={() => toggleTier(tier)}
                    className="rounded border-slate-300"
                  />
                  <span className="capitalize">{tier}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim() || !body.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition disabled:opacity-50 min-h-11 text-sm"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Create Banner
            </button>
          </div>
        </div>
      )}

      {/* Banner list */}
      {banners.length === 0 && !showCreate ? (
        <div className="text-center py-16 text-slate-400">
          <Megaphone className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p className="text-lg font-medium">No banners yet</p>
          <p className="text-sm mt-1">Create a banner to promote upgrades to your free users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900">{b.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${b.is_active ? 'bg-lime-100 text-lime-700' : 'bg-slate-100 text-slate-500'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{b.body}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {b.target_tiers.map((t) => (
                      <span key={t} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full capitalize">{t}</span>
                    ))}
                    {b.starts_at && <span className="text-xs text-slate-400">From {new Date(b.starts_at).toLocaleDateString()}</span>}
                    {b.ends_at && <span className="text-xs text-slate-400">Until {new Date(b.ends_at).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(b)}
                    className="flex items-center justify-center min-h-11 min-w-11 p-2 text-slate-500 hover:text-slate-700 transition rounded-lg"
                    aria-label={b.is_active ? 'Deactivate banner' : 'Activate banner'}
                  >
                    {b.is_active
                      ? <ToggleRight className="w-5 h-5 text-lime-600" aria-hidden="true" />
                      : <ToggleLeft className="w-5 h-5" aria-hidden="true" />
                    }
                  </button>
                  <button
                    onClick={() => deleteBanner(b.id)}
                    className="flex items-center justify-center min-h-11 min-w-11 p-2 text-red-400 hover:text-red-600 transition rounded-lg"
                    aria-label={`Delete banner "${b.title}"`}
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
