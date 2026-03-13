'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import ContactCombobox from '@/components/ui/ContactCombobox';
import LocationCombobox from '@/components/ui/LocationCombobox';
import SuggestionsInput from '@/components/ui/SuggestionsInput';
import RateCardSelect from '@/components/contractor/RateCardSelect';
import DateCalendarPicker from '@/components/ui/DateCalendarPicker';
import ScanButton from '@/components/scan/ScanButton';
import type { ScanResult } from '@/components/scan/ScanButton';
import { offlineFetch } from '@/lib/offline/offline-fetch';

const RATE_TYPES = ['hourly', 'daily', 'flat'];
const STATUSES = ['assigned', 'confirmed', 'in_progress', 'completed'];

export default function EditJobPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [benefitDeductions, setBenefitDeductions] = useState<{ id: string; label: string; amount: string }[]>([]);
  const deductionIdPrefix = useId();

  const [form, setForm] = useState({
    job_number: '',
    client_name: '',
    client_id: null as string | null,
    event_name: '',
    location_name: '',
    poc_name: '',
    poc_phone: '',
    crew_coordinator_name: '',
    crew_coordinator_phone: '',
    poc_contact_id: null as string | null,
    crew_coordinator_id: null as string | null,
    location_id: null as string | null,
    status: 'assigned',
    start_date: '',
    end_date: '',
    is_multi_day: false,
    scheduled_dates: [] as string[],
    pay_rate: '',
    ot_rate: '',
    dt_rate: '',
    rate_type: 'hourly',
    distance_from_home_miles: '',
    benefits_eligible: false,
    union_local: '',
    department: '',
    est_pay_date: '',
    notes: '',
    meal_allowance: '',
    per_diem: '',
    mileage_rate: '',
    extra_pay: '',
  });

  const set = (field: string, value: string | boolean | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Load existing job data
  useEffect(() => {
    if (!id) return;
    async function loadJob() {
      try {
        const res = await offlineFetch(`/api/contractor/jobs/${id}`);
        if (!res.ok) { setNotFound(true); return; }
        const job = await res.json();
        const tb = job.travel_benefits ?? {};
        setForm({
          job_number: job.job_number ?? '',
          client_name: job.client_name ?? '',
          client_id: job.client_id ?? null,
          event_name: job.event_name ?? '',
          location_name: job.location_name ?? '',
          poc_name: job.poc_name ?? '',
          poc_phone: job.poc_phone ?? '',
          crew_coordinator_name: job.crew_coordinator_name ?? '',
          crew_coordinator_phone: job.crew_coordinator_phone ?? '',
          poc_contact_id: job.poc_contact_id ?? null,
          crew_coordinator_id: job.crew_coordinator_id ?? null,
          location_id: job.location_id ?? null,
          status: job.status ?? 'assigned',
          start_date: job.start_date ?? '',
          end_date: job.end_date ?? '',
          is_multi_day: job.is_multi_day ?? false,
          scheduled_dates: Array.isArray(job.scheduled_dates) ? job.scheduled_dates : [],
          pay_rate: job.pay_rate != null ? String(job.pay_rate) : '',
          ot_rate: job.ot_rate != null ? String(job.ot_rate) : '',
          dt_rate: job.dt_rate != null ? String(job.dt_rate) : '',
          rate_type: job.rate_type ?? 'hourly',
          distance_from_home_miles: job.distance_from_home_miles != null ? String(job.distance_from_home_miles) : '',
          benefits_eligible: job.benefits_eligible ?? false,
          union_local: job.union_local ?? '',
          department: job.department ?? '',
          est_pay_date: job.est_pay_date ?? '',
          notes: job.notes ?? '',
          meal_allowance: tb.meal_allowance != null ? String(tb.meal_allowance) : '',
          per_diem: tb.per_diem != null ? String(tb.per_diem) : '',
          mileage_rate: tb.mileage_rate != null ? String(tb.mileage_rate) : '',
          extra_pay: tb.extra_pay != null ? String(tb.extra_pay) : '',
        });
        // Load benefit deductions
        const existingDeductions = Array.isArray(job.benefit_deductions) ? job.benefit_deductions : [];
        setBenefitDeductions(
          existingDeductions.map((d: { label: string; amount: number }, i: number) => ({
            id: `loaded-${i}`,
            label: d.label ?? '',
            amount: d.amount != null ? String(d.amount) : '',
          }))
        );
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id]);

  const handleInlineScan = useCallback((result: ScanResult) => {
    const prefill = result.prefills?.job;
    if (!prefill) return;
    setForm((prev) => ({
      ...prev,
      job_number: (prefill.job_number as string) ?? prev.job_number,
      client_name: (prefill.client_name as string) ?? prev.client_name,
      event_name: (prefill.event_name as string) ?? prev.event_name,
      location_name: (prefill.location_name as string) ?? prev.location_name,
      poc_name: (prefill.poc_name as string) ?? prev.poc_name,
      poc_phone: (prefill.poc_phone as string) ?? prev.poc_phone,
      crew_coordinator_name: (prefill.crew_coordinator_name as string) ?? prev.crew_coordinator_name,
      crew_coordinator_phone: (prefill.crew_coordinator_phone as string) ?? prev.crew_coordinator_phone,
      start_date: (prefill.start_date as string) ?? prev.start_date,
      end_date: (prefill.end_date as string) ?? prev.end_date,
      is_multi_day: (prefill.is_multi_day as boolean) ?? prev.is_multi_day,
      scheduled_dates: (prefill.scheduled_dates as string[]) ?? prev.scheduled_dates,
      pay_rate: prefill.pay_rate != null ? String(prefill.pay_rate) : prev.pay_rate,
      ot_rate: prefill.ot_rate != null ? String(prefill.ot_rate) : prev.ot_rate,
      dt_rate: prefill.dt_rate != null ? String(prefill.dt_rate) : prev.dt_rate,
      union_local: (prefill.union_local as string) ?? prev.union_local,
      department: (prefill.department as string) ?? prev.department,
      est_pay_date: (prefill.est_pay_date as string) ?? prev.est_pay_date,
      notes: (prefill.notes as string) ?? prev.notes,
    }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const travelBenefits: Record<string, number> = {};
    if (form.meal_allowance) travelBenefits.meal_allowance = parseFloat(form.meal_allowance);
    if (form.per_diem) travelBenefits.per_diem = parseFloat(form.per_diem);
    if (form.mileage_rate) travelBenefits.mileage_rate = parseFloat(form.mileage_rate);
    if (form.extra_pay) travelBenefits.extra_pay = parseFloat(form.extra_pay);

    const res = await offlineFetch(`/api/contractor/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_number: form.job_number,
        client_name: form.client_name,
        client_id: form.client_id,
        event_name: form.event_name || null,
        location_name: form.location_name || null,
        location_id: form.location_id || null,
        poc_name: form.poc_name || null,
        poc_phone: form.poc_phone || null,
        poc_contact_id: form.poc_contact_id || null,
        crew_coordinator_name: form.crew_coordinator_name || null,
        crew_coordinator_phone: form.crew_coordinator_phone || null,
        crew_coordinator_id: form.crew_coordinator_id || null,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_multi_day: form.is_multi_day,
        scheduled_dates: form.scheduled_dates.length > 0 ? form.scheduled_dates : [],
        pay_rate: form.pay_rate ? parseFloat(form.pay_rate) : null,
        ot_rate: form.ot_rate ? parseFloat(form.ot_rate) : null,
        dt_rate: form.dt_rate ? parseFloat(form.dt_rate) : null,
        rate_type: form.rate_type,
        distance_from_home_miles: form.distance_from_home_miles ? parseFloat(form.distance_from_home_miles) : null,
        benefits_eligible: form.benefits_eligible,
        travel_benefits: Object.keys(travelBenefits).length > 0 ? travelBenefits : {},
        benefit_deductions: benefitDeductions
          .filter((d) => d.label.trim() && d.amount)
          .map((d) => ({ label: d.label.trim(), amount: parseFloat(d.amount) })),
        union_local: form.union_local || null,
        department: form.department || null,
        est_pay_date: form.est_pay_date || null,
        notes: form.notes || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to save job');
      setSaving(false);
      return;
    }

    router.refresh();
    router.push(`/dashboard/contractor/jobs/${id}`);
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="flex items-center gap-3 py-12 justify-center text-slate-500" role="status" aria-label="Loading job">
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          <span>Loading job...</span>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <Link href="/dashboard/contractor" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 min-h-11 py-2" aria-label="Back to Jobs">
          <ArrowLeft size={14} aria-hidden="true" /> Back to Jobs
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Job not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Link href={`/dashboard/contractor/jobs/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 min-h-11 py-2" aria-label="Back to job detail">
        <ArrowLeft size={14} aria-hidden="true" /> Back to Job
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">Edit Job</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Import tools: Rate Card + Scan */}
        <div className="flex flex-col sm:flex-row gap-3">
          <ScanButton
            onResult={handleInlineScan}
            onError={(msg) => setError(msg)}
            moduleHint="call_sheet"
            label="Import from Image"
            className="flex items-center gap-2 px-4 py-2.5 border border-amber-300 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition cursor-pointer min-h-11"
          />
        </div>
        <RateCardSelect
          onSelect={(card) => {
            setForm((prev) => ({
              ...prev,
              pay_rate: card.st_rate?.toString() ?? prev.pay_rate,
              ot_rate: card.ot_rate?.toString() ?? prev.ot_rate,
              dt_rate: card.dt_rate?.toString() ?? prev.dt_rate,
              rate_type: card.rate_type ?? prev.rate_type,
              union_local: card.union_local ?? prev.union_local,
              department: card.department ?? prev.department,
              benefits_eligible: (card.benefits?.length ?? 0) > 0,
              meal_allowance: card.travel_benefits?.meal_allowance?.toString() ?? prev.meal_allowance,
              per_diem: card.travel_benefits?.per_diem?.toString() ?? prev.per_diem,
              mileage_rate: card.travel_benefits?.mileage_rate?.toString() ?? prev.mileage_rate,
              extra_pay: card.travel_benefits?.extra_pay?.toString() ?? prev.extra_pay,
            }));
          }}
        />

        {/* Job Info */}
        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <legend className="px-2 text-sm font-semibold text-slate-800">Job Info</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="job-number" className={labelClass}>Job Number <span aria-hidden="true">*</span></label>
              <input
                id="job-number"
                className={inputClass}
                placeholder="J-223680"
                value={form.job_number}
                onChange={(e) => set('job_number', e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="job-status" className={labelClass}>Status</label>
              <select id="job-status" className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Client *</label>
            <ContactCombobox
              contactType="customer"
              value={form.client_name}
              contactId={form.client_id}
              onChange={(name, id) => { set('client_name', name); set('client_id', id ?? null); }}
              placeholder="Search or add client…"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Event Name</label>
              <input className={inputClass} placeholder="2026 BIG10 Women's Championship" value={form.event_name} onChange={(e) => set('event_name', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Location / Venue</label>
              <LocationCombobox
                value={form.location_name}
                locationId={form.location_id}
                onChange={(label, id) => { set('location_name', label); set('location_id', id ?? null); }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_multi_day}
              onChange={(e) => {
                set('is_multi_day', e.target.checked);
                if (e.target.checked) {
                  setCalendarOpen(true);
                } else {
                  setCalendarOpen(false);
                  setForm((prev) => ({ ...prev, scheduled_dates: [], start_date: '', end_date: '' }));
                }
              }}
              className="rounded border-slate-300"
            />
            Multi-day job (non-consecutive dates)
          </label>

          {form.is_multi_day && calendarOpen ? (
            <DateCalendarPicker
              selectedDates={form.scheduled_dates}
              onChange={(dates) => {
                setForm((prev) => ({
                  ...prev,
                  scheduled_dates: dates,
                  start_date: dates.length > 0 ? dates[0] : prev.start_date,
                  end_date: dates.length > 0 ? dates[dates.length - 1] : prev.end_date,
                }));
              }}
              onDone={() => setCalendarOpen(false)}
            />
          ) : form.is_multi_day && !calendarOpen ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="text-sm text-slate-700">
                {form.scheduled_dates.length > 0
                  ? `${form.scheduled_dates.length} date${form.scheduled_dates.length !== 1 ? 's' : ''} selected`
                  : 'No dates selected'}
              </span>
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="text-sm text-amber-600 hover:text-amber-500 font-medium"
              >
                Edit dates
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Start Date</label>
                <input type="date" className={inputClass} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>End Date</label>
                <input type="date" className={inputClass} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Union Local</label>
              <SuggestionsInput
                field="union_local"
                value={form.union_local}
                onChange={(v) => set('union_local', v)}
                placeholder="IBEW 1220, IATSE 317"
              />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <SuggestionsInput
                field="department"
                value={form.department}
                onChange={(v) => set('department', v)}
                placeholder="Camera, Audio, Graphics"
              />
            </div>
          </div>
        </fieldset>

        {/* Contacts */}
        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <legend className="px-2 text-sm font-semibold text-slate-800">Contacts</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>POC (Point of Contact)</label>
              <ContactCombobox
                contactType="vendor"
                value={form.poc_name}
                contactId={form.poc_contact_id}
                onChange={(name, id) => { set('poc_name', name); set('poc_contact_id', id ?? null); }}
                onPhoneChange={(phone) => { if (phone) set('poc_phone', phone); }}
                placeholder="Search or add POC…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>POC Phone</label>
              <input className={inputClass} placeholder="555-0123" value={form.poc_phone} onChange={(e) => set('poc_phone', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Crew Coordinator</label>
              <ContactCombobox
                contactType="vendor"
                value={form.crew_coordinator_name}
                contactId={form.crew_coordinator_id}
                onChange={(name, id) => { set('crew_coordinator_name', name); set('crew_coordinator_id', id ?? null); }}
                onPhoneChange={(phone) => { if (phone) set('crew_coordinator_phone', phone); }}
                placeholder="Search or add coordinator…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Coordinator Phone</label>
              <input className={inputClass} placeholder="555-0456" value={form.crew_coordinator_phone} onChange={(e) => set('crew_coordinator_phone', e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* Pay Rates */}
        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <legend className="px-2 text-sm font-semibold text-slate-800">Pay Rates</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="rate-type" className={labelClass}>Rate Type</label>
              <select id="rate-type" className={inputClass} value={form.rate_type} onChange={(e) => set('rate_type', e.target.value)}>
                {RATE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="st-rate" className={labelClass}>ST Rate</label>
              <input id="st-rate" type="number" step="0.01" className={inputClass} placeholder="41.09" value={form.pay_rate} onChange={(e) => set('pay_rate', e.target.value)} aria-label="Straight time rate" />
            </div>
            <div>
              <label htmlFor="ot-rate" className={labelClass}>OT Rate</label>
              <input id="ot-rate" type="number" step="0.01" className={inputClass} placeholder="61.64" value={form.ot_rate} onChange={(e) => set('ot_rate', e.target.value)} aria-label="Overtime rate" />
            </div>
            <div>
              <label htmlFor="dt-rate" className={labelClass}>DT Rate</label>
              <input id="dt-rate" type="number" step="0.01" className={inputClass} placeholder="82.18" value={form.dt_rate} onChange={(e) => set('dt_rate', e.target.value)} aria-label="Double time rate" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Est. Pay Date</label>
              <input type="date" className={inputClass} value={form.est_pay_date} onChange={(e) => set('est_pay_date', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Distance from Home (mi)</label>
              <input type="number" step="0.1" className={inputClass} placeholder="150" value={form.distance_from_home_miles} onChange={(e) => set('distance_from_home_miles', e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* Benefits & Travel */}
        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <legend className="px-2 text-sm font-semibold text-slate-800">Benefits &amp; Travel</legend>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.benefits_eligible}
              onChange={(e) => set('benefits_eligible', e.target.checked)}
              className="rounded border-slate-300"
            />
            Benefits Eligible
          </label>

          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Travel</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="meal-allowance" className={labelClass}>Meal Allowance</label>
              <input id="meal-allowance" type="number" step="0.01" className={inputClass} placeholder="25.00" value={form.meal_allowance} onChange={(e) => set('meal_allowance', e.target.value)} />
            </div>
            <div>
              <label htmlFor="per-diem" className={labelClass}>Per Diem / Day</label>
              <input id="per-diem" type="number" step="0.01" className={inputClass} placeholder="55.00" value={form.per_diem} onChange={(e) => set('per_diem', e.target.value)} />
            </div>
            <div>
              <label htmlFor="mileage-rate" className={labelClass}>Mileage Rate ($/mi)</label>
              <input id="mileage-rate" type="number" step="0.001" className={inputClass} placeholder="0.725" value={form.mileage_rate} onChange={(e) => set('mileage_rate', e.target.value)} />
            </div>
            <div>
              <label htmlFor="extra-pay" className={labelClass}>Extra Travel Pay</label>
              <input id="extra-pay" type="number" step="0.01" className={inputClass} placeholder="0.00" value={form.extra_pay} onChange={(e) => set('extra_pay', e.target.value)} />
            </div>
          </div>

          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-2">Employer Benefit Contributions</p>
          <div className="space-y-2">
            {benefitDeductions.map((ded, i) => (
              <div key={ded.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  className={inputClass + ' flex-1'}
                  placeholder="e.g. IATSE 317 Health & Welfare"
                  value={ded.label}
                  onChange={(e) => setBenefitDeductions((prev) => prev.map((d, j) => j === i ? { ...d, label: e.target.value } : d))}
                  aria-label={`Benefit deduction ${i + 1} label`}
                />
                <div className="relative w-32 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass + ' pl-6'}
                    placeholder="87.50"
                    value={ded.amount}
                    onChange={(e) => setBenefitDeductions((prev) => prev.map((d, j) => j === i ? { ...d, amount: e.target.value } : d))}
                    aria-label={`Benefit deduction ${i + 1} amount`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setBenefitDeductions((prev) => prev.filter((_, j) => j !== i))}
                  className="shrink-0 p-2 text-slate-400 hover:text-red-500 min-h-11 min-w-11 flex items-center justify-center"
                  aria-label={`Remove deduction ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setBenefitDeductions((prev) => [...prev, { id: `${deductionIdPrefix}-${Date.now()}`, label: '', amount: '' }])}
              className="text-sm text-amber-600 hover:text-amber-500 font-medium py-1"
            >
              + Add deduction
            </button>
          </div>

          {benefitDeductions.length > 0 && (
            <div className="flex justify-between items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-600 font-medium">Est. Benefits Total</span>
              <span className="font-semibold text-slate-900">
                ${benefitDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0).toFixed(2)}
              </span>
            </div>
          )}
        </fieldset>

        {/* Notes */}
        <div>
          <label htmlFor="job-notes" className={labelClass}>Notes</label>
          <textarea
            id="job-notes"
            className={inputClass + ' h-24 resize-none'}
            placeholder="Additional job notes..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            aria-label="Job notes"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-base font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11"
        >
          {saving ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
