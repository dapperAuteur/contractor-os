'use client';

// app/dashboard/data/import/[module]/page.tsx
// Dynamic import page — renders GenericImportPage for any module slug.

import { useParams, redirect } from 'next/navigation';
import GenericImportPage from '@/components/data/GenericImportPage';

interface ModuleConfig {
  moduleName: string;
  apiEndpoint: string;
  templateUrl: string;
  instructions: string;
  columns: { key: string; label: string; required?: boolean }[];
  previewColumns: string[];
  maxRows?: number;
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  equipment: {
    moduleName: 'Equipment',
    apiEndpoint: '/api/equipment/import',
    templateUrl: '/templates/equipment-import-template.csv',
    instructions:
      'Upload equipment and gear. Required: name. Categories are auto-created if they don\'t exist. If current_value is empty, it defaults to purchase_price. ownership_type: \'own\' (default) or \'access\'.',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'category_name', label: 'Category' },
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'serial_number', label: 'Serial Number' },
      { key: 'purchase_date', label: 'Purchase Date' },
      { key: 'purchase_price', label: 'Purchase Price ($)' },
      { key: 'current_value', label: 'Current Value ($)' },
      { key: 'warranty_expires', label: 'Warranty Expires' },
      { key: 'condition', label: 'Condition' },
      { key: 'notes', label: 'Notes' },
      { key: 'ownership_type', label: 'Ownership Type' },
    ],
    previewColumns: ['name', 'category_name', 'brand', 'purchase_price', 'condition', 'ownership_type'],
  },
  contacts: {
    moduleName: 'Contacts',
    apiEndpoint: '/api/contacts/import',
    templateUrl: '/templates/contacts-import-template.csv',
    instructions:
      'Upload contacts. Required: name, contact_type (vendor/customer/location). Duplicates by name+type are updated, not created twice. Include location fields to add saved locations. Max 500.',
    columns: [
      { key: 'name', label: 'Name', required: true },
      { key: 'contact_type', label: 'Type', required: true },
      { key: 'notes', label: 'Notes' },
      { key: 'location_label', label: 'Location Label' },
      { key: 'address', label: 'Address' },
      { key: 'lat', label: 'Latitude' },
      { key: 'lng', label: 'Longitude' },
    ],
    previewColumns: ['name', 'contact_type', 'notes', 'location_label', 'address'],
    maxRows: 500,
  },
  blog: {
    moduleName: 'Blog Posts',
    apiEndpoint: '/api/blog/import',
    templateUrl: '/templates/blog-import-template.csv',
    instructions:
      'Upload blog posts. Required: title. Content is markdown (converted to rich text automatically). Tags are pipe-separated (e.g. tag1|tag2). Video URL is optional — placed at the top of the post.',
    columns: [
      { key: 'title', label: 'Title', required: true },
      { key: 'slug', label: 'Slug' },
      { key: 'excerpt', label: 'Excerpt' },
      { key: 'visibility', label: 'Visibility (draft/private/public)' },
      { key: 'tags', label: 'Tags (pipe-separated)' },
      { key: 'video_url', label: 'Video URL' },
      { key: 'content', label: 'Content (markdown)' },
    ],
    previewColumns: ['title', 'slug', 'visibility', 'tags'],
  },
};

export default function DynamicImportPage() {
  const params = useParams();
  const slug = params.module as string;

  // Finance and existing health-metrics import pages already exist
  if (slug === 'finance') {
    redirect('/dashboard/finance/import');
  }

  const config = MODULE_CONFIGS[slug];
  if (!config) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Module Not Found</h1>
        <p className="text-gray-500">
          The import module &quot;{slug}&quot; does not exist. Go back to the{' '}
          <a href="/dashboard/data" className="text-amber-600 underline">Data Hub</a>.
        </p>
      </div>
    );
  }

  return (
    <GenericImportPage
      moduleName={config.moduleName}
      backHref="/dashboard/data"
      apiEndpoint={config.apiEndpoint}
      templateUrl={config.templateUrl}
      columns={config.columns}
      instructions={config.instructions}
      previewColumns={config.previewColumns}
      maxRows={config.maxRows}
    />
  );
}
