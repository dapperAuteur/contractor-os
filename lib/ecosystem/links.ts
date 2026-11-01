// lib/ecosystem/links.ts
// Hosts of sibling WitUS apps that Work.WitUS links out to.
//
// Values are read from the owning apps, not guessed:
// - RideWitUS: https://ride.witus.online (witus lib/identity/clients.ts slug "ride", witus
//   lib/products.ts, ride-wit-us docs/roadmap.md). Its signed-in mobility app lives under /app.
// - CentenarianOS: https://centenarianos.com (witus lib/products.ts). Its travel module is
//   /dashboard/travel; existing trips stay there until RideWitUS imports them (RideWitUS roadmap,
//   "Phase 3: move CentenarianOS travel data here").
//
// Plan 18 §8 answer 3 (BAM, 2026-11-01): RideWitUS is the single travel home, job mileage included.

export const RIDEWITUS_URL = 'https://ride.witus.online';
export const RIDEWITUS_APP_URL = `${RIDEWITUS_URL}/app`;
export const CENTOS_TRAVEL_URL = 'https://centenarianos.com/dashboard/travel';
