'use client';

// app/admin/campaigns/page.tsx
// Admin email campaign manager — create, preview, send campaigns with audience targeting.

import { useEffect, useState, useCallback } from 'react';
import {
  Mail, Plus, Send, Loader2, CheckCircle2, AlertCircle, ChevronDown,
  ChevronUp, Trash2, Eye, Clock, Users as UsersIcon, X,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Campaign {
  id: string;
  title: string;
  subject: string;
  body_html: string;
  template_key: string | null;
  audience_filter: AudienceFilter;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

interface AudienceFilter {
  tiers?: string[];
  roles?: string[];
  activity?: string;
  has_feature?: string;
}

interface Template {
  key: string;
  title: string;
  subject: string;
  description: string;
  body_html: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-lime-100 text-lime-700',
  failed: 'bg-red-100 text-red-700',
};

const TIER_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'lifetime', label: 'Lifetime' },
];

const ROLE_OPTIONS = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'lister', label: 'Lister' },
  { value: 'teacher', label: 'Teacher' },
];

const ACTIVITY_OPTIONS = [
  { value: '', label: 'All users' },
  { value: 'active_7d', label: 'Active (last 7 days)' },
  { value: 'active_30d', label: 'Active (last 30 days)' },
  { value: 'inactive_30d', label: 'Inactive (30+ days)' },
];

