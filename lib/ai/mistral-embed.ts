// File: lib/ai/mistral-embed.ts
// Work.WitUS's one embedding provider: Mistral `mistral-embed`, 1024 dimensions. Every writer (help
// sync, union document upload / replace / approve, union re-embed) and every reader (help chat,
// union chat) goes through this file, so the index and the queries can never drift onto two models.
//
// WHY MISTRAL (BAM, 2026-11-04: "can work sync use Mistral instead of Gemini to avoid the 100
// limit?"). Gemini's free tier capped `gemini-embedding-1.0` at 100 embed requests a minute per
// PROJECT (quotaId EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier, the 429s of
// 2026-11-04), and the help sync, both chats and every union upload shared that one budget, one
// request per text. Mistral takes a LIST of texts in one request, so a full help sync is a handful of
// requests instead of 107. Learn.WitUS made the same move (witus-learn src/lib/rag/embed-batch.ts,
// 2026-11-02); this file follows its batching, pacing and 429 handling.
//
// THE API (all read 2026-11-04):
//   - POST https://api.mistral.ai/v1/embeddings, body `{ model, input }` where input is a string or
//     an array of strings; response `data[]` of `{ embedding, index }` plus `usage` (Mistral AI,
//     n.d.-a, https://docs.mistral.ai/api/endpoint/embeddings). The key goes in
//     `Authorization: Bearer`, never in the URL, so no log line or error can carry it.
//   - "dimension 1024 for each text string, regardless of the text length", and several texts may be
//     sent as a list in one request (Mistral AI, n.d.-b,
//     https://docs.mistral.ai/studio/knowledge-rag/embeddings/text_embeddings).
//   - Context 8k tokens per input; USD 0.1 per million tokens (Mistral AI, n.d.-c,
//     https://docs.mistral.ai/models/model-cards/mistral-embed-23-12).
//   - Neither page states a cap on inputs or tokens per REQUEST, so BATCH_MAX_TEXTS and
//     MAX_REQUEST_TOKENS below are our own, deliberately small (Learn's values). Raise them only
//     against a documented limit.
//   - RATE LIMITS "apply at the Workspace level and are shared across all API keys in that
//     Workspace", measured as requests per second (concurrent requests), tokens per minute and tokens
//     per month; the current numbers are in Admin Panel > API > Limits
//     (admin.mistral.ai/plateforme/limits) (Mistral AI, n.d.-d,
//     https://docs.mistral.ai/admin/workspaces/usage-limits). The docs publish no number for a tier.
//     A key shared with Learn.WitUS therefore shares Learn's budget.
//
// PURE apart from `fetch`, `process.env` and timers, all injectable, and free of Next.js, Supabase
// and `@/` imports, so the node:test suite loads it with type stripping alone.

export const EMBED_MODEL = 'mistral-embed';
/** help_articles.embedding_v2 and union_document_chunks.embedding_v2 are vector(1024). */
export const EMBED_DIMS = 1024;
export const EMBED_ENDPOINT = 'https://api.mistral.ai/v1/embeddings';
/** Our own cap on texts per request (Mistral's reference names none). */
export const BATCH_MAX_TEXTS = 64;
/** Our own cap on ESTIMATED tokens per request (Mistral's reference names none; one input may hold 8k). */
export const MAX_REQUEST_TOKENS = 8_000;
/** Characters sent per text; guards a stray long text (about 2,700 tokens at most). */
export const MAX_TEXT_CHARS = 8_000;

/**
 * THE RATE CONSTANT. Requests per minute one caller allows itself: 60, the
 * `x-ratelimit-limit-req-minute` that Mistral returned to Learn.WitUS's key on 2026-11-02
 * (witus-learn embed-batch.ts DEFAULT_REQUESTS_PER_MINUTE). Mistral's docs publish no per-tier
 * number (see the header), so this is the observed limit, not a documented one; the server's own
 * `x-ratelimit-remaining-req-minute` and 429 `Retry-After` are honored on top of it.
 * Override with MISTRAL_EMBED_REQUESTS_PER_MINUTE once the workspace's Limits page says otherwise.
 */
export const MISTRAL_EMBED_REQUESTS_PER_MINUTE = 60;

/**
 * The bulk syncs (/admin/sync, the cron) use half of it, leaving the rest for live help-chat and
 * union-chat questions and, when the key is shared, for Learn.WitUS. With batching a full help sync
 * is about four requests, so this pace costs almost nothing.
 */
export const EMBED_SYNC_REQUESTS_PER_MINUTE = 30;
/** Milliseconds between the starts of two sync requests (2000 at 30 a minute). */
export const EMBED_SYNC_MIN_INTERVAL_MS = Math.ceil(60_000 / EMBED_SYNC_REQUESTS_PER_MINUTE);

export const DEFAULT_MAX_RETRIES = 8;
const WINDOW_MS = 60_000;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_CAP_MS = 60_000;

