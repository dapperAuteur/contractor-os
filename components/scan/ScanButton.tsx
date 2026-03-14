'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import type { DocumentType } from '@/lib/ocr/classify';

export interface ScanResult {
  documentType: DocumentType;
  confidence: number;
  extracted: Record<string, unknown>;
  prefills: {
    job?: Record<string, unknown>;
    invoice?: Record<string, unknown>;
    time_entry?: Record<string, unknown>;
  };
  imageUrl?: string;
  scanImageId?: string;
}

interface ScanButtonProps {
  onResult: (data: ScanResult) => void;
  onError?: (error: string) => void;
  moduleHint?: DocumentType;
  label?: string;
  className?: string;
  maxFiles?: number;
}

const MAX_FILES_DEFAULT = 10;

export default function ScanButton({
  onResult,
  onError,
  moduleHint,
  label = 'Scan',
  className,
  maxFiles = MAX_FILES_DEFAULT,
}: ScanButtonProps) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    setLoading(true);
    try {
      const fd = new FormData();
      for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
        fd.append('files', files[i]);
      }
      if (moduleHint) fd.append('document_type', moduleHint);

      const res = await offlineFetch('/api/contractor/scan', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Scan failed' }));
        onError?.(err.error || 'Scan failed');
        return;
      }

      const json = await res.json();
      const data: ScanResult = {
        documentType: json.classification.document_type,
        confidence: json.classification.confidence,
        extracted: json.extraction.data,
        prefills: json.prefills ?? {},
      };
      onResult(data);
    } catch {
      onError?.('Scan failed — please try again');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const defaultClass =
    'flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition cursor-pointer min-h-11';

  return (
    <label className={className || defaultClass}>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Camera className="w-4 h-4" />
      )}
      {loading ? 'Scanning...' : label}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </label>
  );
}
