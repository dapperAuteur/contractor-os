// app/api/help/chat/route.ts
// POST: RAG-powered help chat.
//   1. Embed the user's question with mistral-embed (lib/ai/mistral-embed.ts), the model the
//      help_articles.embedding_v2 index is built with
//   2. Find top-5 matching help_articles via match_help_articles_v2 (contractor app). Until the rows
//      are re-embedded, or before migration 226 is applied, this comes back empty and the answer
//      says the docs do not cover it (lib/rag/retrieve.ts), instead of a 500
//   3. Build a context-grounded prompt and call Gemini Flash (generation still uses Gemini)
//   4. Return the answer

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { EmbedRateLimitError, embedQuery } from '@/lib/ai/mistral-embed';
import { matchHelpArticles } from '@/lib/rag/retrieve';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const CHAT_MODEL = 'gemini-2.5-flash';

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
    queryEmbedding = await embedQuery(question.trim());
  } catch (e) {
    const busy = e instanceof EmbedRateLimitError;
    // The message names no key; log the kind only.
    console.warn(`[help-chat] embedding failed: ${e instanceof Error ? e.name : 'unknown'}`);
    return NextResponse.json(
      {
        error: busy
          ? 'The help assistant is busy right now. Please wait a moment and try again.'
          : 'The help assistant is unavailable right now. Please try again later.',
      },
      { status: 503 },
    );
  }

  // 2. Retrieve top-5 matching articles filtered to contractor app
  const { matches, degraded } = await matchHelpArticles((fn, args) => db.rpc(fn, args), queryEmbedding, {
    app: 'contractor',
    role: role ?? null,
    count: 5,
  });
  if (degraded) console.warn(`[help-chat] retrieval degraded: ${degraded}`);

  const context = matches
    .map((m) => `## ${m.title}\n${m.content}`)
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
