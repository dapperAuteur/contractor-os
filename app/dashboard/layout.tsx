// File: app/dashboard/layout.tsx
// Protected layout with contractor/lister navigation and subscription gating.

'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUnreadCount } from '@/lib/hooks/useUnreadCount';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import ContractorLayout from '@/components/nav/ContractorLayout';
import ListerLayout from '@/components/nav/ListerLayout';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import MfaBanner from '@/components/ui/MfaBanner';
import NotificationScheduler from '@/components/NotificationScheduler';
import { SyncProvider } from '@/lib/contexts/SyncContext';
import { offlineFetch } from '@/lib/offline/offline-fetch';

// Routes freely accessible without a paid subscription
const FREE_ROUTE_PREFIXES = [
  '/dashboard/billing',
  '/dashboard/messages',
  '/dashboard/feedback',
  '/dashboard/teaching',
  '/dashboard/settings',
];

function isFreeRoute(pathname: string) {
  return FREE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();
  const { status: subStatus, loading: subLoading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isPaid = subStatus === 'monthly' || subStatus === 'lifetime';
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [contractorRole, setContractorRole] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isInvited, setIsInvited] = useState(false);
  const [inviteModules, setInviteModules] = useState<string[] | null>(null);
  const [untoured, setUntoured] = useState<Set<string>>(new Set());
  const hasAccess = isPaid || isAdmin || isInvited;
  const allowedModules = isInvited && !isPaid && !isAdmin ? inviteModules : null;
  const unreadMessages = useUnreadCount();

  // Determine app mode based on contractor_role from profile
  const appMode = contractorRole === 'lister' ? 'lister' : 'contractor';

  useEffect(() => {
    offlineFetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(d.isAdmin ?? false);
        setIsTeacher(d.isTeacher ?? false);
        setUsername(d.username ?? null);
        setContractorRole(d.contractorRole ?? null);
        setIsInvited(d.isInvited ?? false);
        setInviteModules(d.inviteModules ?? null);
        setAdminLoading(false);
      })
      .catch(() => setAdminLoading(false));
  }, []);

  // Fetch tour status for sparkle badges (auto-seed if no rows exist)
  const refreshTours = useCallback(() => {
    offlineFetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((d) => {
        const appTours = (d.tours ?? []).filter((t: { app: string }) => t.app === appMode);
        if (appTours.length === 0) {
          offlineFetch('/api/onboarding/tours/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app: appMode }),
          })
            .then(() => {
              offlineFetch('/api/onboarding/status')
                .then((r2) => r2.json())
                .then((d2) => {
                  const slugs = new Set<string>();
                  for (const t of d2.tours ?? []) {
                    if (t.status === 'available' && t.app === appMode) slugs.add(t.module_slug);
                  }
                  setUntoured(slugs);
                })
                .catch(() => {});
            })
            .catch(() => {});
          return;
        }
        const slugs = new Set<string>();
        for (const t of appTours) {
          if (t.status === 'available') slugs.add(t.module_slug);
        }
        setUntoured(slugs);
      })
      .catch(() => {});
  }, [appMode]);

  useEffect(() => { refreshTours(); }, [refreshTours]);

  useEffect(() => {
    const handler = () => refreshTours();
    window.addEventListener('tours-reset', handler);
    return () => window.removeEventListener('tours-reset', handler);
  }, [refreshTours]);

  // Redirect free users who land directly on a paid route
  useEffect(() => {
    if (subLoading || loading || adminLoading) return;
    if (!hasAccess && !isFreeRoute(pathname)) {
      router.push('/pricing');
      return;
    }
    if (isInvited && !isPaid && !isAdmin && allowedModules && !isFreeRoute(pathname)) {
      const allowed = allowedModules.some(
        (m) => pathname === m || pathname.startsWith(m + '/'),
      );
      if (!allowed) router.push('/dashboard/contractor');
    }
  }, [hasAccess, isInvited, isPaid, isAdmin, allowedModules, pathname, subLoading, loading, adminLoading, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    const accent = appMode === 'lister' ? 'border-indigo-500' : 'border-amber-500';
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className={`animate-spin h-8 w-8 border-4 ${accent} border-t-transparent rounded-full`} />
      </div>
    );
  }

  const LayoutComponent = appMode === 'lister' ? ListerLayout : ContractorLayout;

  return (
    <SyncProvider>
      <LayoutComponent
        username={username}
        unreadMessages={unreadMessages}
        onLogout={handleLogout}
        untoured={untoured}
        onToursChanged={refreshTours}
      >
        <MfaBanner />
        <OfflineIndicator />
        <NotificationScheduler />
        {children}
      </LayoutComponent>
    </SyncProvider>
  );
}
