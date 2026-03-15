'use client';

// components/nav/DesktopNav.tsx
// Desktop grouped-dropdown navigation header + mobile compact header (logo + bell).
// The mobile bottom tab bar handles the main mobile nav; this component owns the top bar.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Lock,
  Bell,
  Zap,
  Shield,
  Presentation,
  UserCircle,
  CreditCard,
  MessageCircle,
  LogOut,
  Menu,
  Settings,
} from 'lucide-react';
import { getVisibleGroups, isGroupActive, isItemActive } from './NavConfig';
import MobileDrawer from './MobileDrawer';

export interface DesktopNavProps {
  hasAccess: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  username: string | null;
  unreadMessages: number;
  adminUnread?: number;
  onLogout: () => void;
  subLoading: boolean;
  allowedModules?: string[] | null;
}

export default function DesktopNav({
  hasAccess,
  isAdmin,
  isTeacher,
  username,
  unreadMessages,
  adminUnread = 0,
  onLogout,
  subLoading,
  allowedModules,
}: DesktopNavProps) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const visibleGroups = getVisibleGroups(isAdmin, allowedModules);

  // Close all dropdowns on route change
  useEffect(() => {
    setOpenGroup(null);
    setUserMenuOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  return (
    <nav
      ref={navRef}
      className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50"
      aria-label="Main navigation"
    >
      {/* Skip to content — visually hidden, accessible on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:px-3 focus:py-2 focus:bg-amber-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Desktop header (lg+) ─────────────────────────────────────── */}
        <div className="hidden lg:flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-slate-900 shrink-0 mr-4">
            Work.WitUS
          </Link>

          {/* Group dropdown buttons */}
          <div className="flex items-center gap-0.5">
            {visibleGroups.map((group) => {
              const active = isGroupActive(group, pathname);
              const isOpen = openGroup === group.id;
              return (
                <div key={group.id} className="relative">
                  <button
                    onClick={() => setOpenGroup(isOpen ? null : group.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition min-h-11 ${
                      active
                        ? 'text-amber-700 bg-amber-500/10'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                  >
                    {group.label}
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50"
                      role="menu"
                    >
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isItemActive(item.href, pathname);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2.5 px-3 py-2 text-sm transition min-h-11 ${
                              active
                                ? 'bg-amber-500/10 text-amber-700'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                            role="menuitem"
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setOpenGroup(null)}
                          >
                            <ItemIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {item.label}
                            {item.paid && !hasAccess && (
                              <Lock className="w-3 h-3 ml-auto shrink-0 text-amber-500" aria-hidden="true" />
                            )}
                            {item.href === '/dashboard/admin/submissions' && adminUnread > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-4.5 text-center leading-none">
                                {adminUnread}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 pl-4 border-l border-slate-200 ml-auto">
            {/* Teach — teacher/admin only */}
            {isTeacher && (
              <Link
                href="/dashboard/teaching"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition min-h-11 ${
                  pathname.startsWith('/dashboard/teaching')
                    ? 'text-purple-700 bg-purple-50'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
                aria-current={pathname.startsWith('/dashboard/teaching') ? 'page' : undefined}
              >
                <Presentation className="w-4 h-4" aria-hidden="true" />
                Teach
              </Link>
            )}

            {/* Admin badge */}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold hover:bg-slate-800 transition min-h-11"
              >
                <Shield className="w-3 h-3" aria-hidden="true" />
                Admin
              </Link>
            )}

            {/* Upgrade CTA */}
            {!subLoading && !hasAccess && (
              <Link
                href="/pricing"
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition min-h-11"
              >
                <Zap className="w-3 h-3" aria-hidden="true" />
                Upgrade
              </Link>
            )}

            {/* Messages bell */}
            <Link
              href="/dashboard/messages"
              className="relative flex items-center justify-center min-h-11 min-w-11 p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
              aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ''}`}
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-600 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition min-h-11"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <UserCircle className="w-4 h-4" aria-hidden="true" />
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50"
                  role="menu"
                >
                  {username && (
                    <Link
                      href={`/profiles/${username}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition min-h-11"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      My Profile
                    </Link>
                  )}
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition min-h-11"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Settings
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition min-h-11"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <CreditCard className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Billing
                  </Link>
                  <Link
                    href="/dashboard/feedback"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition min-h-11"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Feedback
                  </Link>
                  <div className="my-1 border-t border-slate-200" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition min-h-11"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile compact header (< lg) ─────────────────────────────── */}
        <div className="flex lg:hidden items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-center min-h-11 min-w-11 p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <Link href="/" className="text-xl font-bold text-slate-900">
              Work.WitUS
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {!subLoading && !hasAccess && (
              <Link
                href="/pricing"
                className="flex items-center gap-1 px-2 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition min-h-11"
              >
                <Zap className="w-3 h-3" aria-hidden="true" />
                Upgrade
              </Link>
            )}
            <Link
              href="/dashboard/messages"
              className="relative flex items-center justify-center min-h-11 min-w-11 p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
              aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ''}`}
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-600 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        hasAccess={hasAccess}
        isAdmin={isAdmin}
        isTeacher={isTeacher}
        username={username}
        unreadMessages={unreadMessages}
        onLogout={onLogout}
        allowedModules={allowedModules}
      />
    </nav>
  );
}