/** The key, or a clear error. Never echoes the value. */
export function readMistralKey(env: Record<string, string | undefined> = process.env): string {
  const key = env.MISTRAL_API_KEY?.trim();
  if (!key) throw new Error('MISTRAL_API_KEY is not set.');
  return key;
}

/** A CONSERVATIVE token estimate: one token per three characters (English runs near four). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

/** Split texts (by index) into batches of at most `batchSize` texts and `tokenCap` estimated tokens. */
export function planBatches(texts: readonly string[], tokenCap = MAX_REQUEST_TOKENS, batchSize = BATCH_MAX_TEXTS): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  let curTokens = 0;
  texts.forEach((t, i) => {
    const tokens = estimateTokens(t.slice(0, MAX_TEXT_CHARS));
    if (cur.length > 0 && (cur.length >= batchSize || curTokens + tokens > tokenCap)) {
      out.push(cur);
      cur = [];
      curTokens = 0;
    }
    cur.push(i);
    curTokens += tokens;
  });
  if (cur.length) out.push(cur);
  return out;
}

/** A `Retry-After` header in ms: delta seconds ("16", "1.5") or an HTTP date. Null when absent or unreadable. */
export function retryAfterMs(value: string | null | undefined, now: number = Date.now()): number | null {
  if (!value) return null;
  const v = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(v)) return Math.round(Number(v) * 1000);
  const at = Date.parse(v);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

/** Exponential backoff with jitter for a 429 that names no Retry-After. attempt is 1-based. */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (Math.max(1, attempt) - 1));
  return base + Math.floor(random() * 1000);
}

/** One line for the admin UI from a Mistral error body (`{ message, type, code }` or plain text). */
export function summarizeMistralError(status: number, body: string, retryMs: number | null = null): string {
  let message = '';
  try {
    const parsed = JSON.parse(body) as { message?: unknown; detail?: unknown; type?: unknown };
    const m = parsed.message ?? parsed.detail;
    message = typeof m === 'string' ? m : m ? JSON.stringify(m) : '';
  } catch {
    message = body;
  }
  const firstLine = message.split('\n')[0].trim().slice(0, 200);
  if (status === 429) {
    const wait = retryMs === null ? '' : `, retry in ${Math.ceil(retryMs / 1000)}s`;
    return `Rate limited by Mistral (429${wait})${firstLine ? `: ${firstLine}` : ''}`;
  }
  return `Mistral embedding error ${status}${firstLine ? `: ${firstLine}` : ''}`;
}

/** A Mistral HTTP error with what the callers need: status, retry delay and a one-line summary. */
export class MistralEmbedError extends Error {
  readonly status: number;
  /** From the Retry-After header, when Mistral sent one. */
  readonly retryAfterMs: number | null;
  readonly summary: string;
  /** Mistral's response body, for the details toggle. Never contains the key (it is a header). */
  readonly detail: string;

  constructor(status: number, body: string, retryMs: number | null = null) {
    const summary = summarizeMistralError(status, body, retryMs);
    super(summary);
    this.name = 'MistralEmbedError';
    this.status = status;
    this.retryAfterMs = retryMs;
    this.summary = summary;
    this.detail = body.length > 4000 ? `${body.slice(0, 4000)}…` : body;
  }

  get isRateLimit(): boolean {
    return this.status === 429;
  }
}

/** Thrown by embedTexts after `maxRetries` consecutive 429s on one batch. */
export class EmbedRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbedRateLimitError';
  }
}

/** Embeds a list of texts in ONE request and returns one vector per text, in order. */
export type BatchEmbedder = (texts: string[]) => Promise<number[][]>;

export interface PostResult {
  vectors: number[][];
  /** `x-ratelimit-remaining-req-minute`, when the server sent it. */
  remainingRequests: number | null;
}

/**
 * One POST. Throws MistralEmbedError on a non-2xx, and a plain Error on a malformed response (wrong
 * count, bad index, wrong dimension). Does no pacing or retrying.
 */
