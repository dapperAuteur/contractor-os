// components/ecosystem/TravelMovedNotice.tsx
// Shown where Work.WitUS used to have Travel and Mileage. Trips, vehicles, fuel and job mileage
// now belong to RideWitUS (plan 18 §8 answer 3, BAM 2026-11-01). Work.WitUS keeps no travel data.

import { Car, ExternalLink } from 'lucide-react';
import { CENTOS_TRAVEL_URL, RIDEWITUS_APP_URL } from '@/lib/ecosystem/links';

export default function TravelMovedNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-labelledby="travel-moved-heading"
      className={`rounded-xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex items-start gap-3">
        <Car className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="space-y-3">
          <h2 id="travel-moved-heading" className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-lg'}`}>
            Trips and mileage are moving to RideWitUS
          </h2>
          <p className="text-sm text-slate-500">
            RideWitUS is the WitUS home for trips, vehicles, fuel, maintenance and job mileage.
            Work.WitUS no longer keeps its own travel log. Sign in to RideWitUS with the same WitUS account.
          </p>
          <p className="text-sm text-slate-500">
            Trips you logged before the move are still in CentenarianOS until RideWitUS imports them.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={RIDEWITUS_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              Open RideWitUS
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a
              href={CENTOS_TRAVEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              Earlier trips in CentenarianOS
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
