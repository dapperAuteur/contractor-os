/**
 * Event taxonomy for Work.WitUS / CrewOps (this repo, app slug "work").
 *
 * The ecosystem shares ONE PostHog project, separated by the `app` property that
 * posthog-provider registers on load. Two rules keep that project readable, and both
 * are cheap now and expensive to retrofit once data has landed:
 *
 *   1. `snake_case`, object first, verb in past tense — `job_created`.
 *   2. NEVER put the app name in the event name. `work_signin_started` is wrong: it
 *      makes the same action from two apps look like two events and kills the
 *      cross-app comparison that sharing a project exists to enable. The `app`
 *      property already carries that.
 *
 * ONE VERCEL PROJECT, TWO HOSTS. This deployment serves both work.witus.online and
 * www.badcba.com, so every event here comes from one of two brands. Do not add a
 * `host` or `brand` property to work around that: posthog-js attaches `$host`,
 * `$current_url`, and `$pathname` to every capture automatically, so the two surfaces
 * are already separable by filter. A hand-rolled duplicate would only drift.
 *
 * Shared lifecycle events (the SHARED_EVENTS block) use identical names in every
 * ecosystem app, so "where do people fall out of sign-in" is answerable across all of
 * them at once. Do not rename these here without renaming them everywhere.
 *
 * See lib/analytics/INTEGRATE.md in the witus repo for the full contract.
 */

/**
 * This app's ecosystem slug. Every event carries it via register({ app }).
 *
 * "work", NOT "contractor-os". The analytics slug IS the identity slug from
 * lib/identity/clients.ts in the witus repo, where this app is registered as the OIDC
 * client `work` (Work.WitUS, https://work.witus.online). That is what lets a funnel
 * join PostHog events to the app that authenticated the user with no translation
 * table. The repo directory name is not the slug, and using it here would split one
 * app into two series in the shared project — which no back-fill merges cleanly.
 * Enforced by scripts/check-posthog-conformance.mjs in the witus repo.
 */
export const ANALYTICS_APP = "work";

/**
 * Events with identical names across every ecosystem app. Names are contractual —
 * copied verbatim, never edited in one repo. Wired in app/login/page.tsx.
 */
export const SHARED_EVENTS = {
  signinStarted: "signin_started",
  signinSucceeded: "signin_succeeded",
  signinFailed: "signin_failed",
} as const;

/**
 * Events specific to this app.
 *
 * Deliberately short. Only surfaces that are actually instrumented belong here: a name
 * declared before anything emits it looks like a dead funnel in the shared project,
 * which is worse than a missing one. Grow the list as each surface is wired, keeping
 * to the naming rules above.
 */
export const EVENTS = {
  /** An explicit route view. capture_pageview is off — Next's client router would
   *  fire it once and then lie — so route changes are reported deliberately. */
  routeViewed: "route_viewed",
  ...SHARED_EVENTS,
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
