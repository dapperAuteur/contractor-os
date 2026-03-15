'use client';

// components/equipment/EquipmentMediaGallery.tsx
// Multi-media gallery for equipment items — upload, view, reorder, delete.

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Plus, X, Loader2, Film, ImageIcon, GripVertical,
  ChevronLeft, ChevronRight, Maximize2,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface MediaItem {
  id: string;
  url: string;
  public_id: string | null;
  media_type: 'image' | 'video' | 'audio';
  title: string | null;
  sort_order: number;
}

interface Props {
  equipmentId: string;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|avi)/i.test(url) || url.includes('/video/');
}

export default function EquipmentMediaGallery({ equipmentId }: Props) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await offlineFetch(`/api/equipment/${equipmentId}/media`);
      const data = await res.json();
      setMedia(data.media || []);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [equipmentId]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      setError('Cloudinary is not configured.');
      return;
    }

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('upload_preset', uploadPreset);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          { method: 'POST', body: form },
        );
        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
        const uploadData = await uploadRes.json();

        const mediaType = isVideo(uploadData.secure_url) ? 'video' : 'image';

        await offlineFetch(`/api/equipment/${equipmentId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: uploadData.secure_url,
            public_id: uploadData.public_id,
            media_type: mediaType,
            title: file.name.replace(/\.[^.]+$/, ''),
          }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    load();
  }

  async function handleDelete(mediaId: string) {
    if (!confirm('Remove this media?')) return;
    setDeleting(mediaId);
    try {
      await offlineFetch(`/api/equipment/${equipmentId}/media/${mediaId}`, {
        method: 'DELETE',
      });
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      if (lightboxIdx !== null) setLightboxIdx(null);
    } catch {
      setError('Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  async function handleReorder(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= media.length) return;
    const reordered = [...media];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setMedia(reordered);

    // Persist new sort orders
    await Promise.all(
      reordered.map((m, i) =>
        offlineFetch(`/api/equipment/${equipmentId}/media/${m.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: i }),
        }),
      ),
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading media...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Media ({media.length})
        </h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition min-h-11 px-2"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Uploading...' : 'Add Media'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-3" role="alert">{error}</p>
      )}

      {media.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
          <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-slate-400">No media yet</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-2 text-xs text-amber-400 hover:underline min-h-11 px-2"
          >
            Upload photos or videos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.map((m, idx) => (
            <div
              key={m.id}
              className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
            >
              {/* Thumbnail */}
              <button
                onClick={() => setLightboxIdx(idx)}
                className="w-full aspect-square block"
                aria-label={`View ${m.title || 'media'}`}
              >
                {m.media_type === 'video' ? (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                    <video
                      src={m.url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Film className="w-8 h-8 text-white/80" />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={m.url}
                    alt={m.title || 'Equipment media'}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>

              {/* Overlay controls */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => setLightboxIdx(idx)}
                  className="w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                  aria-label="Expand"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deleting === m.id}
                  className="w-7 h-7 bg-red-600/80 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  aria-label="Delete"
                >
                  {deleting === m.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Reorder arrows */}
              <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                {idx > 0 && (
                  <button
                    onClick={() => handleReorder(idx, idx - 1)}
                    className="w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                    aria-label="Move left"
                  >
                    <GripVertical className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Title */}
              {m.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-[11px] text-white truncate">{m.title}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && media[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {lightboxIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
              className="absolute left-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 z-10"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {lightboxIdx < media.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
              className="absolute right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 z-10"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl max-h-[85vh] w-full">
            {media[lightboxIdx].media_type === 'video' ? (
              <video
                src={media[lightboxIdx].url}
                controls
                autoPlay
                className="w-full max-h-[85vh] rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media[lightboxIdx].url}
                alt={media[lightboxIdx].title || 'Equipment media'}
                className="w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}
            {media[lightboxIdx].title && (
              <p className="text-center text-sm text-slate-700 mt-3">{media[lightboxIdx].title}</p>
            )}
            <p className="text-center text-xs text-slate-400 mt-1">
              {lightboxIdx + 1} of {media.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
