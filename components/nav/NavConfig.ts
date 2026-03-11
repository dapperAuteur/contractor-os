// components/nav/NavConfig.ts
// Single source of truth for dashboard navigation groups and items.

import {
  Briefcase,
  Map,
  MapPin,
  Building2,
  Scale,
  DollarSign,
  Navigation,
  BookOpen,
  GraduationCap,
  Package,
  ScanLine,
  Database,
  Inbox,
  UserPlus,
  HardHat,
  CreditCard,
  BarChart3,
  ArrowUpDown,
  Users,
  Library,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  paid: boolean;
  adminOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'work',
    label: 'Work',
    icon: HardHat,
    items: [
      { label: 'Jobs', href: '/dashboard/contractor', icon: HardHat, paid: true },
      { label: 'Rate Cards', href: '/dashboard/contractor/rate-cards', icon: CreditCard, paid: true },
      { label: 'Reports', href: '/dashboard/contractor/reports', icon: BarChart3, paid: true },
      { label: 'Compare', href: '/dashboard/contractor/compare', icon: ArrowUpDown, paid: true },
      { label: 'Board', href: '/dashboard/contractor/board', icon: Users, paid: true },
      { label: 'Venues', href: '/dashboard/contractor/venues', icon: Building2, paid: true },
      { label: 'Cities', href: '/dashboard/contractor/cities', icon: MapPin, paid: true },
      { label: 'Union', href: '/dashboard/contractor/union', icon: Scale, paid: true },
    ],
  },
  {
    id: 'life',
    label: 'Life',
    icon: Navigation,
    items: [
      { label: 'Scan', href: '/dashboard/scan', icon: ScanLine, paid: true },
      { label: 'Finance', href: '/dashboard/finance', icon: DollarSign, paid: true },
      { label: 'Travel', href: '/dashboard/travel', icon: Navigation, paid: true },
      { label: 'Equipment', href: '/dashboard/equipment', icon: Package, paid: true },
      { label: 'Data Hub', href: '/dashboard/data', icon: Database, paid: true },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: GraduationCap,
    items: [
      { label: 'Blog', href: '/dashboard/blog', icon: BookOpen, paid: false, adminOnly: true },
      { label: 'Academy', href: '/academy', icon: GraduationCap, paid: false },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Briefcase,
    items: [
      { label: 'Submissions', href: '/dashboard/admin/submissions', icon: Inbox, paid: false, adminOnly: true },
      { label: 'Invites', href: '/dashboard/admin/invites', icon: UserPlus, paid: false, adminOnly: true },
      { label: 'Content Library', href: '/dashboard/admin/content-library', icon: Library, paid: false, adminOnly: true },
      { label: 'Admin Panel', href: '/admin', icon: Map, paid: false, adminOnly: true },
    ],
  },
];

export function getVisibleGroups(isAdmin: boolean, allowedModules?: string[] | null): NavGroup[] {
  return NAV_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (i.adminOnly && !isAdmin) return false;
        // Invited users with module restrictions: only show allowed paid items
        if (allowedModules && i.paid) {
          return allowedModules.some((m) => i.href === m || i.href.startsWith(m + '/'));
        }
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);
}

export function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => isItemActive(item.href, pathname));
}

export function isItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}
