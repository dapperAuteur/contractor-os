'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Users, Phone, MessageSquare,
  ArrowRight, Loader2, X, List, Building2, ChevronDown, ArrowUpDown,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import Modal from '@/components/ui/Modal';

interface ContactPhone { id: string; phone: string; label: string; is_primary: boolean; }
interface ContactEmail { id: string; email: string; label: string; is_primary: boolean; }
interface ContactTag { id: string; tag_type: string; value: string; }
interface ContactAddress {
  id: string; label: string; street: string | null; city: string | null;
  state: string | null; postal_code: string | null; country: string | null;
  is_primary: boolean; sort_order: number;
}

interface Contact {
  id: string;
  name: string;
  job_title: string | null;
  company_name: string | null;
  home_city: string | null;
  home_state: string | null;
  phone: string | null;
  email: string | null;
  total_jobs_together: number;
  last_worked_with: string | null;
  contact_phones: ContactPhone[];
  contact_emails: ContactEmail[];
  contact_tags: ContactTag[];
  contact_addresses: ContactAddress[];
}

interface Company { name: string; contact_count: number; }

type SortMode = 'name' | 'recent' | 'frequent';

/* ── Fuzzy match helper ── */
function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  // char-by-char fuzzy: every query char must appear in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function contactMatchesSearch(c: Contact, query: string): boolean {
  if (!query) return true;
  const fields = [
    c.name,
    c.job_title,
    c.company_name,
    c.home_city,
    c.home_state,
    c.phone,
    c.email,
    ...(c.contact_phones?.map((p) => p.phone) ?? []),
    ...(c.contact_emails?.map((e) => e.email) ?? []),
    ...(c.contact_tags?.map((t) => t.value) ?? []),
    ...(c.contact_addresses?.map((a) => [a.city, a.state, a.street].filter(Boolean).join(' ')) ?? []),
  ];
  return fields.some((f) => f && fuzzyMatch(query, f));
}

