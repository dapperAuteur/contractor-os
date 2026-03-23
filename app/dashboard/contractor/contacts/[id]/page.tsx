'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Phone, MessageSquare, Mail, Share2, Pencil, Trash2,
  MapPin, Briefcase, Building2, Tag, Loader2, Save, X, Globe,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import JobStatusBadge from '@/components/contractor/JobStatusBadge';
import Modal from '@/components/ui/Modal';

interface ContactPhone { id: string; phone: string; label: string; is_primary: boolean; }
interface ContactEmail { id: string; email: string; label: string; is_primary: boolean; }
interface ContactTag { id: string; tag_type: string; value: string; }
interface ContactAddress {
  id: string; label: string; street: string | null; city: string | null;
  state: string | null; postal_code: string | null; country: string | null;
  is_primary: boolean; sort_order: number;
}

interface ContactDetail {
  id: string;
  name: string;
  job_title: string | null;
  company_name: string | null;
  home_city: string | null;
  home_state: string | null;
  home_country: string | null;
  website: string | null;
  total_jobs_together: number;
  last_worked_with: string | null;
  notes: string | null;
  phone: string | null;
  email: string | null;
  contact_phones: ContactPhone[];
  contact_emails: ContactEmail[];
  contact_tags: ContactTag[];
  contact_addresses: ContactAddress[];
}

interface JobRole {
  id: string;
  role: string;
  role_label: string | null;
  notes: string | null;
  created_at: string;
  contractor_jobs: {
    id: string;
    job_number: string;
    client_name: string;
    event_name: string | null;
    location_name: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
  } | null;
}

const ROLE_LABELS: Record<string, string> = {
  poc: 'POC', crew_coordinator: 'Crew Coordinator', tech_lead: 'Tech Lead',
  producer: 'Producer', eic: 'EIC', a1: 'A1', a2: 'A2', v1: 'V1', v2: 'V2',
  graphics: 'Graphics', replay: 'Replay', utility: 'Utility', other: 'Other',
};

interface EditAddr { label: string; street: string; city: string; state: string; postal_code: string; country: string; }

