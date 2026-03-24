// app/api/help/chat/route.ts
// POST: RAG-powered help chat.
//   1. Embed the user's question via Gemini text-embedding-001
//   2. Find top-5 matching help_articles via pgvector cosine similarity (contractor app)
//   3. Build a context-grounded prompt and call Gemini Flash
//   4. Return the answer

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// gemini-embedding-001 outputs 3072 dims by default; pin to 768 to match schema
const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = 'gemini-2.5-flash';

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS;
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY_WORK_WITUS not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error('RATE_LIMITED');
    throw new Error(`Embedding failed (${res.status})`);
  }
  const data = await res.json();
  return data.embedding?.values ?? [];
}

async function generateAnswer(systemPrompt: string, question: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS;
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY_WORK_WITUS not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'I could not generate a response.';
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  const { question, role } = await request.json();
  if (!question?.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  // 1. Embed the question
  let queryEmbedding: number[];
  try {
    queryEmbedding = await getEmbedding(question.trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'RATE_LIMITED') {
      return NextResponse.json(
        { error: 'The help assistant is busy right now. Please wait a moment and try again.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Could not process your question. Please try again.' }, { status: 500 });
  }

  // 2. Retrieve top-5 matching articles filtered to contractor app
  // pgvector expects the vector as a bracketed string "[0.1,0.2,...]"
  const { data: matches, error: matchError } = await db.rpc('match_help_articles', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_count: 5,
    role_filter: role ?? null,
    app_filter: 'contractor',
  });

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  const context = (matches ?? [])
    .map((m: { title: string; content: string }) => `## ${m.title}\n${m.content}`)
    .join('\n\n---\n\n');

  // 3. Build system prompt
  const systemPrompt = `You are a helpful assistant for Work.WitUS, a professional management platform for contractors in the film, TV, and live entertainment industry.

Answer the user's question using ONLY the documentation context provided below. Be concise, friendly, and specific. If the answer involves a page path (like /dashboard/contractor/jobs), include it. If the context does not contain enough information to answer the question, say so honestly and suggest they use the feedback button to contact support.

--- DOCUMENTATION CONTEXT ---
${context}
--- END CONTEXT ---`;

  // 4. Generate the answer
  let answer: string;
  try {
    answer = await generateAnswer(systemPrompt, question.trim());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed' }, { status: 500 });
  }

  return NextResponse.json({ answer });
}
