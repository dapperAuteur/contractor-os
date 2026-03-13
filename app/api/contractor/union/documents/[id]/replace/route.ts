// app/api/contractor/union/documents/[id]/replace/route.ts
// POST: replace a document's file
//   - Private doc (is_shared=false): delete old chunks, reprocess new file immediately
//   - Shared doc (is_shared=true): upload to Cloudinary, queue as pending submission (admin must approve)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const maxDuration = 120;

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const EMBEDDING_MODEL = 'gemini-embedding-001';
const BATCH_SIZE = 5;

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
]);

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) throw new Error(`Embedding error: ${await res.text()}`);
  const data = await res.json();
  return data.embedding?.values ?? [];
}

async function extractPdfText(base64: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY!;
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Extract all text content from this document. Preserve structure with headings, sections, and paragraphs. Return only the extracted text.' },
            { inlineData: { mimeType: 'application/pdf', data: base64 } },
          ],
        }],
      }),
    },
  );
  if (!res.ok) throw new Error(`Failed to extract PDF text: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start = end - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }
  return chunks;
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  // Ownership check
  const { data: doc } = await db
    .from('union_documents')
    .select('id, user_id, name, union_local, doc_type, is_shared')
    .eq('id', id)
    .maybeSingle();

  if (!doc || doc.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only PDF, TXT, and Markdown files are supported' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  // --- SHARED DOCUMENT: queue for admin review ---
  if (doc.is_shared) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    const uploadForm = new FormData();
    uploadForm.append('file', file);
    uploadForm.append('upload_preset', uploadPreset);
    uploadForm.append('folder', 'union-submissions');
    uploadForm.append('resource_type', 'raw');

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
      { method: 'POST', body: uploadForm },
    );

    if (!uploadRes.ok) {
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    const uploadData = await uploadRes.json();

    const { data: submission, error: subErr } = await db
      .from('union_rag_submissions')
      .insert({
        user_id: user.id,
        file_url: uploadData.secure_url,
        file_name: file.name,
        union_local: doc.union_local,
        doc_type: doc.doc_type,
        description: `Replacement for: ${doc.name}`,
        status: 'pending',
        replaces_document_id: doc.id,
      })
      .select()
      .single();

    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });
    return NextResponse.json({ queued: true, submission_id: submission.id }, { status: 201 });
  }

  // --- PRIVATE DOCUMENT: replace immediately ---
  await db.from('union_documents').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', id);

  try {
    let fullText: string;
    if (file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      fullText = await extractPdfText(buffer.toString('base64'));
    } else {
      fullText = await file.text();
    }

    if (!fullText.trim()) {
      await db.from('union_documents').update({ status: 'error', error_msg: 'No text could be extracted' }).eq('id', id);
      return NextResponse.json({ error: 'No text could be extracted from file' }, { status: 400 });
    }

    // Delete old chunks
    await db.from('union_document_chunks').delete().eq('document_id', id);

    // Chunk and embed in parallel batches
    const chunks = chunkText(fullText);
    const chunkRows = [];
    for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
      const batch = chunks.slice(b, b + BATCH_SIZE);
      const embeddings = await Promise.all(batch.map((c) => getEmbedding(c)));
      for (let j = 0; j < batch.length; j++) {
        chunkRows.push({
          document_id: id,
          chunk_text: batch[j],
          chunk_index: b + j,
          embedding: `[${embeddings[j].join(',')}]`,
        });
      }
    }

    const { error: chunkErr } = await db.from('union_document_chunks').insert(chunkRows);
    if (chunkErr) {
      await db.from('union_documents').update({ status: 'error', error_msg: chunkErr.message }).eq('id', id);
      return NextResponse.json({ error: chunkErr.message }, { status: 500 });
    }

    await db.from('union_documents').update({
      status: 'ready',
      page_count: chunks.length,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    return NextResponse.json({ replaced: true, chunks: chunks.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Processing failed';
    await db.from('union_documents').update({ status: 'error', error_msg: msg }).eq('id', id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
