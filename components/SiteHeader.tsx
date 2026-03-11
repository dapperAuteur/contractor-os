'use client';

// components/SiteHeader.tsx
// Shared nav bar used on public pages (Academy, Blog, Profiles).
// Logged-in users see the full grouped nav (same as dashboard).
// Logged-out users see a minimal public header.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUnreadCount } from '@/lib/hooks/useUnreadCount';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap, LogIn, BookOpen, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import ContractorNav from '@/components/nav/ContractorNav';

function PublicHeader() {
  return (
    <nav className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-neutral-100">
          JobHub
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/academy"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition"
          >
            <GraduationCap className="w-4 h-4" />
            Academy
          </Link>
          <Link
            href="/blog"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition"
          >
            <BookOpen className="w-4 h-4" />
            Blog
          </Link>
          <div className="w-px h-5 bg-neutral-700 mx-2" />
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-500 transition"
          >
            <Zap className="w-4 h-4" />
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function AuthenticatedHeader() {
  const router = useRouter();
  const supabase = createClient();
  const unreadMessages = useUnreadCount();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    offlineFetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setUsername(d.username ?? null);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <ContractorNav
      username={username}
      unreadMessages={unreadMessages}
      onLogout={handleLogout}
    />
  );
}

export default function SiteHeader() {
  const { user, loading } = useAuth();

  if (loading) {
    // Render the public header skeleton while auth loads — avoids layout shift
    return <PublicHeader />;
  }

  if (user) {
    return <AuthenticatedHeader />;
  }

  return <PublicHeader />;
}
