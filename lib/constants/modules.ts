// lib/constants/modules.ts
// Canonical module names for usage tracking and analytics.
// CentenarianOS modules and Travel removed in plan 18 Phase 1.

export const MODULES = {
  FINANCE: 'finance',
  EQUIPMENT: 'equipment',
  ACADEMY: 'academy',
  LIFE_CATEGORIES: 'life_categories',
  CONTACTS: 'contacts',
  DATA_HUB: 'data_hub',
} as const;

export type ModuleName = (typeof MODULES)[keyof typeof MODULES];