export default function ContactsPage() {
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [viewMode, setViewMode] = useState<'list' | 'company'>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // New contact form state
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhones, setFormPhones] = useState([{ phone: '', label: 'mobile' }]);
  const [formEmails, setFormEmails] = useState([{ email: '', label: 'work' }]);
  const [formAddresses, setFormAddresses] = useState([{ label: 'home', street: '', city: '', state: '', postal_code: '', country: '' }]);
  const [formWebsite, setFormWebsite] = useState('');
  const [formPortalUrl, setFormPortalUrl] = useState('');
  const [formPortalCompanyId, setFormPortalCompanyId] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200', sort: sortMode });

    const [contactsRes, companiesRes] = await Promise.all([
      offlineFetch(`/api/contractor/contacts?${params}`),
      offlineFetch('/api/contractor/contacts/companies'),
    ]);

    const cData = await contactsRes.json();
    const compData = await companiesRes.json();
    setAllContacts(cData.contacts ?? []);
    setCompanies(compData.companies ?? []);
    setLoading(false);
  }, [sortMode]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Client-side fuzzy filter + company filter
  const contacts = useMemo(() => {
    let list = allContacts;
    if (search.trim()) {
      list = list.filter((c) => contactMatchesSearch(c, search.trim()));
    }
    if (companyFilter) {
      list = list.filter((c) =>
        c.contact_tags?.some((t) => t.tag_type === 'company' && t.value.toLowerCase() === companyFilter.toLowerCase()),
      );
    }
    return list;
  }, [allContacts, search, companyFilter]);

  const resetForm = () => {
    setFormName('');
    setFormTitle('');
    setFormCompany('');
    setFormPhones([{ phone: '', label: 'mobile' }]);
    setFormEmails([{ email: '', label: 'work' }]);
    setFormAddresses([{ label: 'home', street: '', city: '', state: '', postal_code: '', country: '' }]);
    setFormWebsite('');
    setFormPortalUrl('');
    setFormPortalCompanyId('');
    setFormNotes('');
  };

  const handleAdd = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    const phones = formPhones.filter((p) => p.phone.trim()).map((p, i) => ({
      phone: p.phone.trim(), label: p.label, is_primary: i === 0,
    }));
    const emails = formEmails.filter((e) => e.email.trim()).map((e, i) => ({
      email: e.email.trim(), label: e.label, is_primary: i === 0,
    }));
    const addresses = formAddresses
      .filter((a) => a.street.trim() || a.city.trim() || a.state.trim())
      .map((a, i) => ({
        label: a.label, street: a.street.trim() || null, city: a.city.trim() || null,
        state: a.state.trim() || null, postal_code: a.postal_code.trim() || null,
        country: a.country.trim() || null, is_primary: i === 0,
      }));

    await offlineFetch('/api/contractor/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName.trim(),
        job_title: formTitle.trim() || null,
        company_name: formCompany.trim() || null,
        website: formWebsite.trim() || null,
        paycheck_portal_url: formPortalUrl.trim() || null,
        paycheck_portal_company_id: formPortalCompanyId.trim() || null,
        notes: formNotes.trim() || null,
        phones, emails, addresses,
      }),
    });

    setSaving(false);
    setShowAdd(false);
    resetForm();
    fetchContacts();
  };

  const getPrimaryPhone = (c: Contact) => {
    const primary = c.contact_phones?.find((p) => p.is_primary);
    return primary?.phone ?? c.contact_phones?.[0]?.phone ?? c.phone;
  };

  // Group by company for company view
  const groupedByCompany = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    const companyTags = c.contact_tags?.filter((t) => t.tag_type === 'company') ?? [];
    if (companyTags.length === 0) {
      (acc['No Company'] ??= []).push(c);
    } else {
      for (const tag of companyTags) (acc[tag.value] ??= []).push(c);
    }
    return acc;
  }, {});

  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const selectClass = 'w-20 shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-amber-400" size={28} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
          aria-label="Add new contact"
        >
          <Plus size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Add Contact</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search name, company, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9`}
            aria-label="Search contacts by name, company, phone, email, or tag"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Company filter */}
          <div className="relative">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className={`${inputClass} min-w-35 appearance-none pr-8`}
              aria-label="Filter by company"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.name} value={c.name}>{c.name} ({c.contact_count})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className={`${inputClass} min-w-30 appearance-none pr-8 pl-8`}
              aria-label="Sort contacts"
            >
              <option value="name">A-Z</option>
              <option value="recent">Recent</option>
              <option value="frequent">Most Jobs</option>
            </select>
            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden" role="group" aria-label="View mode">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-2.5 text-sm min-h-11 ${
                viewMode === 'list' ? 'bg-amber-50 text-amber-700' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List size={16} aria-hidden="true" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('company')}
              className={`flex items-center gap-1 px-3 py-2.5 text-sm min-h-11 border-l border-slate-300 ${
                viewMode === 'company' ? 'bg-amber-50 text-amber-700' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-label="Company view"
              aria-pressed={viewMode === 'company'}
            >
              <Building2 size={16} aria-hidden="true" />
              <span className="hidden sm:inline">By Company</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active filters */}
      {companyFilter && (
        <button
          type="button"
          onClick={() => setCompanyFilter('')}
          className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 min-h-11"
          aria-label={`Clear ${companyFilter} filter`}
        >
          {companyFilter} <X size={12} aria-hidden="true" />
        </button>
      )}

      {/* Results count */}
      {!loading && contacts.length > 0 && (
        <p className="text-xs text-slate-400" aria-live="polite">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* Contact List */}
      {loading ? (
        <div className="flex justify-center py-12" role="status">
          <Loader2 className="animate-spin text-slate-400" size={24} aria-hidden="true" />
          <span className="sr-only">Loading contacts</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400" role="status">
          {search || companyFilter ? 'No contacts match your search.' : 'No contacts yet.'}{' '}
          <button type="button" onClick={() => setShowAdd(true)} className="text-amber-600 hover:underline">
            Add one
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2" role="list" aria-label="Contacts">
          {contacts.map((c) => {
            const primaryPhone = getPrimaryPhone(c);
            return (
              <Link
                key={c.id}
                href={`/dashboard/contractor/contacts/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
                role="listitem"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{c.name}</div>
                  <div className="mt-0.5 text-sm text-slate-500 truncate">
                    {c.job_title && <span>{c.job_title}</span>}
                    {c.job_title && c.company_name && <span> · </span>}
                    {c.company_name && <span>{c.company_name}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    {c.total_jobs_together > 0 && <span>{c.total_jobs_together} job{c.total_jobs_together !== 1 ? 's' : ''}</span>}
                    {primaryPhone && <span>{primaryPhone}</span>}
                    {(c.contact_addresses?.[0]?.city || c.home_city) && (
                      <span>
                        {[c.contact_addresses?.[0]?.city ?? c.home_city, c.contact_addresses?.[0]?.state ?? c.home_state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {primaryPhone && (
                    <a
                      href={`tel:${primaryPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      aria-label={`Call ${c.name}`}
                    >
                      <Phone size={16} aria-hidden="true" />
                    </a>
                  )}
                  {primaryPhone && (
                    <a
                      href={`sms:${primaryPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      aria-label={`Text ${c.name}`}
                    >
                      <MessageSquare size={16} aria-hidden="true" />
                    </a>
                  )}
                  <ArrowRight size={16} className="text-slate-400" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Company grouped view */
        <div className="space-y-6" role="list" aria-label="Contacts by company">
          {Object.entries(groupedByCompany)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([companyName, companyContacts]) => (
              <div key={companyName} role="listitem">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Building2 size={14} className="text-slate-400" aria-hidden="true" />
                  {companyName}
                  <span className="text-slate-400 font-normal">({companyContacts.length})</span>
                </h3>
                <div className="space-y-1.5 pl-5" role="list">
                  {companyContacts.map((c) => (
                    <Link
                      key={`${companyName}-${c.id}`}
                      href={`/dashboard/contractor/contacts/${c.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 transition-colors"
                      role="listitem"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">{c.name}</div>
                        {c.job_title && <div className="text-xs text-slate-500">{c.job_title}</div>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {c.total_jobs_together > 0 && (
                          <span className="text-xs text-slate-400">{c.total_jobs_together} job{c.total_jobs_together !== 1 ? 's' : ''}</span>
                        )}
                        <ArrowRight size={14} className="text-slate-400" aria-hidden="true" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ──── Add Contact Modal ──── */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title="Add Contact" size="md">
        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="contact-name" className={labelClass}>Name *</label>
            <input id="contact-name" type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} placeholder="Full name" autoFocus />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-title" className={labelClass}>Job Title</label>
              <input id="contact-title" type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className={inputClass} placeholder="e.g. Crew Coordinator" />
            </div>
            <div>
              <label htmlFor="contact-company" className={labelClass}>Company</label>
              <input id="contact-company" type="text" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} className={inputClass} placeholder="e.g. ESPN" list="company-suggestions" />
              <datalist id="company-suggestions">
                {companies.map((c) => <option key={c.name} value={c.name} />)}
              </datalist>
            </div>
          </div>

          {/* Phones */}
          <div>
            <label className={labelClass}>Phone Numbers</label>
            {formPhones.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="tel"
                  value={p.phone}
                  onChange={(e) => { const n = [...formPhones]; n[i] = { ...n[i], phone: e.target.value }; setFormPhones(n); }}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder="Phone number"
                  aria-label={`Phone ${i + 1}`}
                />
                <select
                  value={p.label}
                  onChange={(e) => { const n = [...formPhones]; n[i] = { ...n[i], label: e.target.value }; setFormPhones(n); }}
                  className={selectClass}
                  aria-label={`Phone ${i + 1} type`}
                >
                  <option value="mobile">Cell</option>
                  <option value="work">Work</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
                {formPhones.length > 1 && (
                  <button type="button" onClick={() => setFormPhones(formPhones.filter((_, j) => j !== i))} className="flex items-center justify-center min-h-11 min-w-11 shrink-0 text-slate-400 hover:text-red-500" aria-label="Remove phone">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setFormPhones([...formPhones, { phone: '', label: 'mobile' }])} className="text-xs text-amber-600 hover:underline min-h-11 inline-flex items-center">
              + Add phone
            </button>
          </div>

          {/* Emails */}
          <div>
            <label className={labelClass}>Email Addresses</label>
            {formEmails.map((e, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={e.email}
                  onChange={(ev) => { const n = [...formEmails]; n[i] = { ...n[i], email: ev.target.value }; setFormEmails(n); }}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder="Email address"
                  aria-label={`Email ${i + 1}`}
                />
                <select
                  value={e.label}
                  onChange={(ev) => { const n = [...formEmails]; n[i] = { ...n[i], label: ev.target.value }; setFormEmails(n); }}
                  className={selectClass}
                  aria-label={`Email ${i + 1} type`}
                >
                  <option value="work">Work</option>
                  <option value="personal">Prsnl</option>
                  <option value="other">Other</option>
                </select>
                {formEmails.length > 1 && (
                  <button type="button" onClick={() => setFormEmails(formEmails.filter((_, j) => j !== i))} className="flex items-center justify-center min-h-11 min-w-11 shrink-0 text-slate-400 hover:text-red-500" aria-label="Remove email">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setFormEmails([...formEmails, { email: '', label: 'work' }])} className="text-xs text-amber-600 hover:underline min-h-11 inline-flex items-center">
              + Add email
            </button>
          </div>

          {/* Addresses */}
          <div>
            <label className={labelClass}>Addresses</label>
            {formAddresses.map((a, i) => (
              <div key={i} className="mb-3 rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <select
                    value={a.label}
                    onChange={(e) => { const n = [...formAddresses]; n[i] = { ...n[i], label: e.target.value }; setFormAddresses(n); }}
                    className={`${selectClass} w-28`}
                    aria-label={`Address ${i + 1} type`}
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="venue">Venue</option>
                    <option value="other">Other</option>
                  </select>
                  {formAddresses.length > 1 && (
                    <button type="button" onClick={() => setFormAddresses(formAddresses.filter((_, j) => j !== i))} className="flex items-center justify-center min-h-11 min-w-11 shrink-0 text-slate-400 hover:text-red-500" aria-label="Remove address">
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <input type="text" value={a.street} onChange={(e) => { const n = [...formAddresses]; n[i] = { ...n[i], street: e.target.value }; setFormAddresses(n); }} className={inputClass} placeholder="Street address" aria-label={`Address ${i + 1} street`} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input type="text" value={a.city} onChange={(e) => { const n = [...formAddresses]; n[i] = { ...n[i], city: e.target.value }; setFormAddresses(n); }} className={inputClass} placeholder="City" aria-label={`Address ${i + 1} city`} />
                  <input type="text" value={a.state} onChange={(e) => { const n = [...formAddresses]; n[i] = { ...n[i], state: e.target.value }; setFormAddresses(n); }} className={inputClass} placeholder="State" aria-label={`Address ${i + 1} state`} />
                  <input type="text" value={a.postal_code} onChange={(e) => { const n = [...formAddresses]; n[i] = { ...n[i], postal_code: e.target.value }; setFormAddresses(n); }} className={inputClass} placeholder="Zip" aria-label={`Address ${i + 1} zip`} />
                  <input type="text" value={a.country} onChange={(e) => { const n = [...formAddresses]; n[i] = { ...n[i], country: e.target.value }; setFormAddresses(n); }} className={inputClass} placeholder="Country" aria-label={`Address ${i + 1} country`} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setFormAddresses([...formAddresses, { label: 'work', street: '', city: '', state: '', postal_code: '', country: '' }])} className="text-xs text-amber-600 hover:underline min-h-11 inline-flex items-center">
              + Add address
            </button>
          </div>

          {/* Website & Portal */}
          <div>
            <label htmlFor="contact-website" className={labelClass}>Website</label>
            <input id="contact-website" type="url" value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)} className={inputClass} placeholder="https://example.com" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact-portal-url" className={labelClass}>Paycheck Portal URL</label>
              <input id="contact-portal-url" type="url" value={formPortalUrl} onChange={(e) => setFormPortalUrl(e.target.value)} className={inputClass} placeholder="https://portal.adp.com" />
            </div>
            <div>
              <label htmlFor="contact-portal-id" className={labelClass}>Portal Company ID</label>
              <input id="contact-portal-id" type="text" value={formPortalCompanyId} onChange={(e) => setFormPortalCompanyId(e.target.value)} className={inputClass} placeholder="Employer ID for login" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="contact-notes" className={labelClass}>Notes</label>
            <textarea id="contact-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className={inputClass} rows={2} placeholder="Any notes about this contact..." />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowAdd(false); resetForm(); }}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-11"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!formName.trim() || saving}
              className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11"
            >
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
