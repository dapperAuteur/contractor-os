'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, Plus, Loader2 } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Event {
  id: string;
  name: string;
  client_name: string | null;
  location_name: string | null;
  start_date: string | null;
  end_date: string | null;
  _counts: { jobs: number };
}

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    const res = await offlineFetch('/api/contractor/events');
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  if (loading) {
    return (
      <div className="flex justify-center py-24" role="status">
        <Loader2 className="animate-spin text-slate-400" size={32} aria-hidden="true" />
        <span className="sr-only">Loading events</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">Events</h1>
        <Link
          href="/dashboard/contractor/events/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
        >
          <Plus size={14} aria-hidden="true" /> New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto text-slate-300 mb-3" size={40} aria-hidden="true" />
          <p className="text-sm text-slate-500">No events yet.</p>
          <p className="text-xs text-slate-400 mt-1">Create an event to group related jobs together and reduce redundancy.</p>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Events">
          {events.map((event) => (
            <div key={event.id} role="listitem">
            <Link
              href={`/dashboard/contractor/events/${event.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition"
            >
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 truncate">{event.name}</h2>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-1">
                  {event.client_name && <span>{event.client_name}</span>}
                  {event.location_name && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin size={10} aria-hidden="true" /> {event.location_name}
                    </span>
                  )}
                  {event.start_date && (
                    <span>
                      {new Date(event.start_date + 'T00:00').toLocaleDateString()}
                      {event.end_date && event.end_date !== event.start_date && (
                        <> – {new Date(event.end_date + 'T00:00').toLocaleDateString()}</>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0 ml-4">
                <Users size={12} aria-hidden="true" />
                <span>{event._counts.jobs} job{event._counts.jobs !== 1 ? 's' : ''}</span>
              </div>
            </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