export async function postEmbeddings(
  apiKey: string,
  texts: readonly string[],
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<PostResult> {
  const input = texts.map((t) => t.slice(0, MAX_TEXT_CHARS));
  const res = await fetchImpl(EMBED_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new MistralEmbedError(res.status, body, retryAfterMs(res.headers.get('retry-after'), now()));
  }
  const remainingRaw = res.headers.get('x-ratelimit-remaining-req-minute');
  const remaining = remainingRaw !== null && /^\d+$/.test(remainingRaw.trim()) ? Number(remainingRaw.trim()) : null;
  const data = (await res.json()) as { data?: { embedding?: number[]; index?: number }[] };
  const rows = data.data;
  if (!Array.isArray(rows) || rows.length !== input.length) {
    throw new Error(`Mistral returned ${Array.isArray(rows) ? rows.length : 0} embeddings for ${input.length} texts.`);
  }
  const out: number[][] = new Array(input.length);
  const seen = new Set<number>();
  rows.forEach((r, k) => {
    // `index` is the input's position in this request; fall back to array order when absent.
    const pos = Number.isInteger(r.index) ? (r.index as number) : k;
    if (pos < 0 || pos >= input.length || seen.has(pos)) throw new Error(`Mistral returned a bad index ${r.index}.`);
    seen.add(pos);
    if (!Array.isArray(r.embedding) || r.embedding.length !== EMBED_DIMS) {
      throw new Error(`Unexpected embedding dimension ${r.embedding?.length} (expected ${EMBED_DIMS}).`);
    }
    out[pos] = r.embedding;
  });
  return { vectors: out, remainingRequests: remaining };
}

/** A BatchEmbedder for one key: one request per call, no pacing (the sync engines pace and retry). */
export function createMistralEmbedder(apiKey: string, fetchImpl: typeof fetch = fetch): BatchEmbedder {
  return async (texts) => (await postEmbeddings(apiKey, texts, fetchImpl)).vectors;
}

export interface EmbedTextsOptions {
  apiKey?: string;
  requestsPerMinute?: number;
  maxRetries?: number;
  batchSize?: number;
  tokenCap?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function envInt(name: string): number | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/**
 * Embed every text, in order, inside one request handler (union upload, replace, approve). Batches,
 * paces requests under the per-minute limit, waits when the server says the minute is spent, and on
 * a 429 waits `Retry-After` (or backs off) and retries the SAME batch. Throws on any other error,
 * and EmbedRateLimitError after `maxRetries` consecutive 429s on one batch.
 */
export async function embedTexts(texts: readonly string[], opts: EmbedTextsOptions = {}): Promise<number[][]> {
  if (texts.length === 0) return [];
  const apiKey = opts.apiKey ?? readMistralKey();
  const rpm = opts.requestsPerMinute ?? envInt('MISTRAL_EMBED_REQUESTS_PER_MINUTE') ?? MISTRAL_EMBED_REQUESTS_PER_MINUTE;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const sleep = opts.sleep ?? realSleep;
  const now = opts.now ?? Date.now;
  const batches = planBatches(texts, opts.tokenCap ?? MAX_REQUEST_TOKENS, opts.batchSize ?? BATCH_MAX_TEXTS);
  const out: number[][] = new Array(texts.length);
  const sent: number[] = []; // request start times in the last minute, oldest first
  let blockedUntil = 0;

  for (let b = 0; b < batches.length; b++) {
    const idx = batches[b];
    for (let attempt = 1; ; attempt++) {
      for (;;) {
        const t = now();
        while (sent.length && t - sent[0] >= WINDOW_MS) sent.shift();
        let waitMs = 0;
        if (blockedUntil > t) waitMs = blockedUntil - t;
        else if (sent.length >= rpm) waitMs = sent[0] + WINDOW_MS - t;
        if (waitMs <= 0) break;
        await sleep(waitMs);
      }
      sent.push(now());
      try {
        const { vectors, remainingRequests } = await postEmbeddings(apiKey, idx.map((i) => texts[i]), opts.fetchImpl, now);
        if (remainingRequests === 0) blockedUntil = Math.max(blockedUntil, (sent[0] ?? now()) + WINDOW_MS);
        vectors.forEach((v, k) => { out[idx[k]] = v; });
        break;
      } catch (e) {
        if (e instanceof MistralEmbedError && e.isRateLimit) {
          if (attempt > maxRetries) {
            throw new EmbedRateLimitError(`Mistral kept answering 429 on batch ${b + 1}/${batches.length} after ${maxRetries} retries.`);
          }
          await sleep(e.retryAfterMs ?? backoffMs(attempt, opts.random));
          continue;
        }
        throw e;
      }
    }
  }
  return out;
}

/**
 * Embed ONE question for retrieval, with the same model as the index (a query embedded by another
 * model returns neighbors that mean nothing). Someone is waiting, so a 429 is retried at most twice.
 */
export async function embedQuery(text: string, opts: Omit<EmbedTextsOptions, 'maxRetries' | 'batchSize'> = {}): Promise<number[]> {
  const [v] = await embedTexts([text], { ...opts, maxRetries: 2 });
  return v;
}

/** pgvector takes a vector as a bracketed string, "[0.1,0.2,...]". */
export function toPgVector(v: readonly number[]): string {
  return `[${v.join(',')}]`;
}

// References (APA 7; all read 2026-11-04)
// Mistral AI. (n.d.-a). Embeddings [API reference]. https://docs.mistral.ai/api/endpoint/embeddings
// Mistral AI. (n.d.-b). Text embeddings. https://docs.mistral.ai/studio/knowledge-rag/embeddings/text_embeddings
// Mistral AI. (n.d.-c). Mistral Embed [Model card]. https://docs.mistral.ai/models/model-cards/mistral-embed-23-12
// Mistral AI. (n.d.-d). Usage limits [Workspaces]. https://docs.mistral.ai/admin/workspaces/usage-limits
