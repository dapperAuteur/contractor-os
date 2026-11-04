// File: lib/ai/gemini-embed.ts
// One Gemini embedding call, its rate-limit numbers, and how its errors are read.
//
// Used by the help-article sync (lib/help/embed-sync.ts). Kept free of Next.js, Supabase and `@/`
// imports so the node:test suite can load it with type stripping alone.
//
// THE QUOTA. On 2026-11-04 /admin/sync failed 15 and 29 articles with HTTP 429:
//   quotaMetric generativelanguage.googleapis.com/embed_content_free_tier_requests
//   quotaId     EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier
//   quotaValue  100   (model gemini-embedding-1.0, which is what Google reports for
//                      `gemini-embedding-001`)
// Google applies rate limits "per project, not per API key" and measures them as requests per
// minute, tokens per minute and requests per day; daily quotas reset at midnight Pacific time
// (Google, n.d., "Rate limits", https://ai.google.dev/gemini-api/docs/rate-limits, read
// 2026-11-04; that URL now redirects to aistudio.google.com/docs/rate-limits).
//
// WHY ONE REQUEST PER ARTICLE, NOT batchEmbedContents. The REST API has
// `models/{model}:batchEmbedContents`, but neither the rate-limit page, the embeddings guide
// (https://ai.google.dev/gemini-api/docs/embeddings) nor the API reference
// (https://ai.google.dev/api/embeddings), all read 2026-11-04, says whether a batch call counts as
// one request or one per item against `embed_content_free_tier_requests`. The rate-limit page only
// says the separate asynchronous Batch API has "its own rate limits". Batching on an unverified
// assumption would recreate the original failure at a larger scale, so this file paces single calls.
// If Google documents batch accounting later, `batchEmbedContents` is the place to save requests.

/** The embedding model. Google's quota errors call it `gemini-embedding-1.0`. */
export const EMBEDDING_MODEL = 'gemini-embedding-001';

/**
 * Output size. help_articles.embedding is vector(768); gemini-embedding-001 returns 3072 by default
 * and Google recommends 768, 1536 or 3072 (embeddings guide, read 2026-11-04).
 */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Google's free-tier ceiling for embedContent: 100 requests per minute per project per model.
 * Source: quotaId `EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier`, quotaValue
 * "100", in the 429s of 2026-11-04 (plans/bugs/Admin-Sync Page-*.pdf). See the header comment.
 */
export const GEMINI_EMBED_FREE_TIER_REQUESTS_PER_MINUTE = 100;

/**
 * What the bulk sync allows itself: 60 a minute, one a second. The quota is per PROJECT, and the
 * same project also embeds every help-chat question, every union-chat question and every union
 * document upload, so the sync leaves 40 a minute of headroom for live users instead of spending
 * the whole budget.
 */
export const HELP_SYNC_REQUESTS_PER_MINUTE = 60;

/** Milliseconds between the starts of two sync requests (1000 at 60 a minute). */
export const HELP_SYNC_MIN_INTERVAL_MS = Math.ceil(60_000 / HELP_SYNC_REQUESTS_PER_MINUTE);

/** A Google error with the parts the sync needs: status, retry delay, and a one-line summary. */
export class GeminiEmbedError extends Error {
  readonly status: number;
  /** From RetryInfo.retryDelay (or the "Please retry in" text) when Google sent one. */
  readonly retryAfterMs: number | null;
  /** One line for the admin UI. */
  readonly summary: string;
  /** Google's response body, for the details toggle. Never contains the API key (it is a header). */
  readonly detail: string;

  constructor(status: number, body: string) {
    const summary = summarizeGeminiError(status, body);
    super(summary);
    this.name = 'GeminiEmbedError';
    this.status = status;
    this.retryAfterMs = parseRetryDelayMs(body);
    this.summary = summary;
    this.detail = body.length > 4000 ? `${body.slice(0, 4000)}…` : body;
  }

  get isRateLimit(): boolean {
    return this.status === 429;
  }
}

/** Parse a protobuf Duration string ("45s", "0.68s", "1.5s") into milliseconds. */
function durationToMs(value: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)s\s*$/.exec(value);
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
}

/**
 * How long Google asked us to wait, in ms, or null. Reads `google.rpc.RetryInfo.retryDelay` first,
 * then falls back to the "Please retry in 45.7s" / "680.77ms" sentence in the message, which is more
 * precise (RetryInfo rounds down to whole seconds, sometimes to "0s").
 */
export function parseRetryDelayMs(body: string): number | null {
  let fromInfo: number | null = null;
  let message = body;
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; details?: { '@type'?: string; retryDelay?: string }[] };
    };
    message = parsed.error?.message ?? body;
    for (const d of parsed.error?.details ?? []) {
      if (d['@type']?.endsWith('google.rpc.RetryInfo') && typeof d.retryDelay === 'string') {
        fromInfo = durationToMs(d.retryDelay);
      }
    }
  } catch {
    // Not JSON: fall through to the sentence.
  }
  const sentence = /retry in (\d+(?:\.\d+)?)(ms|s)\b/i.exec(message);
  if (sentence) {
    const n = Number(sentence[1]);
    const ms = Math.ceil(sentence[2].toLowerCase() === 'ms' ? n : n * 1000);
    return fromInfo === null ? ms : Math.max(ms, fromInfo);
  }
  return fromInfo;
}

/** A one-line, human summary of a Google error body. */
export function summarizeGeminiError(status: number, body: string): string {
  let status_ = '';
  let message = '';
  let quota = '';
  try {
    const parsed = JSON.parse(body) as {
      error?: {
        status?: string;
        message?: string;
        details?: { '@type'?: string; violations?: { quotaId?: string; quotaValue?: string }[] }[];
      };
    };
    status_ = parsed.error?.status ?? '';
    message = parsed.error?.message ?? '';
    for (const d of parsed.error?.details ?? []) {
      const v = d.violations?.[0];
      if (d['@type']?.endsWith('google.rpc.QuotaFailure') && v?.quotaId) {
        quota = `${v.quotaId}${v.quotaValue ? ` (limit ${v.quotaValue})` : ''}`;
      }
    }
  } catch {
    message = body;
  }
  if (status === 429) {
    const wait = parseRetryDelayMs(body);
    const waitText = wait === null ? '' : `, retry in ${Math.ceil(wait / 1000)}s`;
    return `Rate limited by Google (429${status_ ? ` ${status_}` : ''}${quota ? `: ${quota}` : ''}${waitText})`;
  }
  const firstLine = message.split('\n')[0].trim().slice(0, 200);
  return `Google embedding error ${status}${status_ ? ` ${status_}` : ''}${firstLine ? `: ${firstLine}` : ''}`;
}

export type Embedder = (text: string) => Promise<number[]>;

/**
 * Build an embedder for one API key. The key travels only in the `x-goog-api-key` header, never in
 * the URL, so no error message, log line or Sentry breadcrumb can carry it.
 */
export function createGeminiEmbedder(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Embedder {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;
  return async (text: string) => {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });
    if (!response.ok) {
      throw new GeminiEmbedError(response.status, await response.text());
    }
    const data = (await response.json()) as { embedding?: { values?: number[] } };
    const values = data.embedding?.values ?? [];
    if (!values.length) throw new Error('Gemini returned an empty embedding vector.');
    return values;
  };
}
