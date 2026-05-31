// lib/outbox-trigger.ts
// Fire-and-forget WitUS Outbox triggers from server actions / route handlers.
// Three layered gates: kill-switch env → BAM-only smoke gate → per-user opt-in (added post-smoke).

import { after } from 'next/server';
import { createHash } from 'node:crypto';
import { sendToOutbox, type OutboxPlatform } from './sender-outbox';

const OWNER_USER_ID = process.env.PRODUCT_OWNER_USER_ID;

export function fireOutboxDrafts(args: {
  triggerUserId: string;
  externalRefBase: string;
  caption: string;
  mediaUrls?: string[];
  platforms?: readonly OutboxPlatform[];
  scheduledAt?: Date;
  asDraft?: boolean;
}) {
  if (process.env.OUTBOX_TRIGGER_ENABLED !== 'true') return;
  if (args.triggerUserId !== OWNER_USER_ID) return;

  const platforms = args.platforms ?? (['twitter', 'bluesky', 'linkedin'] as const);
  const placeholderTime =
    args.scheduledAt ?? new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const asDraft = args.asDraft ?? true;

  after(async () => {
    for (const platform of platforms) {
      const result = await sendToOutbox({
        outboxUrl: process.env.OUTBOX_INGEST_URL!,
        sourceSlug: process.env.OUTBOX_SOURCE_SLUG!,
        hmacSecret: process.env.OUTBOX_INGEST_SECRET!,
        submission: {
          external_ref: `${args.externalRefBase}-${platform}`,
          platform,
          caption: args.caption,
          media_urls: args.mediaUrls ?? [],
          scheduled_at: placeholderTime.toISOString(),
          as_draft: asDraft,
        },
      });
      if (!result.ok) {
        console.error('[outbox-trigger] failed', {
          source: process.env.OUTBOX_SOURCE_SLUG,
          platform,
          external_ref_base: args.externalRefBase,
          http_status: result.status,
        });
      }
    }
  });
}

export function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 8);
}

export function anonymizedHandle(user: { handle?: string | null; email: string }): string {
  if (user.handle) return `@${user.handle}`;
  const local = user.email.split('@')[0] ?? 'user';
  const initials =
    local
      .split(/[._-]/)
      .map((s) => s.charAt(0).toUpperCase())
      .filter((c) => c.length > 0)
      .join('') || 'U';
  const hash = createHash('sha256').update(user.email).digest('hex').slice(0, 4);
  return `${initials}-${hash}`;
}