function formatAddress(a: ContactAddress | EditAddr): string {
  return [a.street, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ');
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareUsername, setShareUsername] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPhones, setEditPhones] = useState<Array<{ phone: string; label: string; is_primary: boolean }>>([]);
  const [editEmails, setEditEmails] = useState<Array<{ email: string; label: string; is_primary: boolean }>>([]);
  const [editAddresses, setEditAddresses] = useState<EditAddr[]>([]);

  const fetchContact = useCallback(async () => {
    setLoading(true);
    const res = await offlineFetch(`/api/contractor/contacts/${id}`);
    const data = await res.json();
    if (data.contact) {
      setContact(data.contact);
      setJobRoles(data.job_roles ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchContact(); }, [fetchContact]);

  const startEdit = () => {
    if (!contact) return;
    setEditName(contact.name);
    setEditTitle(contact.job_title ?? '');
    setEditCompany(contact.company_name ?? '');
    setEditWebsite(contact.website ?? '');
    setEditNotes(contact.notes ?? '');
    setEditPhones(
      contact.contact_phones?.length > 0
        ? contact.contact_phones.map((p) => ({ phone: p.phone, label: p.label, is_primary: p.is_primary }))
        : [{ phone: contact.phone ?? '', label: 'mobile', is_primary: true }],
    );
    setEditEmails(
      contact.contact_emails?.length > 0
        ? contact.contact_emails.map((e) => ({ email: e.email, label: e.label, is_primary: e.is_primary }))
        : [{ email: contact.email ?? '', label: 'work', is_primary: true }],
    );
    setEditAddresses(
      contact.contact_addresses?.length > 0
        ? contact.contact_addresses.map((a) => ({
            label: a.label, street: a.street ?? '', city: a.city ?? '',
            state: a.state ?? '', postal_code: a.postal_code ?? '', country: a.country ?? '',
          }))
        : [{ label: 'home', street: '', city: contact.home_city ?? '', state: contact.home_state ?? '', postal_code: '', country: contact.home_country ?? '' }],
    );
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);

    const phones = editPhones.filter((p) => p.phone.trim()).map((p, i) => ({
      phone: p.phone.trim(), label: p.label, is_primary: i === 0,
    }));
    const emails = editEmails.filter((e) => e.email.trim()).map((e, i) => ({
      email: e.email.trim(), label: e.label, is_primary: i === 0,
    }));
    const addresses = editAddresses
      .filter((a) => a.street.trim() || a.city.trim() || a.state.trim())
      .map((a, i) => ({
        label: a.label, street: a.street.trim() || null, city: a.city.trim() || null,
        state: a.state.trim() || null, postal_code: a.postal_code.trim() || null,
        country: a.country.trim() || null, is_primary: i === 0,
      }));

    // Build tags from company
    const tags: Array<{ tag_type: string; value: string }> = [];
    if (editCompany.trim()) tags.push({ tag_type: 'company', value: editCompany.trim() });
    // Preserve non-company tags
    for (const t of contact?.contact_tags ?? []) {
      if (t.tag_type !== 'company') tags.push({ tag_type: t.tag_type, value: t.value });
    }

    await offlineFetch(`/api/contractor/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName.trim(),
        job_title: editTitle.trim() || null,
        company_name: editCompany.trim() || null,
        website: editWebsite.trim() || null,
        notes: editNotes.trim() || null,
        phones, emails, tags, addresses,
      }),
    });

    setSaving(false);
    setEditing(false);
    fetchContact();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this contact? This cannot be undone.')) return;
    await offlineFetch(`/api/contractor/contacts/${id}`, { method: 'DELETE' });
    router.push('/dashboard/contractor/contacts');
  };

  const handleShare = async () => {
    if (!shareUsername.trim()) return;
    setShareStatus('');
    const res = await offlineFetch(`/api/contractor/contacts/${id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: shareUsername.trim(), message: shareMessage.trim() || null }),
    });
    const data = await res.json();
    if (res.ok) {
      setShareStatus('Shared successfully!');
      setShareUsername('');
      setShareMessage('');
      setTimeout(() => setShowShare(false), 1500);
    } else {
      setShareStatus(data.error ?? 'Failed to share');
    }
  };

  const primaryPhone = contact?.contact_phones?.find((p) => p.is_primary)?.phone ?? contact?.contact_phones?.[0]?.phone ?? contact?.phone;
  const primaryEmail = contact?.contact_emails?.find((e) => e.is_primary)?.email ?? contact?.contact_emails?.[0]?.email ?? contact?.email;

  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const selectClass = 'w-20 shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  if (loading) {
    return (
      <div className="flex justify-center py-24" role="status">
        <Loader2 className="animate-spin text-slate-400" size={24} aria-hidden="true" />
        <span className="sr-only">Loading contact</span>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <p className="text-slate-500">Contact not found.</p>
        <Link href="/dashboard/contractor/contacts" className="text-amber-600 hover:underline text-sm">Back to contacts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6 p-4 pb-8">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/contractor/contacts"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 min-h-11"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Contacts
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-11"
            aria-label="Share contact"
          >
            <Share2 size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Share</span>
          </button>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
              aria-label="Edit contact"
            >
              <Pencil size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
        </div>
      </div>

      {editing ? (
        /* ──── Edit Mode ──── */
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
          <div>
            <label htmlFor="edit-name" className={labelClass}>Name *</label>
            <input id="edit-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-title" className={labelClass}>Job Title</label>
              <input id="edit-title" type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-company" className={labelClass}>Company</label>
              <input id="edit-company" type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Phones */}
          <div>
            <label className={labelClass}>Phones</label>
            {editPhones.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="tel" value={p.phone} onChange={(e) => { const n = [...editPhones]; n[i] = { ...n[i], phone: e.target.value }; setEditPhones(n); }} className={`${inputClass} min-w-0 flex-1`} placeholder="Phone" aria-label={`Phone ${i + 1}`} />
                <select value={p.label} onChange={(e) => { const n = [...editPhones]; n[i] = { ...n[i], label: e.target.value }; setEditPhones(n); }} className={selectClass} aria-label={`Phone ${i + 1} type`}>
                  <option value="mobile">Cell</option>
                  <option value="work">Work</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
                {editPhones.length > 1 && (
                  <button type="button" onClick={() => setEditPhones(editPhones.filter((_, j) => j !== i))} className="min-h-11 min-w-11 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500" aria-label="Remove phone">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setEditPhones([...editPhones, { phone: '', label: 'mobile', is_primary: false }])} className="text-xs text-amber-600 hover:underline min-h-11 inline-flex items-center">+ Add phone</button>
          </div>

          {/* Emails */}
          <div>
            <label className={labelClass}>Emails</label>
            {editEmails.map((e, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="email" value={e.email} onChange={(ev) => { const n = [...editEmails]; n[i] = { ...n[i], email: ev.target.value }; setEditEmails(n); }} className={`${inputClass} min-w-0 flex-1`} placeholder="Email" aria-label={`Email ${i + 1}`} />
                <select value={e.label} onChange={(ev) => { const n = [...editEmails]; n[i] = { ...n[i], label: ev.target.value }; setEditEmails(n); }} className={selectClass} aria-label={`Email ${i + 1} type`}>
                  <option value="work">Work</option>
                  <option value="personal">Prsnl</option>
                  <option value="other">Other</option>
                </select>
                {editEmails.length > 1 && (
                  <button type="button" onClick={() => setEditEmails(editEmails.filter((_, j) => j !== i))} className="min-h-11 min-w-11 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500" aria-label="Remove email">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setEditEmails([...editEmails, { email: '', label: 'work', is_primary: false }])} className="text-xs text-amber-600 hover:underline min-h-11 inline-flex items-center">+ Add email</button>
          </div>

          {/* Addresses */}
          <div>
            <label className={labelClass}>Addresses</label>
            {editAddresses.map((a, i) => (
              <div key={i} className="mb-3 rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <select
                    value={a.label}
                    onChange={(e) => { const n = [...editAddresses]; n[i] = { ...n[i], label: e.target.value }; setEditAddresses(n); }}
                    className={`${selectClass} w-28`}
                    aria-label={`Address ${i + 1} type`}
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="venue">Venue</option>
                    <option value="other">Other</option>
                  </select>
                  {editAddresses.length > 1 && (
                    <button type="button" onClick={() => setEditAddresses(editAddresses.filter((_, j) => j !== i))} className="min-h-11 min-w-11 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500" aria-label="Remove address">
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <input type="text" value={a.street} onChange={(e) => { const n = [...editAddresses]; n[i] = { ...n[i], street: e.target.value }; setEditAddresses(n); }} className={inputClass} placeholder="Street address" aria-label={`Address ${i + 1} street`} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input type="text" value={a.city} onChange={(e) => { const n = [...editAddresses]; n[i] = { ...n[i], city: e.target.value }; setEditAddresses(n); }} className={inputClass} placeholder="City" aria-label={`Address ${i + 1} city`} />
                  <input type="text" value={a.state} onChange={(e) => { const n = [...editAddresses]; n[i] = { ...n[i], state: e.target.value }; setEditAddresses(n); }} className={inputClass} placeholder="State" aria-label={`Address ${i + 1} state`} />
                  <input type="text" value={a.postal_code} onChange={(e) => { const n = [...editAddresses]; n[i] = { ...n[i], postal_code: e.target.value }; setEditAddresses(n); }} className={inputClass} placeholder="Zip" aria-label={`Address ${i + 1} zip`} />
                  <input type="text" value={a.country} onChange={(e) => { const n = [...editAddresses]; n[i] = { ...n[i], country: e.target.value }; setEditAddresses(n); }} className={inputClass} placeholder="Country" aria-label={`Address ${i + 1} country`} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setEditAddresses([...editAddresses, { label: 'work', street: '', city: '', state: '', postal_code: '', country: '' }])} className="text-xs text-amber-600 hover:underline min-h-11 inline-flex items-center">+ Add address</button>
          </div>

          <div>
            <label htmlFor="edit-website" className={labelClass}>Website</label>
            <input id="edit-website" type="url" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className={inputClass} placeholder="https://example.com" />
          </div>

          <div>
            <label htmlFor="edit-notes" className={labelClass}>Notes</label>
            <textarea id="edit-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className={inputClass} rows={3} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between pt-2 gap-3">
            <button type="button" onClick={handleDelete} className="flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 min-h-11" aria-label="Delete contact">
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-11">Cancel</button>
              <button type="button" onClick={handleSave} disabled={!editName.trim() || saving} className="flex items-center justify-center gap-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11">
                <Save size={14} aria-hidden="true" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ──── View Mode ──── */
        <>
          {/* Header card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">{contact.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  {contact.job_title && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                      {contact.job_title}
                    </span>
                  )}
                  {contact.company_name && (
                    <span className="flex items-center gap-1">
                      <Building2 size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                      {contact.company_name}
                    </span>
                  )}
                  {(contact.contact_addresses?.[0] || contact.home_city || contact.home_state) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                      {contact.contact_addresses?.[0]
                        ? [contact.contact_addresses[0].city, contact.contact_addresses[0].state, contact.contact_addresses[0].country].filter(Boolean).join(', ')
                        : [contact.home_city, contact.home_state, contact.home_country].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-slate-400 shrink-0">
                {contact.total_jobs_together > 0 && <div>{contact.total_jobs_together} job{contact.total_jobs_together !== 1 ? 's' : ''} together</div>}
                {contact.last_worked_with && <div>Last: {new Date(contact.last_worked_with + 'T00:00').toLocaleDateString()}</div>}
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryPhone && (
                <a href={`tel:${primaryPhone}`} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 min-h-11">
                  <Phone size={16} aria-hidden="true" /> Call
                </a>
              )}
              {primaryPhone && (
                <a href={`sms:${primaryPhone}`} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 min-h-11">
                  <MessageSquare size={16} aria-hidden="true" /> Text
                </a>
              )}
              {primaryEmail && (
                <a href={`mailto:${primaryEmail}`} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 min-h-11">
                  <Mail size={16} aria-hidden="true" /> Email
                </a>
              )}
              {contact.website && (
                <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 min-h-11">
                  <Globe size={16} aria-hidden="true" /> Website
                </a>
              )}
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phones */}
            {(contact.contact_phones?.length > 0 || contact.phone) && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Phone Numbers</h3>
                <div className="space-y-2">
                  {(contact.contact_phones?.length > 0 ? contact.contact_phones : [{ phone: contact.phone!, label: 'mobile', is_primary: true, id: 'legacy' }]).map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <a href={`tel:${p.phone}`} className="text-sm text-amber-600 hover:underline break-all">{p.phone}</a>
                        <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{p.label}</span>
                        {p.is_primary && <span className="ml-1 text-xs text-amber-500">Primary</span>}
                      </div>
                      <a href={`sms:${p.phone}`} className="min-h-11 min-w-11 flex items-center justify-center text-slate-400 hover:text-amber-600 shrink-0" aria-label={`Text ${p.phone}`}>
                        <MessageSquare size={14} aria-hidden="true" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emails */}
            {(contact.contact_emails?.length > 0 || contact.email) && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Email Addresses</h3>
                <div className="space-y-2">
                  {(contact.contact_emails?.length > 0 ? contact.contact_emails : [{ email: contact.email!, label: 'work', is_primary: true, id: 'legacy' }]).map((e) => (
                    <div key={e.id}>
                      <a href={`mailto:${e.email}`} className="text-sm text-amber-600 hover:underline break-all">{e.email}</a>
                      <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{e.label}</span>
                      {e.is_primary && <span className="ml-1 text-xs text-amber-500">Primary</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Addresses */}
          {contact.contact_addresses?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Addresses</h3>
              <div className="space-y-2">
                {contact.contact_addresses.map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 mr-1">{a.label}</span>
                      {a.is_primary && <span className="text-xs text-amber-500 mr-1">Primary</span>}
                      <p className="text-sm text-slate-600">{formatAddress(a)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {contact.contact_tags?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {contact.contact_tags.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <Tag size={10} className="text-slate-400" aria-hidden="true" />
                    <span className="text-slate-400">{t.tag_type}:</span> {t.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          {/* Job History */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Job History</h3>
            {jobRoles.length === 0 ? (
              <p className="text-sm text-slate-400">No jobs linked to this contact yet.</p>
            ) : (
              <div className="space-y-2" role="list" aria-label="Jobs with this contact">
                {jobRoles.map((jr) => {
                  const job = jr.contractor_jobs;
                  if (!job) return null;
                  return (
                    <Link
                      key={jr.id}
                      href={`/dashboard/contractor/jobs/${job.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:border-slate-200 transition-colors"
                      role="listitem"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-amber-600">{job.job_number}</span>
                          <JobStatusBadge status={job.status} />
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {jr.role_label ?? ROLE_LABELS[jr.role] ?? jr.role}
                          </span>
                        </div>
                        <div className="mt-0.5 text-sm text-slate-900 truncate">
                          {job.client_name}
                          {job.event_name && <span className="text-slate-500"> — {job.event_name}</span>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {job.start_date && new Date(job.start_date + 'T00:00').toLocaleDateString()}
                          {job.location_name && <span> · {job.location_name}</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Share Modal */}
      <Modal isOpen={showShare} onClose={() => { setShowShare(false); setShareStatus(''); }} title="Share Contact" size="sm">
        <div className="space-y-4 p-4">
          <p className="text-sm text-slate-500">
            Share <strong>{contact.name}</strong> with another Work.WitUS user. They will receive a copy they can edit independently.
          </p>
          <div>
            <label htmlFor="share-username" className={labelClass}>Username</label>
            <input id="share-username" type="text" value={shareUsername} onChange={(e) => setShareUsername(e.target.value)} className={inputClass} placeholder="Enter username" />
          </div>
          <div>
            <label htmlFor="share-message" className={labelClass}>Message (optional)</label>
            <input id="share-message" type="text" value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} className={inputClass} placeholder="Hey, here's a great contact..." />
          </div>
          {shareStatus && (
            <p className={`text-sm ${shareStatus.includes('success') ? 'text-green-600' : 'text-red-500'}`} role="alert">
              {shareStatus}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setShowShare(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-11">Cancel</button>
            <button type="button" onClick={handleShare} disabled={!shareUsername.trim()} className="flex items-center justify-center gap-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11">
              <Share2 size={14} aria-hidden="true" /> Share
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
