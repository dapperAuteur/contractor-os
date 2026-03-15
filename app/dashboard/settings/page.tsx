'use client';

// app/dashboard/settings/page.tsx
// Dashboard preferences — home page, clock format, scan, social, tours, MFA.

import { useState, useEffect, useCallback } from 'react';
import { NAV_GROUPS } from '@/components/nav/NavConfig';
import { Settings, Check, Loader2, Sparkles, RotateCcw, Clock, Bell } from 'lucide-react';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@/lib/push/subscribe';
import MfaSetupSection from '@/components/settings/MfaSetupSection';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface TourStatus {
  module_slug: string;
  app: string;
  status: 'available' | 'in_progress' | 'completed' | 'skipped';
}

// All non-admin nav items as choosable home pages
const HOME_OPTIONS = NAV_GROUPS
  .filter((g) => g.id !== 'admin')
  .flatMap((g) =>
    g.items
      .filter((i) => !i.adminOnly)
      .map((i) => ({ ...i, group: g.label }))
  );

function Toggle({ on, saving, onToggle }: { on: boolean; saving: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={saving}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? 'bg-amber-600' : 'bg-neutral-600'
      } ${saving ? 'opacity-50' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function DashboardSettingsPage() {
  const [current, setCurrent] = useState<string>('/dashboard/contractor');
  const [selected, setSelected] = useState<string>('/dashboard/contractor');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanAutoSave, setScanAutoSave] = useState(false);
  const [scanAutoSaveSaving, setScanAutoSaveSaving] = useState(false);
  const [clockFormat, setClockFormat] = useState<'12h' | '24h'>('12h');
  const [clockSaving, setClockSaving] = useState(false);
  const [likesPublic, setLikesPublic] = useState(false);
  const [showDoneCounts, setShowDoneCounts] = useState(false);
  const [socialSaving, setSocialSaving] = useState(false);
  const [tours, setTours] = useState<TourStatus[]>([]);

  // Notification preferences
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [clockInReminder, setClockInReminder] = useState(true);
  const [clockInMinutes, setClockInMinutes] = useState(15);
  const [clockOutReminder, setClockOutReminder] = useState(true);
  const [payDayReminder, setPayDayReminder] = useState(true);
  const [jobStartReminder, setJobStartReminder] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  const loadTours = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/status');
      if (res.ok) {
        const d = await res.json();
        setTours(d.tours ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    offlineFetch('/api/user/preferences')
      .then((r) => r.json())
      .then((d) => {
        const home = d.dashboard_home ?? '/dashboard/contractor';
        setCurrent(home);
        setSelected(home);
        setScanAutoSave(d.scan_auto_save_images ?? false);
        setClockFormat(d.clock_format ?? '12h');
        setLikesPublic(d.likes_public ?? false);
        setShowDoneCounts(d.show_done_counts ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load notification preferences
    offlineFetch('/api/user/notification-preferences')
      .then((r) => r.json())
      .then((d) => {
        if (d.prefs) {
          setClockInReminder(d.prefs.clock_in_reminder ?? true);
          setClockInMinutes(d.prefs.clock_in_minutes_before ?? 15);
          setClockOutReminder(d.prefs.clock_out_reminder ?? true);
          setPayDayReminder(d.prefs.pay_day_reminder ?? true);
          setJobStartReminder(d.prefs.job_start_reminder ?? true);
        }
      })
      .catch(() => {});

    // Check push subscription status
    isPushSubscribed().then(setPushEnabled).catch(() => {});

    loadTours();
  }, [loadTours]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await offlineFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboard_home: selected }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to save');
      }
      setCurrent(selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function togglePref(key: string, currentVal: boolean, setter: (v: boolean) => void, savingSetter: (v: boolean) => void) {
    savingSetter(true);
    try {
      const newVal = !currentVal;
      const res = await offlineFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newVal }),
      });
      if (res.ok) setter(newVal);
    } finally {
      savingSetter(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  // Group options by their nav group label
  const grouped = HOME_OPTIONS.reduce<Record<string, typeof HOME_OPTIONS>>((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = [];
    acc[opt.group].push(opt);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Home Page */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Home Page</h2>
        <p className="text-sm text-slate-500 mb-5">
          Choose which page you land on when you log in.
        </p>

        <div className="space-y-4">
          {Object.entries(grouped).map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {groupLabel}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = selected === item.href;
                  return (
                    <button
                      key={item.href}
                      onClick={() => setSelected(item.href)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition text-left min-h-11 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-900/20 text-amber-300'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-amber-700 hover:bg-slate-100/80'
                      }`}
                    >
                      <ItemIcon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">{error}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || selected === current}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-11"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Preference'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-400 font-medium">
              <Check className="w-4 h-4" />
              Saved!
            </span>
          )}
        </div>
      </div>

      {/* Clock Format */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">Clock Format</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Choose how times are displayed throughout the app.
        </p>

        <div className="flex gap-3">
          {(['12h', '24h'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={async () => {
                if (fmt === clockFormat) return;
                setClockSaving(true);
                try {
                  const res = await offlineFetch('/api/user/preferences', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clock_format: fmt }),
                  });
                  if (res.ok) setClockFormat(fmt);
                } finally {
                  setClockSaving(false);
                }
              }}
              disabled={clockSaving}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition min-h-11 ${
                clockFormat === fmt
                  ? 'bg-amber-600 text-white'
                  : 'border border-slate-200 bg-slate-100 text-slate-700 hover:border-amber-700'
              } ${clockSaving ? 'opacity-50' : ''}`}
            >
              {fmt === '12h' ? '12-hour (2:30 PM)' : '24-hour (14:30)'}
            </button>
          ))}
        </div>
      </div>

      {/* Scan Preferences */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Smart Scan</h2>
        <p className="text-sm text-slate-500 mb-5">
          Configure how scanned documents are handled.
        </p>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-slate-800">Auto-save scanned images</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Automatically upload receipt/document images to your account when scanning
            </p>
          </div>
          <Toggle
            on={scanAutoSave}
            saving={scanAutoSaveSaving}
            onToggle={() => togglePref('scan_auto_save_images', scanAutoSave, setScanAutoSave, setScanAutoSaveSaving)}
          />
        </label>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
        </div>
        <p className="text-sm text-slate-500">
          Get push notifications for job reminders. Requires browser permission.
        </p>

        {/* Push enable/disable */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Push notifications</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {pushEnabled ? 'Enabled on this device' : 'Enable to receive alerts'}
            </p>
          </div>
          <button
            onClick={async () => {
              setPushLoading(true);
              try {
                if (pushEnabled) {
                  await unsubscribeFromPush();
                  setPushEnabled(false);
                } else {
                  const sub = await subscribeToPush();
                  setPushEnabled(!!sub);
                }
              } catch {
                // Permission denied or unavailable
              } finally {
                setPushLoading(false);
              }
            }}
            disabled={pushLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition min-h-11 ${
              pushEnabled
                ? 'border border-slate-200 bg-slate-100 text-slate-700 hover:border-red-700 hover:text-red-400'
                : 'bg-amber-600 text-white hover:bg-amber-500'
            } ${pushLoading ? 'opacity-50' : ''}`}
          >
            {pushLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : pushEnabled ? (
              'Disable'
            ) : (
              'Enable'
            )}
          </button>
        </div>

        {pushEnabled && (
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-800">Clock-in reminder</p>
                <p className="text-xs text-slate-400">Reminder before your job start time</p>
              </div>
              <Toggle
                on={clockInReminder}
                saving={notifSaving}
                onToggle={async () => {
                  setNotifSaving(true);
                  const val = !clockInReminder;
                  try {
                    const res = await offlineFetch('/api/user/notification-preferences', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clock_in_reminder: val }),
                    });
                    if (res.ok) setClockInReminder(val);
                  } finally { setNotifSaving(false); }
                }}
              />
            </label>

            {clockInReminder && (
              <div className="flex items-center gap-3 pl-4">
                <label htmlFor="clock-in-minutes" className="text-xs text-slate-500">Minutes before:</label>
                <select
                  id="clock-in-minutes"
                  value={clockInMinutes}
                  onChange={async (e) => {
                    const val = Number(e.target.value);
                    setClockInMinutes(val);
                    await offlineFetch('/api/user/notification-preferences', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clock_in_minutes_before: val }),
                    });
                  }}
                  className="border border-slate-200 bg-slate-100 text-slate-900 rounded-lg px-3 py-1.5 text-sm focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </div>
            )}

            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-800">Clock-out reminder</p>
                <p className="text-xs text-slate-400">Alert when your expected end time arrives</p>
              </div>
              <Toggle
                on={clockOutReminder}
                saving={notifSaving}
                onToggle={async () => {
                  setNotifSaving(true);
                  const val = !clockOutReminder;
                  try {
                    const res = await offlineFetch('/api/user/notification-preferences', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clock_out_reminder: val }),
                    });
                    if (res.ok) setClockOutReminder(val);
                  } finally { setNotifSaving(false); }
                }}
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-800">Pay day reminder</p>
                <p className="text-xs text-slate-400">Check if payment received for completed jobs</p>
              </div>
              <Toggle
                on={payDayReminder}
                saving={notifSaving}
                onToggle={async () => {
                  setNotifSaving(true);
                  const val = !payDayReminder;
                  try {
                    const res = await offlineFetch('/api/user/notification-preferences', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ pay_day_reminder: val }),
                    });
                    if (res.ok) setPayDayReminder(val);
                  } finally { setNotifSaving(false); }
                }}
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-800">Job start reminder</p>
                <p className="text-xs text-slate-400">Morning notification on work days</p>
              </div>
              <Toggle
                on={jobStartReminder}
                saving={notifSaving}
                onToggle={async () => {
                  setNotifSaving(true);
                  const val = !jobStartReminder;
                  try {
                    const res = await offlineFetch('/api/user/notification-preferences', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ job_start_reminder: val }),
                    });
                    if (res.ok) setJobStartReminder(val);
                  } finally { setNotifSaving(false); }
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Social & Privacy */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Social & Privacy</h2>
        <p className="text-xs text-slate-500">Your profile is private by default. These settings control what others can see.</p>

        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-800">Show my likes publicly</p>
            <p className="text-xs text-slate-400">Others can see content you&apos;ve liked</p>
          </div>
          <Toggle
            on={likesPublic}
            saving={socialSaving}
            onToggle={() => togglePref('likes_public', likesPublic, setLikesPublic, setSocialSaving)}
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-800">Show activity counts on profile</p>
            <p className="text-xs text-slate-400">Others can see your activity stats</p>
          </div>
          <Toggle
            on={showDoneCounts}
            saving={socialSaving}
            onToggle={() => togglePref('show_done_counts', showDoneCounts, setShowDoneCounts, setSocialSaving)}
          />
        </label>
      </div>

      {/* Module Tours */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">Module Tours</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Re-take any feature walkthrough to refresh your memory.
        </p>

        {tours.length > 0 ? (
          <div className="space-y-2">
            {tours.map((t) => (
              <div
                key={`${t.app}-${t.module_slug}`}
                className="flex items-center justify-between rounded-lg bg-slate-100 border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 uppercase">{t.app}</span>
                  <span className="text-sm text-slate-800 capitalize">
                    {t.module_slug.replace(/-/g, ' ')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'completed'
                      ? 'bg-green-900/40 text-green-400'
                      : t.status === 'in_progress'
                        ? 'bg-amber-900/40 text-amber-400'
                        : t.status === 'skipped'
                          ? 'bg-neutral-700 text-slate-500'
                          : 'bg-neutral-700 text-slate-400'
                  }`}>
                    {t.status === 'in_progress' ? 'in progress' : t.status}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/onboarding/tours/${t.module_slug}/restart`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ app: t.app }),
                    });
                    loadTours();
                  }}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-400 transition min-h-11 px-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Restart
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No tours started yet. Explore features to begin.</p>
        )}

        {tours.length > 0 && (
          <div className="mt-4">
            <button
              onClick={async () => {
                if (!confirm('Restart all module tours? Sparkle badges will reappear on every feature.')) return;
                await fetch('/api/onboarding/tours/reset', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                });
                loadTours();
              }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-amber-400 transition min-h-11 px-2"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Restart All Tours
            </button>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <MfaSetupSection />
    </div>
  );
}
