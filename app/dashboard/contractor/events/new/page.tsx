'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import ContactCombobox from '@/components/ui/ContactCombobox';
import LocationCombobox from '@/components/ui/LocationCombobox';
import { offlineFetch } from '@/lib/offline/offline-fetch';

const RATE_TYPES = ['hourly', 'daily', 'flat'];

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    client_name: '',
    client_id: null as string | null,
    location_name: '',
    location_id: null as string | null,
    poc_name: '',
    poc_phone: '',
    poc_contact_id: null as string | null,
    crew_coordinator_name: '',
    crew_coordinator_phone: '',
    crew_coordinator_id: null as string | null,
    start_date: '',
    end_date: '',
    union_local: '',
    department: '',
    pay_rate: '',
    ot_rate: '',
    dt_rate: '',
    rate_type: 'hourly',
    benefits_eligible: false,
    notes: '',
    meal_allowance: '',
    per_diem: '',
    mileage_rate: '',
    extra_pay: '',
  });

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Event name is required'); return; }
    setSaving(true);
    setError('');

    const travel_benefits: Record<string, number> = {};
    if (form.meal_allowance) travel_benefits.meal_allowance = parseFloat(form.meal_allowance);
    if (form.per_diem) travel_benefits.per_diem = parseFloat(form.per_diem);
    if (form.mileage_rate) travel_benefits.mileage_rate = parseFloat(form.mileage_rate);
    if (form.extra_pay) travel_benefits.extra_pay = parseFloat(form.extra_pay);

    const res = await offlineFetch('/api/contractor/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        client_name: form.client_name || null,
        client_id: form.client_id,
        location_name: form.location_name || null,
        location_id: form.location_id,
        poc_name: form.poc_name || null,
        poc_phone: form.poc_phone || null,
        poc_contact_id: form.poc_contact_id,
        crew_coordinator_name: form.crew_coordinator_name || null,
        crew_coordinator_phone: form.crew_coordinator_phone || null,
        crew_coordinator_id: form.crew_coordinator_id,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        union_local: form.union_local || null,
        department: form.department || null,
        pay_rate: form.pay_rate ? parseFloat(form.pay_rate) : null,
        ot_rate: form.ot_rate ? parseFloat(form.ot_rate) : null,
        dt_rate: form.dt_rate ? parseFloat(form.dt_rate) : null,
        rate_type: form.rate_type,
        benefits_eligible: form.benefits_eligible,
        travel_benefits,
        notes: form.notes || null,
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Failed to create event'); return; }
    router.push(`/dashboard/contractor/events/${data.id}`);
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Link href="/dashboard/contractor/events" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 min-h-11 py-2" aria-label="Back to Events">
        <ArrowLeft size={14} aria-hidden="true" /> Events
      </Link>

      <h1 className="text-xl font-bold text-slate-900">Create Event</h1>
      <p className="text-sm text-slate-500">Define shared details for a group of jobs. When you create jobs from this event, these fields will be pre-filled.</p>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Name */}
        <div>
          <label htmlFor="event-name" className={labelClass}>Event Name <span className="text-red-500" aria-hidden="true">*</span></label>
          <input id="event-name" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Coachella 2026" required aria-required="true" />
        </div>

        {/* Client */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Client</h2>
          <ContactCombobox
            contactType="customer"
            label="Client"
            value={form.client_name}
            contactId={form.client_id}
            onChange={(name, id) => { set('client_name', name); set('client_id', id); }}
          />
        </div>

        {/* Location */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Location</h2>
          <LocationCombobox
            value={form.location_name}
            locationId={form.location_id}
            onChange={(name, id) => { set('location_name', name); set('location_id', id); }}
            placeholder="Search or add venue..."
          />
        </div>

        {/* Contacts */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Contacts</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <ContactCombobox
                contactType="customer"
                label="Point of Contact"
                value={form.poc_name}
                contactId={form.poc_contact_id}
                onChange={(name, id) => { set('poc_name', name); set('poc_contact_id', id); }}
              />
            </div>
            <div>
              <label htmlFor="poc-phone" className={labelClass}>POC Phone</label>
              <input id="poc-phone" type="tel" className={inputClass} value={form.poc_phone} onChange={(e) => set('poc_phone', e.target.value)} placeholder="Phone" />
            </div>
            <div>
              <ContactCombobox
                contactType="customer"
                label="Crew Coordinator"
                value={form.crew_coordinator_name}
                contactId={form.crew_coordinator_id}
                onChange={(name, id) => { set('crew_coordinator_name', name); set('crew_coordinator_id', id); }}
              />
            </div>
            <div>
              <label htmlFor="cc-phone" className={labelClass}>Coordinator Phone</label>
              <input id="cc-phone" type="tel" className={inputClass} value={form.crew_coordinator_phone} onChange={(e) => set('crew_coordinator_phone', e.target.value)} placeholder="Phone" />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Dates</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start-date" className={labelClass}>Start Date</label>
              <input id="start-date" type="date" className={inputClass} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <label htmlFor="end-date" className={labelClass}>End Date</label>
              <input id="end-date" type="date" className={inputClass} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Rates */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Rates</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="pay-rate" className={labelClass}>ST Rate</label>
              <input id="pay-rate" type="number" step="0.01" className={inputClass} value={form.pay_rate} onChange={(e) => set('pay_rate', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="ot-rate" className={labelClass}>OT Rate</label>
              <input id="ot-rate" type="number" step="0.01" className={inputClass} value={form.ot_rate} onChange={(e) => set('ot_rate', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="dt-rate" className={labelClass}>DT Rate</label>
              <input id="dt-rate" type="number" step="0.01" className={inputClass} value={form.dt_rate} onChange={(e) => set('dt_rate', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="rate-type" className={labelClass}>Rate Type</label>
              <select id="rate-type" className={inputClass} value={form.rate_type} onChange={(e) => set('rate_type', e.target.value)}>
                {RATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Union / Department */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="union" className={labelClass}>Union Local</label>
              <input id="union" className={inputClass} value={form.union_local} onChange={(e) => set('union_local', e.target.value)} placeholder="e.g. IATSE Local 33" />
            </div>
            <div>
              <label htmlFor="dept" className={labelClass}>Department</label>
              <input id="dept" className={inputClass} value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Lighting" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="benefits-eligible"
              type="checkbox"
              checked={form.benefits_eligible}
              onChange={(e) => set('benefits_eligible', e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="benefits-eligible" className="text-sm text-slate-700">Benefits Eligible</label>
          </div>
        </div>

        {/* Travel Benefits */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Travel Benefits</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="meal" className={labelClass}>Meal Allow.</label>
              <input id="meal" type="number" step="0.01" className={inputClass} value={form.meal_allowance} onChange={(e) => set('meal_allowance', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="perdiem" className={labelClass}>Per Diem</label>
              <input id="perdiem" type="number" step="0.01" className={inputClass} value={form.per_diem} onChange={(e) => set('per_diem', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="mileage" className={labelClass}>Mileage Rate</label>
              <input id="mileage" type="number" step="0.01" className={inputClass} value={form.mileage_rate} onChange={(e) => set('mileage_rate', e.target.value)} placeholder="$/mi" />
            </div>
            <div>
              <label htmlFor="extra" className={labelClass}>Extra Pay</label>
              <input id="extra" type="number" step="0.01" className={inputClass} value={form.extra_pay} onChange={(e) => set('extra_pay', e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className={labelClass}>Notes</label>
          <textarea id="notes" rows={3} className={inputClass} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="General notes for this event..." />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          aria-label={saving ? 'Creating event...' : 'Create event'}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11"
        >
          {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
          {saving ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}
