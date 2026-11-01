// app/dashboard/travel/page.tsx
// Travel and Mileage left Work.WitUS (plan 18 Phase 1). This route stays so the nav link and old
// bookmarks land on an explanation instead of a 404.

import type { Metadata } from 'next';
import TravelMovedNotice from '@/components/ecosystem/TravelMovedNotice';

export const metadata: Metadata = {
  title: 'Travel moved to RideWitUS',
};

export default function TravelMovedPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold text-slate-900">Travel</h1>
      <TravelMovedNotice />
    </div>
  );
}