const FEATURE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'jobs', label: 'Has jobs' },
  { value: 'courses', label: 'Has courses' },
  { value: 'equipment', label: 'Has equipment' },
  { value: 'travel', label: 'Has trips' },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [tiers, setTiers] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [activity, setActivity] = useState('');
  const [hasFeature, setHasFeature] = useState('');
  const [creating, setCreating] = useState(false);

  const loadCampaigns = useCallback(async () => {
    const res = await offlineFetch('/api/admin/campaigns');
    if (res.ok) setCampaigns(await res.json());
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await offlineFetch('/api/admin/campaigns/templates');
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCampaigns(), loadTemplates()]).finally(() => setLoading(false));
  }, [loadCampaigns, loadTemplates]);

  const handleTemplateSelect = (key: string) => {
    setTemplateKey(key);
    const tpl = templates.find((t) => t.key === key);
    if (tpl) {
      setTitle(tpl.title);
      setSubject(tpl.subject);
      setBodyHtml(tpl.body_html);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !subject.trim()) return;
    setCreating(true);
    const audienceFilter: AudienceFilter = {};
    if (tiers.length > 0) audienceFilter.tiers = tiers;
    if (roles.length > 0) audienceFilter.roles = roles;
    if (activity) audienceFilter.activity = activity;
    if (hasFeature) audienceFilter.has_feature = hasFeature;

    const res = await offlineFetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        subject,
        body_html: bodyHtml,
        template_key: templateKey || null,
        audience_filter: audienceFilter,
      }),
    });

    if (res.ok) {
      setTitle('');
      setSubject('');
      setBodyHtml('');
      setTemplateKey('');
      setTiers([]);
      setRoles([]);
      setActivity('');
      setHasFeature('');
      setShowCreate(false);
      await loadCampaigns();
    }
    setCreating(false);
  };

  const handleSend = async (campaignId: string) => {
    if (!confirm('Send this campaign now? This cannot be undone.')) return;
    setSending(campaignId);
    setSendResult(null);
    const res = await offlineFetch(`/api/admin/campaigns/${campaignId}/send`, { method: 'POST' });
    if (res.ok) {
      const result = await res.json();
      setSendResult(result);
      await loadCampaigns();
    }
    setSending(null);
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    setDeleting(campaignId);
    await offlineFetch(`/api/admin/campaigns/${campaignId}`, { method: 'DELETE' });
    await loadCampaigns();
    setDeleting(null);
  };

  const toggleCheckbox = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-label="Loading campaigns">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Mail className="w-6 h-6 text-amber-600" aria-hidden="true" />
            Email Campaigns
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create and send targeted email campaigns to your users</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition min-h-11 text-sm"
          aria-expanded={showCreate}
          aria-controls="create-campaign-form"
        >
          {showCreate ? <X className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
          {showCreate ? 'Cancel' : 'New Campaign'}
        </button>
      </div>

      {/* Send result banner */}
      {sendResult && (
        <div className="flex items-center gap-2 bg-lime-50 border border-lime-200 rounded-xl p-4" role="alert">
          <CheckCircle2 className="w-5 h-5 text-lime-600 shrink-0" aria-hidden="true" />
          <p className="text-sm text-lime-700">
            Sent to {sendResult.sent} recipients{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ''}
          </p>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div id="create-campaign-form" className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Create Campaign</h2>

          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label htmlFor="template-select" className="block text-sm font-medium text-slate-700 mb-1">Start from template</label>
              <select
                id="template-select"
                value={templateKey}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">Blank campaign</option>
                {templates.map((tpl) => (
                  <option key={tpl.key} value={tpl.key}>{tpl.title} — {tpl.description}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="campaign-title" className="block text-sm font-medium text-slate-700 mb-1">Campaign Title (internal)</label>
              <input
                id="campaign-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. March Welcome Drip"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label htmlFor="campaign-subject" className="block text-sm font-medium text-slate-700 mb-1">Email Subject Line</label>
              <input
                id="campaign-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Welcome to Work.WitUS"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          {/* Body HTML */}
          <div>
            <label htmlFor="campaign-body" className="block text-sm font-medium text-slate-700 mb-1">
              Email Body (HTML)
            </label>
            <textarea
              id="campaign-body"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              placeholder="Paste HTML or select a template above"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono"
            />
          </div>

          {/* Audience Filters */}
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800 mb-3">Audience Targeting</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tiers */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Subscription Tier</p>
                <div className="space-y-1.5">
                  {TIER_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tiers.includes(opt.value)}
                        onChange={() => toggleCheckbox(opt.value, tiers, setTiers)}
                        className="rounded border-slate-300"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">User Role</p>
                <div className="space-y-1.5">
                  {ROLE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roles.includes(opt.value)}
                        onChange={() => toggleCheckbox(opt.value, roles, setRoles)}
                        className="rounded border-slate-300"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div>
                <label htmlFor="filter-activity" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Activity</label>
                <select
                  id="filter-activity"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Feature Usage */}
              <div>
                <label htmlFor="filter-feature" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Feature Usage</label>
                <select
                  id="filter-feature"
                  value={hasFeature}
                  onChange={(e) => setHasFeature(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {FEATURE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim() || !subject.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition disabled:opacity-50 min-h-11 text-sm"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
              Save as Draft
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="flex items-center justify-center px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition min-h-11 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="space-y-3">
        {campaigns.length === 0 && !showCreate && (
          <div className="text-center py-16 text-slate-400">
            <Mail className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="text-sm mt-1">Create your first email campaign to start reaching your users</p>
          </div>
        )}

        {campaigns.map((c) => {
          const expanded = expandedId === c.id;
          const filter = c.audience_filter;
          const filterParts: string[] = [];
          if (filter.tiers?.length) filterParts.push(filter.tiers.join(', '));
          if (filter.roles?.length) filterParts.push(filter.roles.join(', '));
          if (filter.activity) filterParts.push(filter.activity.replace(/_/g, ' '));
          const audienceLabel = filterParts.length > 0 ? filterParts.join(' · ') : 'All users';

          return (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Row */}
              <button
                onClick={() => setExpandedId(expanded ? null : c.id)}
                className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left hover:bg-slate-50 transition min-h-11"
                aria-expanded={expanded}
                aria-controls={`campaign-detail-${c.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{c.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[c.status] || STATUS_STYLES.draft}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{c.subject}</p>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 shrink-0">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {audienceLabel}
                  </span>
                  {c.sent_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      {c.sent_count}
                    </span>
                  )}
                  {c.sent_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {new Date(c.sent_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {expanded
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                }
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div id={`campaign-detail-${c.id}`} className="border-t border-slate-200 px-4 sm:px-5 py-4 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-slate-900">{c.sent_count}</p>
                      <p className="text-xs text-slate-500">Sent</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-slate-900">{c.open_count}</p>
                      <p className="text-xs text-slate-500">Opened</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-slate-900">{c.click_count}</p>
                      <p className="text-xs text-slate-500">Clicked</p>
                    </div>
                  </div>

                  {/* Audience detail */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Audience</p>
                    <p className="text-sm text-slate-700">{audienceLabel}</p>
                  </div>

                  {/* Preview */}
                  {c.body_html && (
                    <details className="group">
                      <summary className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition min-h-11">
                        <Eye className="w-4 h-4" aria-hidden="true" />
                        Preview email
                      </summary>
                      <div className="mt-3 border border-slate-200 rounded-lg p-4 bg-slate-50 overflow-auto max-h-96">
                        <iframe
                          srcDoc={c.body_html}
                          title={`Preview of ${c.title}`}
                          className="w-full min-h-64 border-0"
                          sandbox=""
                        />
                      </div>
                    </details>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    {c.status === 'draft' && (
                      <button
                        onClick={() => handleSend(c.id)}
                        disabled={sending !== null}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-500 transition disabled:opacity-50 min-h-11 text-sm"
                      >
                        {sending === c.id
                          ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          : <Send className="w-4 h-4" aria-hidden="true" />
                        }
                        Send Now
                      </button>
                    )}
                    {c.status === 'failed' && (
                      <div className="flex items-center gap-2 text-sm text-red-600" role="alert">
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                        Campaign failed — check logs
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id || c.status === 'sending'}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition disabled:opacity-50 min-h-11 text-sm"
                      aria-label={`Delete campaign "${c.title}"`}
                    >
                      {deleting === c.id
                        ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        : <Trash2 className="w-4 h-4" aria-hidden="true" />
                      }
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
