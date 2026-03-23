'use client';

// components/nav/ContractorLayout.tsx
// Light "Clean Slate" layout shell for the contractor dashboard.

import ContractorNav from './ContractorNav';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import MfaBanner from '@/components/ui/MfaBanner';
import TourRunner from '@/components/onboarding/TourRunner';
import FloatingActionsMenu from '@/components/ui/FloatingActionsMenu';

interface Props {
  username: string | null;
  unreadMessages: number;
  onLogout: () => void;
  isAdmin?: boolean;
  untoured?: Set<string>;
  onToursChanged?: () => void;
  children: React.ReactNode;
}

export default function ContractorLayout({ username, unreadMessages, onLogout, isAdmin, untoured, onToursChanged, children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <ContractorNav username={username} unreadMessages={unreadMessages} onLogout={onLogout} isAdmin={isAdmin} untoured={untoured} />
      <MfaBanner />
      <OfflineIndicator />
      <main id="main-content" className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-6">
        {children}
      </main>
      <FloatingActionsMenu isAdmin={isAdmin} />
      <TourRunner app="contractor" onToursChanged={onToursChanged} />
    </div>
  );
}
