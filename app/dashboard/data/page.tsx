'use client';

// app/dashboard/data/page.tsx
// Centralized Data Hub — import/export for all modules.

import Link from 'next/link';
import {
  DollarSign, Package,
  Users, Upload, Download, FileDown,
  Database,
} from 'lucide-react';

interface ModuleCard {
  slug: string;
  label: string;
  icon: React.ReactNode;
  exportUrl: string;
  importHref: string;
  templateUrl: string;
  description: string;
  filters?: string;
}

const MODULES: ModuleCard[] = [
  {
    slug: 'finance',
    label: 'Finance',
    icon: <DollarSign className="w-5 h-5" />,
    exportUrl: '/api/finance/export',
    importHref: '/dashboard/finance/import',
    templateUrl: '/templates/finance-import-template.csv',
    description: 'Transactions — income, expenses, and transfers',
    filters: '?from=YYYY-MM-DD&to=YYYY-MM-DD',
  },
  {
    slug: 'equipment',
    label: 'Equipment',
    icon: <Package className="w-5 h-5" />,
    exportUrl: '/api/equipment/export',
    importHref: '/dashboard/data/import/equipment',
    templateUrl: '/templates/equipment-import-template.csv',
    description: 'Gear, tools, and merchandise tracking',
    filters: '?category_id=',
  },
  {
    slug: 'contacts',
    label: 'Contacts',
    icon: <Users className="w-5 h-5" />,
    exportUrl: '/api/contacts/export',
    importHref: '/dashboard/data/import/contacts',
    templateUrl: '/templates/contacts-import-template.csv',
    description: 'Vendors, customers, and saved locations',
    filters: '?type=vendor|customer|location',
  },
];

export default function DataHubPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="w-6 h-6 text-amber-600" />
          Data Hub
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Import and export your data across all modules. Download CSV templates, upload bulk data, or export filtered datasets.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-4 text-sm text-gray-700 space-y-2">
        <p className="font-medium text-amber-900">How it works</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li><strong>Export</strong> — click the Export button to download all your data as a CSV file. Add date range or filter parameters to the URL for filtered exports.</li>
          <li><strong>Import</strong> — download the CSV template, fill in your data, then upload it on the import page. Preview your data before confirming.</li>
          <li><strong>Google Sheets</strong> — publish your Google Sheet as CSV, then paste the URL on any import page.</li>
          <li><strong>Max 1,000 rows</strong> per import (500 for contacts).</li>
        </ul>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map((mod) => (
          <div
            key={mod.slug}
            className="bg-white border border-gray-200 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600">
                {mod.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{mod.label}</h3>
                <p className="text-xs text-gray-500">{mod.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={mod.importHref}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-500/10 transition"
              >
                <Upload className="w-3 h-3" />
                Import
              </Link>
              <a
                href={mod.exportUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition"
              >
                <Download className="w-3 h-3" />
                Export All
              </a>
              <a
                href={mod.templateUrl}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-100 transition"
              >
                <FileDown className="w-3 h-3" />
                Template
              </a>
            </div>

            {mod.filters && (
              <p className="text-[10px] text-gray-400 font-mono">
                Export filters: {mod.exportUrl}{mod.filters}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
