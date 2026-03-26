'use client';

// components/marketing/UpgradeBanner.tsx
// Fetches active banners from the API and displays the first matching one.
// Dismissible — stores dismiss per banner ID in localStorage.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Banner {
  id: string;
  title: string;
  body: string;
  cta_text: string;
  cta_url: string;
}

interface UpgradeBannerProps {
  subscriptionStatus: string;
}

const DISMISS_KEY_PREFIX = 'banner_dismissed_';

export default function UpgradeBanner({ subscriptionStatus }: UpgradeBannerProps) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (subscriptionStatus === 'lifetime') return;

    offlineFetch(`/api/banners?tier=${encodeURIComponent(subscriptionStatus)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && data.id) {
          // Check if already dismissed
          const key = `${DISMISS_KEY_PREFIX}${data.id}`;
          if (typeof window !== 'undefined' && localStorage.getItem(key)) return;
          setBanner(data);
        }
      })
      .catch(() => {});
  }, [subscriptionStatus]);

  const handleDismiss = () => {
    if (banner) {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${banner.id}`, '1');
    }
    setDismissed(true);
  };

  if (!banner || dismissed) return null;

  return (
    <div
      className="relative bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-4 sm:p-5"
      role="complementary"
      aria-label="Upgrade promotion"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pr-8">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{banner.title}</p>
            <p className="text-sm text-slate-600 mt-0.5">{banner.body}</p>
          </div>
        </div>
        <Link
          href={banner.cta_url}
          className="flex items-center justify-center px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition min-h-11 shrink-0"
        >
          {banner.cta_text}
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 flex items-center justify-center min-h-11 min-w-11 p-2 text-slate-400 hover:text-slate-600 transition rounded-lg"
        aria-label="Dismiss promotion"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
