// components/NotificationScheduler.tsx
// Client-side component that fetches upcoming notification events and
// sends them to the service worker for local scheduling via setTimeout.
// Runs inside the dashboard layout. Refreshes every 30 minutes.

'use client';

import { useEffect, useRef } from 'react';

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export default function NotificationScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    async function scheduleNotifications() {
      try {
        const res = await fetch('/api/user/upcoming-notifications');
        if (!res.ok) return;

        const { notifications } = await res.json();
        if (!notifications?.length) return;

        const reg = await navigator.serviceWorker.ready;
        if (!reg.active) return;

        reg.active.postMessage({
          type: 'SCHEDULE_NOTIFICATIONS',
          notifications,
        });
      } catch {
        // Silently fail — notifications are non-critical
      }
    }

    // Schedule on mount and periodically
    scheduleNotifications();
    intervalRef.current = setInterval(scheduleNotifications, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
