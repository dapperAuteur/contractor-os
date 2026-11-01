'use client';

// app/admin/content-library/page.tsx
// Admin content library: the tutorial series and whether each was imported into the old Academy.
//
// READ-ONLY since plan 18 Phase 1. The Academy left Work.WitUS on 2026-09-07 and the tutorials
// move to Learn.WitUS (plan 18 §8 answer 3). They are not on Learn.WitUS yet, so nothing is
// deleted here: the list stays visible for the move, and importing into the Academy tables is
// turned off (the API answers 410). The course move is an operator task in plans/user-tasks/.

import { useState, useEffect, useCallback } from 'react';
import {
  Library,
  Loader2,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  ExternalLink,
  FileText,
  Layers,
  Info,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface ContentItem {
  slug: string;
  title: string;
  description: string;
  type: 'academy';
  lessonCount: number;
  moduleCount: number;
  hasFiles: boolean;
  imported: boolean;
  courseId: string | null;
  isPublished: boolean;
  importedAt: string | null;
}

function statusBadge(item: ContentItem) {
  if (item.imported && item.isPublished) return { label: 'Published (old Academy)', cls: 'bg-green-100 text-green-700' };
  if (item.imported) return { label: 'Imported (Draft)', cls: 'bg-blue-100 text-blue-700' };
  if (!item.hasFiles) return { label: 'No Files', cls: 'bg-slate-100 text-slate-500' };
  return { label: 'Not imported', cls: 'bg-amber-100 text-amber-700' };
}

export default function ContentLibraryPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await offlineFetch('/api/admin/content-library');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const withFiles = items.filter((i) => i.hasFiles || i.imported);
  const noFiles = items.filter((i) => !i.hasFiles && !i.imported);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Library className="w-5 h-5 text-amber-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Content Library</h1>
            <p className="text-sm text-slate-500">Tutorial series (read-only)</p>
          </div>
        </div>
        <button
          onClick={loadItems}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition min-h-11 focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Refresh content list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Move notice */}
      <div className="mb-8 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">The tutorials are moving to Learn.WitUS.</p>
          <p>
            Work.WitUS no longer has an Academy, so importing here is turned off. This list stays so the
            series can be moved; nothing has been deleted. Once a course is live on Learn.WitUS, the
            Work.WitUS help and nav will link to it.
          </p>
          <a
            href="https://learn.witus.online"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-medium text-amber-700 hover:underline"
          >
            Open Learn.WitUS <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" aria-label="Loading..." />
        </div>
      ) : (
        <>
          {withFiles.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-500" aria-hidden="true" />
                Series with content ({withFiles.length})
              </h2>
              <div className="grid gap-4">
                {withFiles.map((item) => (
                  <ContentCard key={item.slug} item={item} />
                ))}
              </div>
            </section>
          )}

          {noFiles.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" aria-hidden="true" />
                No Content Files ({noFiles.length})
              </h2>
              <div className="grid gap-3">
                {noFiles.map((item) => (
                  <div key={item.slug} className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-500">
                    {item.title} — <span className="italic">no markdown files in content/tutorials/{item.slug}/</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  const badge = statusBadge(item);

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-sm text-slate-500 line-clamp-1 mb-2">{item.description}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          {item.moduleCount} modules
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          {item.lessonCount} lessons
        </span>
        {item.importedAt && (
          <span>
            Imported {new Date(item.importedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}
