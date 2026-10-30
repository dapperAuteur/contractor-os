// File: lib/db/schema/schema.ts
// Drizzle schema for Work.WitUS's own database (plan 18 Phase 2).
//
// HOW IT WAS MADE (2026-10-30): db/migrations 0000-0002 were generated from the live Supabase
// catalog (scripts/db/generate-baseline.mjs), applied to the Neon dev branch, checked column for
// column against Supabase (scripts/db/compare-schema.mjs), and this file was introspected from that
// branch with drizzle-kit pull. Hand fixes to the pull output, all for known drizzle-kit pull bugs:
//   - tsvector columns came out as unknown(): a customType below.
//   - empty-string defaults came out as .default('): .default('').
//   - text[] DEFAULT '{}' came out as .default([""]): sql`'{}'::text[]`.
//   - invite_token's encode(gen_random_bytes(32), 'hex') default: wrapped in sql``.
//   - push_subscriptions.p256dh lost its column name (it would have become "p256Dh").
//   - idx_item_prices_unique's COALESCE(... '00000000-...'::uuid) expression came out truncated.
//   - identity maxValue 9223372036854775807 is not exact as a JS number (it rounds past bigint);
//     removed, Postgres's bigint maximum is the default anyway.
//   - numeric columns use { mode: "number" }, so values come back as numbers, the way supabase-js
//     returned them; Drizzle's default would be strings.
//
// FROM NOW ON this file is the source of truth: change it, then `npm run db:generate` writes the next
// migration. Do not re-pull over it.
//
// PORTING NOTES (Phase 3):
//   - Timestamps use mode 'string' (as pulled). Postgres prints them as "2026-10-30 12:00:00+00",
//     while supabase-js returned "2026-10-30T12:00:00+00:00". new Date() reads both; code that
//     compares or slices the text does not.
//   - `users` exists only on Neon (Supabase keeps people in auth.users). Until the cutover, no
//     query may read `users`; emails still come from the Supabase admin API.
//   - Row-level security does not apply to this client on either database (it connects as the
//     table owner). Every query must filter by the session user's id itself.

import { pgTable, index, uuid, text, boolean, timestamp, bigint, check, unique, vector, foreignKey, integer, jsonb, numeric, date, uniqueIndex, char, primaryKey, pgView, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

/** Postgres full-text vector. Read-only here: both columns are GENERATED ALWAYS ... STORED. */
const tsvector = customType<{ data: string }>({
	dataType() {
		return "tsvector";
	},
});



export const marketingBanners = pgTable("marketing_banners", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	app: text().default('contractor').notNull(),
	title: text().notNull(),
	body: text().notNull(),
	ctaText: text("cta_text").default('Upgrade').notNull(),
	ctaUrl: text("cta_url").default('/pricing').notNull(),
	targetTiers: text("target_tiers").array().default(["free"]).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_marketing_banners_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_marketing_banners_app").using("btree", table.app.asc().nullsLast().op("text_ops")),
]);

export const ogImageRequests = pgTable("og_image_requests", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "og_image_requests_id_seq", startWith: 1, increment: 1, minValue: 1, cache: 1 }),
	profileUsername: text("profile_username").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	app: text(),
}, (table) => [
	index("idx_og_image_requests_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_og_image_requests_username").using("btree", table.profileUsername.asc().nullsLast().op("text_ops")),
	index("og_image_requests_app_idx").using("btree", table.app.asc().nullsLast().op("text_ops")),
]);

export const pageViews = pgTable("page_views", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	path: text().notNull(),
	referrer: text(),
	utmSource: text("utm_source"),
	utmMedium: text("utm_medium"),
	utmCampaign: text("utm_campaign"),
	userType: text("user_type").default('anonymous'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_page_views_created").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_page_views_path").using("btree", table.path.asc().nullsLast().op("text_ops")),
	index("idx_page_views_user_type").using("btree", table.userType.asc().nullsLast().op("text_ops")),
]);

export const platformSettings = pgTable("platform_settings", {
	key: text().primaryKey().notNull(),
	value: text(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const socialReferrals = pgTable("social_referrals", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "social_referrals_id_seq", startWith: 1, increment: 1, minValue: 1, cache: 1 }),
	source: text().notNull(),
	path: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	app: text(),
}, (table) => [
	index("idx_social_referrals_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_social_referrals_source").using("btree", table.source.asc().nullsLast().op("text_ops")),
	index("social_referrals_app_idx").using("btree", table.app.asc().nullsLast().op("text_ops")),
]);

export const coachingApplications = pgTable("coaching_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	role: text(),
	priorities: text().array().default(sql`'{}'::text[]`).notNull(),
	message: text(),
	status: text().default('new').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, () => [
	check("coaching_applications_status_check", sql`status = ANY (ARRAY['new'::text, 'reviewed'::text, 'contacted'::text, 'declined'::text])`),
]);

export const contentShares = pgTable("content_shares", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userAlias: text("user_alias").notNull(),
	contentType: text("content_type").notNull(),
	contentId: uuid("content_id").notNull(),
	platform: text(),
	sharedAt: timestamp("shared_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_content_shares_content").using("btree", table.contentType.asc().nullsLast().op("text_ops"), table.contentId.asc().nullsLast().op("text_ops")),
	check("content_shares_content_type_check", sql`content_type = ANY (ARRAY['exercise'::text, 'workout'::text])`),
]);

export const helpArticles = pgTable("help_articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	role: text().default('all').notNull(),
	embedding: vector({ dimensions: 768 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	app: text().default('centenarian').notNull(),
}, (table) => [
	index("idx_help_articles_app").using("btree", table.app.asc().nullsLast().op("text_ops")),
	unique("help_articles_title_app_key").on(table.app, table.title),
	check("help_articles_role_check", sql`role = ANY (ARRAY['student'::text, 'teacher'::text, 'admin'::text, 'contractor'::text, 'lister'::text, 'all'::text])`),
]);

export const adminChats = pgTable("admin_chats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	mode: text().default('general').notNull(),
	title: text().default('New Chat').notNull(),
	tags: text().array().default(sql`'{}'::text[]`).notNull(),
	notes: text().default('').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	chatSearchVector: tsvector("chat_search_vector").generatedAlwaysAs(sql`to_tsvector('english'::regconfig, ((title || ' '::text) || notes))`),
}, (table) => [
	index("idx_admin_chats_search").using("gin", table.chatSearchVector.asc().nullsLast().op("tsvector_ops")),
	index("idx_admin_chats_tags").using("gin", table.tags.asc().nullsLast().op("array_ops")),
	index("idx_admin_chats_updated").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_admin_chats_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "admin_chats_user_id_fkey"
		}).onDelete("cascade"),
]);

export const adminChatMessages = pgTable("admin_chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid("chat_id").notNull(),
	role: text().notNull(),
	text: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('english'::regconfig, text)`),
}, (table) => [
	index("idx_admin_chat_messages_chat").using("btree", table.chatId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_admin_chat_messages_search").using("gin", table.searchVector.asc().nullsLast().op("tsvector_ops")),
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [adminChats.id],
			name: "admin_chat_messages_chat_id_fkey"
		}).onDelete("cascade"),
	check("admin_chat_messages_role_check", sql`role = ANY (ARRAY['user'::text, 'model'::text])`),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	name: text().default('').notNull(),
	image: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("users_email_key").on(table.email),
]);

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	username: text().notNull(),
	displayName: text("display_name"),
	bio: text(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	subscriptionStatus: text("subscription_status").default('free').notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true, mode: 'string' }),
	shirtPromoCode: text("shirt_promo_code"),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	cancelAt: timestamp("cancel_at", { withTimezone: true, mode: 'string' }),
	cancellationFeedback: text("cancellation_feedback"),
	cancellationComment: text("cancellation_comment"),
	role: text().default('member').notNull(),
	dashboardHome: text("dashboard_home").default('/dashboard/blog'),
	scanAutoSaveImages: boolean("scan_auto_save_images").default(false),
	contractorRole: text("contractor_role").default('worker'),
	products: text().array().default(sql`'{}'::text[]`),
	listerCompanyName: text("lister_company_name"),
	listerUnionLocal: text("lister_union_local"),
	likesPublic: boolean("likes_public").default(false).notNull(),
	showDoneCounts: boolean("show_done_counts").default(false).notNull(),
	publicAlias: text("public_alias"),
	onboardingCompleted: boolean("onboarding_completed").default(false),
	firstModuleSlug: text("first_module_slug"),
	clockFormat: text("clock_format").default('12h').notNull(),
	inviteLimit: integer("invite_limit"),
	fiscalYearStartMonth: integer("fiscal_year_start_month").default(1),
	fiscalYearStartDay: integer("fiscal_year_start_day").default(1),
	theme: text().default('light').notNull(),
	dashboardHomeCentos: text("dashboard_home_centos").default('/dashboard/blog'),
	selectedModules: text("selected_modules").array(),
	leadSessionId: text("lead_session_id"),
	dashboardWidgets: jsonb("dashboard_widgets").default([]).notNull(),
	homeCurrency: text("home_currency"),
}, (table) => [
	index("idx_profiles_stripe_customer_id").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	index("idx_profiles_subscription_status").using("btree", table.subscriptionStatus.asc().nullsLast().op("text_ops")),
	index("idx_profiles_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "profiles_id_fkey"
		}).onDelete("cascade"),
	unique("profiles_public_alias_key").on(table.publicAlias),
	unique("profiles_username_key").on(table.username),
	check("profiles_bio_check", sql`char_length(bio) <= 300`),
	check("profiles_clock_format_check", sql`clock_format = ANY (ARRAY['12h'::text, '24h'::text])`),
	check("profiles_contractor_role_check", sql`contractor_role = ANY (ARRAY['worker'::text, 'lister'::text, 'union_leader'::text])`),
	check("profiles_display_name_check", sql`char_length(display_name) <= 60`),
	check("profiles_fiscal_year_start_day_check", sql`(fiscal_year_start_day >= 1) AND (fiscal_year_start_day <= 28)`),
	check("profiles_fiscal_year_start_month_check", sql`(fiscal_year_start_month >= 1) AND (fiscal_year_start_month <= 12)`),
	check("profiles_home_currency_format_check", sql`(home_currency IS NULL) OR (home_currency ~ '^[A-Z]{3}$'::text)`),
	check("profiles_role_check", sql`role = ANY (ARRAY['member'::text, 'teacher'::text, 'admin'::text])`),
	check("profiles_subscription_status_check", sql`subscription_status = ANY (ARRAY['free'::text, 'monthly'::text, 'annual'::text, 'lifetime'::text, 'starter'::text])`),
	check("profiles_theme_check", sql`theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])`),
	check("profiles_username_check", sql`username ~ '^[a-z0-9_-]{3,30}$'::text`),
]);

export const adminMessages = pgTable("admin_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	subject: text().notNull(),
	body: text().notNull(),
	recipientScope: text("recipient_scope").notNull(),
	recipientUserId: uuid("recipient_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_admin_messages_recipient_user").using("btree", table.recipientUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_admin_messages_scope").using("btree", table.recipientScope.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.recipientUserId],
			foreignColumns: [profiles.id],
			name: "admin_messages_recipient_user_id_fkey"
		}).onDelete("set null"),
	check("admin_messages_recipient_scope_check", sql`recipient_scope = ANY (ARRAY['all'::text, 'free'::text, 'monthly'::text, 'lifetime'::text, 'user'::text])`),
]);

export const adminNotifications = pgTable("admin_notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text().notNull(),
	userId: uuid("user_id"),
	userEmail: text("user_email"),
	entityName: text("entity_name").notNull(),
	entityId: uuid("entity_id").notNull(),
	entityMeta: jsonb("entity_meta").default({}).notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	promoted: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("admin_notifications_created_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("admin_notifications_is_read_idx").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
	index("admin_notifications_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "admin_notifications_user_id_fkey"
		}).onDelete("set null"),
	check("admin_notifications_type_check", sql`type = ANY (ARRAY['new_exercise'::text, 'new_equipment'::text, 'workout_suggestion'::text])`),
]);

export const appLogs = pgTable("app_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	level: text().default('info').notNull(),
	source: text().notNull(),
	module: text(),
	message: text().notNull(),
	metadata: jsonb().default({}).notNull(),
	userId: uuid("user_id"),
	isReviewed: boolean("is_reviewed").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("app_logs_created_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("app_logs_level_idx").using("btree", table.level.asc().nullsLast().op("text_ops")),
	index("app_logs_module_idx").using("btree", table.module.asc().nullsLast().op("text_ops")),
	index("app_logs_source_idx").using("btree", table.source.asc().nullsLast().op("text_ops")),
	index("app_logs_unreviewed_idx").using("btree", table.isReviewed.asc().nullsLast().op("bool_ops")).where(sql`((is_reviewed = false) AND (level = ANY (ARRAY['warn'::text, 'error'::text])))`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "app_logs_user_id_fkey"
		}).onDelete("set null"),
	check("app_logs_level_check", sql`level = ANY (ARRAY['info'::text, 'warn'::text, 'error'::text])`),
]);

export const blogPosts = pgTable("blog_posts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: text().notNull(),
	slug: text().notNull(),
	excerpt: text(),
	content: jsonb().default({}).notNull(),
	coverImageUrl: text("cover_image_url"),
	coverImagePublicId: text("cover_image_public_id"),
	visibility: text().default('draft').notNull(),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	tags: text().array().default(sql`'{}'::text[]`).notNull(),
	readingTimeMinutes: integer("reading_time_minutes"),
	viewCount: integer("view_count").default(0).notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	likeCount: integer("like_count").default(0).notNull(),
	saveCount: integer("save_count").default(0).notNull(),
	shortLinkId: text("short_link_id"),
	shortLinkUrl: text("short_link_url"),
}, (table) => [
	index("idx_blog_posts_public").using("btree", table.visibility.asc().nullsLast().op("text_ops"), table.publishedAt.desc().nullsLast().op("text_ops")).where(sql`(visibility = ANY (ARRAY['public'::text, 'scheduled'::text]))`),
	index("idx_blog_posts_slug").using("btree", table.slug.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("idx_blog_posts_tags").using("gin", table.tags.asc().nullsLast().op("array_ops")),
	index("idx_blog_posts_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "blog_posts_user_id_fkey"
		}).onDelete("cascade"),
	unique("blog_posts_slug_user_unique").on(table.slug, table.userId),
	check("blog_posts_excerpt_check", sql`char_length(excerpt) <= 500`),
	check("blog_posts_slug_check", sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text`),
	check("blog_posts_title_check", sql`(char_length(title) >= 1) AND (char_length(title) <= 300)`),
	check("blog_posts_visibility_check", sql`visibility = ANY (ARRAY['draft'::text, 'private'::text, 'public'::text, 'authenticated_only'::text, 'scheduled'::text])`),
	check("scheduled_requires_date", sql`(visibility <> 'scheduled'::text) OR (scheduled_at IS NOT NULL)`),
]);

export const blogEvents = pgTable("blog_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	postId: uuid("post_id").notNull(),
	eventType: text("event_type").notNull(),
	sessionId: text("session_id"),
	referrer: text(),
	country: text(),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_blog_events_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_blog_events_post_time").using("btree", table.postId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_blog_events_post_type").using("btree", table.postId.asc().nullsLast().op("text_ops"), table.eventType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [blogPosts.id],
			name: "blog_events_post_id_fkey"
		}).onDelete("cascade"),
	check("blog_events_event_type_check", sql`event_type = ANY (ARRAY['view'::text, 'read_25'::text, 'read_50'::text, 'read_75'::text, 'read_100'::text, 'share_copy'::text, 'share_email'::text, 'share_linkedin'::text, 'share_facebook'::text, 'blocked_visit'::text])`),
]);

export const lifeCategories = pgTable("life_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	icon: text().default('tag').notNull(),
	color: text().default('#6b7280').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_life_categories_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "life_categories_user_id_fkey"
		}).onDelete("cascade"),
	unique("life_categories_user_id_name_key").on(table.name, table.userId),
]);

export const budgetCategories = pgTable("budget_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	monthlyBudget: numeric("monthly_budget", { precision: 10, scale: 2, mode: "number" }),
	color: text().default('#6366f1'),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lifeCategoryId: uuid("life_category_id"),
}, (table) => [
	index("idx_budget_categories_life_category").using("btree", table.lifeCategoryId.asc().nullsLast().op("uuid_ops")).where(sql`(life_category_id IS NOT NULL)`),
	index("idx_budget_categories_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.lifeCategoryId],
			foreignColumns: [lifeCategories.id],
			name: "budget_categories_life_category_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "budget_categories_user_id_fkey"
		}).onDelete("cascade"),
]);

export const adminPromoCampaigns = pgTable("admin_promo_campaigns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	discountType: text("discount_type").notNull(),
	discountValue: numeric("discount_value", { precision: 10, scale: 2, mode: "number" }).notNull(),
	stripeCouponId: text("stripe_coupon_id"),
	planTypes: jsonb("plan_types").default(["lifetime"]).notNull(),
	promoCode: text("promo_code"),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	maxUses: integer("max_uses"),
	currentUses: integer("current_uses").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	app: text().default('contractor').notNull(),
}, (table) => [
	index("idx_admin_promo_campaigns_app_active").using("btree", table.app.asc().nullsLast().op("text_ops"), table.isActive.asc().nullsLast().op("text_ops")),
	check("admin_promo_campaigns_discount_type_check", sql`discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'free_months'::text])`),
]);

export const cashappPayments = pgTable("cashapp_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
	cashappName: text("cashapp_name"),
	screenshotUrl: text("screenshot_url"),
	status: text().default('pending').notNull(),
	adminNotes: text("admin_notes"),
	verifiedBy: uuid("verified_by"),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	promoCampaignId: uuid("promo_campaign_id"),
}, (table) => [
	index("idx_cashapp_payments_promo_campaign").using("btree", table.promoCampaignId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.promoCampaignId],
			foreignColumns: [adminPromoCampaigns.id],
			name: "cashapp_payments_promo_campaign_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "cashapp_payments_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "cashapp_payments_verified_by_fkey"
		}),
	check("cashapp_payments_status_check", sql`status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])`),
]);

export const userContacts = pgTable("user_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	contactType: text("contact_type").notNull(),
	defaultCategoryId: uuid("default_category_id"),
	notes: text(),
	useCount: integer("use_count").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	email: text(),
	phone: text(),
	isContractor: boolean("is_contractor").default(false),
	linkedUserId: uuid("linked_user_id"),
	skills: text().array(),
	availabilityNotes: text("availability_notes"),
	contactSubtype: text("contact_subtype"),
	jobTitle: text("job_title"),
	companyName: text("company_name"),
	homeCity: text("home_city"),
	homeState: text("home_state"),
	homeCountry: text("home_country"),
	lastWorkedWith: date("last_worked_with"),
	totalJobsTogether: integer("total_jobs_together").default(0).notNull(),
	website: text(),
	paycheckPortalUrl: text("paycheck_portal_url"),
	paycheckPortalCompanyId: text("paycheck_portal_company_id"),
}, (table) => [
	index("idx_contacts_contractor").using("btree", table.isContractor.asc().nullsLast().op("bool_ops")).where(sql`(is_contractor = true)`),
	index("user_contacts_user_id_contact_type_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.contactType.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.defaultCategoryId],
			foreignColumns: [budgetCategories.id],
			name: "user_contacts_default_category_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.linkedUserId],
			foreignColumns: [users.id],
			name: "user_contacts_linked_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_contacts_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_contacts_user_id_name_contact_type_key").on(table.contactType, table.name, table.userId),
	check("user_contacts_contact_type_check", sql`contact_type = ANY (ARRAY['vendor'::text, 'customer'::text, 'location'::text])`),
]);

export const contactAddresses = pgTable("contact_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactId: uuid("contact_id").notNull(),
	label: text().default('home').notNull(),
	street: text(),
	city: text(),
	state: text(),
	postalCode: text("postal_code"),
	country: text(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_contact_addresses_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "contact_addresses_contact_id_fkey"
		}).onDelete("cascade"),
]);

export const contactEmails = pgTable("contact_emails", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactId: uuid("contact_id").notNull(),
	email: text().notNull(),
	label: text().default('work'),
	isPrimary: boolean("is_primary").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_contact_emails_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "contact_emails_contact_id_fkey"
		}).onDelete("cascade"),
]);

export const contactJobRoles = pgTable("contact_job_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactId: uuid("contact_id").notNull(),
	jobId: uuid("job_id").notNull(),
	eventId: uuid("event_id"),
	role: text().notNull(),
	roleLabel: text("role_label"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_contact_job_roles_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	index("idx_contact_job_roles_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "contact_job_roles_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [contractorEvents.id],
			name: "contact_job_roles_event_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "contact_job_roles_job_id_fkey"
		}).onDelete("cascade"),
	unique("contact_job_roles_contact_id_job_id_role_key").on(table.contactId, table.jobId, table.role),
	check("contact_job_roles_role_check", sql`role = ANY (ARRAY['poc'::text, 'crew_coordinator'::text, 'tech_lead'::text, 'producer'::text, 'eic'::text, 'a1'::text, 'a2'::text, 'v1'::text, 'v2'::text, 'graphics'::text, 'replay'::text, 'utility'::text, 'other'::text])`),
]);

export const contractorEvents = pgTable("contractor_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	clientId: uuid("client_id"),
	clientName: text("client_name"),
	locationId: uuid("location_id"),
	locationName: text("location_name"),
	pocContactId: uuid("poc_contact_id"),
	pocName: text("poc_name"),
	pocPhone: text("poc_phone"),
	crewCoordinatorId: uuid("crew_coordinator_id"),
	crewCoordinatorName: text("crew_coordinator_name"),
	crewCoordinatorPhone: text("crew_coordinator_phone"),
	startDate: date("start_date"),
	endDate: date("end_date"),
	unionLocal: text("union_local"),
	department: text(),
	brandId: uuid("brand_id"),
	payRate: numeric("pay_rate", { precision: 10, scale: 2, mode: "number" }),
	otRate: numeric("ot_rate", { precision: 10, scale: 2, mode: "number" }),
	dtRate: numeric("dt_rate", { precision: 10, scale: 2, mode: "number" }),
	rateType: text("rate_type").default('hourly'),
	benefitsEligible: boolean("benefits_eligible").default(false).notNull(),
	travelBenefits: jsonb("travel_benefits").default({}).notNull(),
	notes: text(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_contractor_events_user").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.startDate.desc().nullsFirst().op("date_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [userContacts.id],
			name: "contractor_events_client_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.crewCoordinatorId],
			foreignColumns: [userContacts.id],
			name: "contractor_events_crew_coordinator_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [contactLocations.id],
			name: "contractor_events_location_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.pocContactId],
			foreignColumns: [userContacts.id],
			name: "contractor_events_poc_contact_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contractor_events_user_id_fkey"
		}).onDelete("cascade"),
	check("contractor_events_rate_type_check", sql`rate_type = ANY (ARRAY['hourly'::text, 'daily'::text, 'flat'::text])`),
]);

export const contractorJobs = pgTable("contractor_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	jobNumber: text("job_number").notNull(),
	clientId: uuid("client_id"),
	clientName: text("client_name").notNull(),
	eventName: text("event_name"),
	locationId: uuid("location_id"),
	locationName: text("location_name"),
	pocContactId: uuid("poc_contact_id"),
	pocName: text("poc_name"),
	pocPhone: text("poc_phone"),
	crewCoordinatorId: uuid("crew_coordinator_id"),
	crewCoordinatorName: text("crew_coordinator_name"),
	crewCoordinatorPhone: text("crew_coordinator_phone"),
	status: text().default('assigned').notNull(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	isMultiDay: boolean("is_multi_day").default(false).notNull(),
	scheduledDates: jsonb("scheduled_dates").default([]).notNull(),
	payRate: numeric("pay_rate", { precision: 10, scale: 2, mode: "number" }),
	otRate: numeric("ot_rate", { precision: 10, scale: 2, mode: "number" }),
	dtRate: numeric("dt_rate", { precision: 10, scale: 2, mode: "number" }),
	rateType: text("rate_type").default('hourly').notNull(),
	distanceFromHomeMiles: numeric("distance_from_home_miles", { precision: 8, scale: 2, mode: "number" }),
	benefitsEligible: boolean("benefits_eligible").default(false).notNull(),
	travelBenefits: jsonb("travel_benefits").default({}).notNull(),
	unionLocal: text("union_local"),
	department: text(),
	brandId: uuid("brand_id"),
	estPayDate: date("est_pay_date"),
	isPublic: boolean("is_public").default(false).notNull(),
	notes: text(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	rateCardId: uuid("rate_card_id"),
	shareContacts: boolean("share_contacts").default(false).notNull(),
	distanceFromHomeKm: numeric("distance_from_home_km", { precision: 8, scale: 2, mode: "number" }),
	benefitDeductions: jsonb("benefit_deductions").default([]).notNull(),
	listerId: uuid("lister_id"),
	isListerJob: boolean("is_lister_job").default(false),
	eventId: uuid("event_id"),
}, (table) => [
	index("idx_contractor_jobs_client").using("btree", table.clientId.asc().nullsLast().op("uuid_ops")),
	index("idx_contractor_jobs_dates").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.startDate.desc().nullsFirst().op("date_ops")),
	index("idx_contractor_jobs_event").using("btree", table.eventId.asc().nullsLast().op("uuid_ops")).where(sql`(event_id IS NOT NULL)`),
	uniqueIndex("idx_contractor_jobs_number").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.jobNumber.asc().nullsLast().op("text_ops")),
	index("idx_contractor_jobs_status").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_contractor_jobs_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [userBrands.id],
			name: "contractor_jobs_brand_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [userContacts.id],
			name: "contractor_jobs_client_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.crewCoordinatorId],
			foreignColumns: [userContacts.id],
			name: "contractor_jobs_crew_coordinator_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [contractorEvents.id],
			name: "contractor_jobs_event_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.listerId],
			foreignColumns: [users.id],
			name: "contractor_jobs_lister_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [contactLocations.id],
			name: "contractor_jobs_location_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.pocContactId],
			foreignColumns: [userContacts.id],
			name: "contractor_jobs_poc_contact_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.rateCardId],
			foreignColumns: [contractorRateCards.id],
			name: "contractor_jobs_rate_card_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contractor_jobs_user_id_fkey"
		}).onDelete("cascade"),
	check("contractor_jobs_rate_type_check", sql`rate_type = ANY (ARRAY['hourly'::text, 'daily'::text, 'flat'::text])`),
	check("contractor_jobs_status_check", sql`status = ANY (ARRAY['assigned'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'invoiced'::text, 'paid'::text, 'cancelled'::text])`),
]);

export const contactLocations = pgTable("contact_locations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactId: uuid("contact_id").notNull(),
	label: text().notNull(),
	address: text(),
	lat: numeric({ precision: 10, scale: 7, mode: "number" }),
	lng: numeric({ precision: 10, scale: 7, mode: "number" }),
	isDefault: boolean("is_default").default(false).notNull(),
	notes: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	schematicsUrl: text("schematics_url"),
	knowledgeBase: jsonb("knowledge_base").default({}),
}, (table) => [
	index("idx_contact_locations_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "contact_locations_contact_id_fkey"
		}).onDelete("cascade"),
]);

export const contactPhones = pgTable("contact_phones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactId: uuid("contact_id").notNull(),
	phone: text().notNull(),
	label: text().default('mobile'),
	isPrimary: boolean("is_primary").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_contact_phones_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "contact_phones_contact_id_fkey"
		}).onDelete("cascade"),
]);

export const contactShares = pgTable("contact_shares", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactId: uuid("contact_id").notNull(),
	sharedBy: uuid("shared_by").notNull(),
	sharedWith: uuid("shared_with").notNull(),
	message: text(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	visibleFields: jsonb("visible_fields").default(["name","company_name","job_title","email","phone","notes","addresses","tags","website","paycheck_portal"]).notNull(),
}, (table) => [
	index("idx_contact_shares_shared_by").using("btree", table.sharedBy.asc().nullsLast().op("uuid_ops")),
	index("idx_contact_shares_shared_with").using("btree", table.sharedWith.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "contact_shares_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sharedBy],
			foreignColumns: [users.id],
			name: "contact_shares_shared_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sharedWith],
			foreignColumns: [users.id],
			name: "contact_shares_shared_with_fkey"
		}).onDelete("cascade"),
	unique("contact_shares_contact_id_shared_with_key").on(table.contactId, table.sharedWith),
	check("contact_shares_status_check", sql`status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])`),
]);

export const contactTags = pgTable("contact_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactId: uuid("contact_id").notNull(),
	tagType: text("tag_type").notNull(),
	value: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_contact_tags_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	index("idx_contact_tags_type_value").using("btree", table.tagType.asc().nullsLast().op("text_ops"), table.value.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "contact_tags_contact_id_fkey"
		}).onDelete("cascade"),
	unique("contact_tags_contact_id_tag_type_value_key").on(table.contactId, table.tagType, table.value),
	check("contact_tags_tag_type_check", sql`tag_type = ANY (ARRAY['company'::text, 'role'::text, 'skill'::text, 'group'::text, 'custom'::text])`),
]);

export const contractorJobAssignments = pgTable("contractor_job_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: uuid("job_id").notNull(),
	assignedBy: uuid("assigned_by").notNull(),
	assignedTo: uuid("assigned_to").notNull(),
	status: text().default('offered').notNull(),
	message: text(),
	responseNote: text("response_note"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	respondedAt: timestamp("responded_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_assignments_assigned_by").using("btree", table.assignedBy.asc().nullsLast().op("uuid_ops")),
	index("idx_assignments_assigned_to").using("btree", table.assignedTo.asc().nullsLast().op("uuid_ops")),
	index("idx_assignments_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "contractor_job_assignments_assigned_by_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "contractor_job_assignments_assigned_to_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "contractor_job_assignments_job_id_fkey"
		}).onDelete("cascade"),
	unique("contractor_job_assignments_job_id_assigned_to_key").on(table.assignedTo, table.jobId),
	check("contractor_job_assignments_status_check", sql`status = ANY (ARRAY['offered'::text, 'accepted'::text, 'declined'::text, 'removed'::text])`),
]);

export const userBrands = pgTable("user_brands", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	dbaName: text("dba_name"),
	ein: text(),
	address: text(),
	website: text(),
	color: text().default('#6366f1').notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_brands_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_brands_user_id_fkey"
		}).onDelete("cascade"),
]);

export const contractorRateCards = pgTable("contractor_rate_cards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	unionLocal: text("union_local"),
	department: text(),
	rateType: text("rate_type").default('hourly').notNull(),
	stRate: numeric("st_rate", { precision: 10, scale: 2, mode: "number" }),
	otRate: numeric("ot_rate", { precision: 10, scale: 2, mode: "number" }),
	dtRate: numeric("dt_rate", { precision: 10, scale: 2, mode: "number" }),
	benefits: jsonb().default([]).notNull(),
	travelBenefits: jsonb("travel_benefits").default({}).notNull(),
	notes: text(),
	useCount: integer("use_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_rate_cards_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contractor_rate_cards_user_id_fkey"
		}).onDelete("cascade"),
	check("contractor_rate_cards_rate_type_check", sql`rate_type = ANY (ARRAY['hourly'::text, 'daily'::text, 'flat'::text])`),
]);

export const emailCampaigns = pgTable("email_campaigns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	app: text().default('contractor').notNull(),
	title: text().notNull(),
	subject: text().notNull(),
	bodyHtml: text("body_html").default('').notNull(),
	templateKey: text("template_key"),
	audienceFilter: jsonb("audience_filter").default({}).notNull(),
	status: text().default('draft').notNull(),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	sentCount: integer("sent_count").default(0).notNull(),
	openCount: integer("open_count").default(0).notNull(),
	clickCount: integer("click_count").default(0).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_email_campaigns_app").using("btree", table.app.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "email_campaigns_created_by_fkey"
		}).onDelete("set null"),
	check("email_campaigns_status_check", sql`status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text, 'failed'::text])`),
]);

export const emailSends = pgTable("email_sends", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	campaignId: uuid("campaign_id").notNull(),
	userId: uuid("user_id"),
	email: text().notNull(),
	status: text().default('pending').notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	openedAt: timestamp("opened_at", { withTimezone: true, mode: 'string' }),
	clickedAt: timestamp("clicked_at", { withTimezone: true, mode: 'string' }),
	errorMessage: text("error_message"),
}, (table) => [
	index("idx_email_sends_campaign").using("btree", table.campaignId.asc().nullsLast().op("uuid_ops")),
	index("idx_email_sends_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [emailCampaigns.id],
			name: "email_sends_campaign_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "email_sends_user_id_fkey"
		}).onDelete("set null"),
	check("email_sends_status_check", sql`status = ANY (ARRAY['pending'::text, 'sent'::text, 'opened'::text, 'clicked'::text, 'bounced'::text, 'failed'::text])`),
]);

export const entityLifeCategories = pgTable("entity_life_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	lifeCategoryId: uuid("life_category_id").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: uuid("entity_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	autoSource: text("auto_source"),
}, (table) => [
	index("idx_elc_category").using("btree", table.lifeCategoryId.asc().nullsLast().op("uuid_ops")),
	index("idx_elc_entity").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.lifeCategoryId],
			foreignColumns: [lifeCategories.id],
			name: "entity_life_categories_life_category_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "entity_life_categories_user_id_fkey"
		}).onDelete("cascade"),
	unique("entity_life_categories_user_id_life_category_id_entity_type_key").on(table.entityId, table.entityType, table.lifeCategoryId, table.userId),
	check("entity_life_categories_auto_source_check", sql`(auto_source IS NULL) OR (auto_source = 'budget_category'::text)`),
	check("entity_life_categories_entity_type_check", sql`entity_type = ANY (ARRAY['task'::text, 'trip'::text, 'route'::text, 'transaction'::text, 'recipe'::text, 'fuel_log'::text, 'maintenance'::text, 'invoice'::text, 'workout'::text, 'equipment'::text, 'focus_session'::text, 'exercise'::text, 'daily_log'::text, 'job'::text, 'media_item'::text, 'podcast_episode'::text, 'blog_post'::text, 'schedule'::text])`),
]);

export const equipmentCatalog = pgTable("equipment_catalog", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	brand: text(),
	model: text(),
	category: text(),
	description: text(),
	imageUrl: text("image_url"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_equipment_catalog_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_equipment_catalog_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
]);

export const equipment = pgTable("equipment", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	categoryId: uuid("category_id"),
	brand: text(),
	model: text(),
	serialNumber: text("serial_number"),
	purchaseDate: date("purchase_date"),
	purchasePrice: numeric("purchase_price", { precision: 10, scale: 2, mode: "number" }),
	currentValue: numeric("current_value", { precision: 10, scale: 2, mode: "number" }),
	warrantyExpires: date("warranty_expires"),
	condition: text(),
	imageUrl: text("image_url"),
	imagePublicId: text("image_public_id"),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	transactionId: uuid("transaction_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	catalogId: uuid("catalog_id"),
	ownershipType: text("ownership_type").default('own').notNull(),
	visibility: text().default('private').notNull(),
	likeCount: integer("like_count").default(0).notNull(),
	shareCount: integer("share_count").default(0).notNull(),
}, (table) => [
	index("idx_equipment_catalog_id").using("btree", table.catalogId.asc().nullsLast().op("uuid_ops")),
	index("idx_equipment_ownership_type").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.ownershipType.asc().nullsLast().op("text_ops")),
	index("idx_equipment_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_equipment_user_active").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_equipment_user_category").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("idx_equipment_visibility").using("btree", table.visibility.asc().nullsLast().op("text_ops")).where(sql`(visibility = 'public'::text)`),
	foreignKey({
			columns: [table.catalogId],
			foreignColumns: [equipmentCatalog.id],
			name: "equipment_catalog_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [equipmentCategories.id],
			name: "equipment_category_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [financialTransactions.id],
			name: "equipment_transaction_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "equipment_user_id_fkey"
		}).onDelete("cascade"),
	check("equipment_condition_check", sql`condition = ANY (ARRAY['new'::text, 'excellent'::text, 'good'::text, 'fair'::text, 'poor'::text])`),
	check("equipment_ownership_type_check", sql`ownership_type = ANY (ARRAY['own'::text, 'access'::text])`),
	check("equipment_visibility_check", sql`visibility = ANY (ARRAY['private'::text, 'public'::text])`),
]);

export const equipmentCategories = pgTable("equipment_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	icon: text(),
	color: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_equipment_categories_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "equipment_categories_user_id_fkey"
		}).onDelete("cascade"),
	unique("equipment_categories_user_id_name_key").on(table.name, table.userId),
]);

export const financialTransactions = pgTable("financial_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	categoryId: uuid("category_id"),
	amount: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
	type: text().default('expense').notNull(),
	description: text(),
	vendor: text(),
	transactionDate: date("transaction_date").notNull(),
	source: text().default('manual'),
	tags: text().array(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	accountId: uuid("account_id"),
	sourceModule: text("source_module"),
	sourceModuleId: uuid("source_module_id"),
	brandId: uuid("brand_id"),
	tellerTransactionId: text("teller_transaction_id"),
	disputeStatus: text("dispute_status"),
	disputeDate: date("dispute_date"),
	disputeNotes: text("dispute_notes"),
	returnDeadline: date("return_deadline"),
	returnPolicyDays: integer("return_policy_days"),
	returnStatus: text("return_status"),
	jobId: uuid("job_id"),
	transferGroupId: uuid("transfer_group_id"),
	importBatchId: uuid("import_batch_id"),
	externalId: text("external_id"),
	transferKind: text("transfer_kind"),
	currency: text(),
	fxRate: numeric("fx_rate", { precision: 18, scale: 8, mode: "number" }),
	amountHome: numeric("amount_home", { precision: 12, scale: 2, mode: "number" }),
	clearedAt: timestamp("cleared_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("financial_transactions_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("financial_transactions_brand_id_idx").using("btree", table.brandId.asc().nullsLast().op("uuid_ops")),
	index("financial_transactions_source_module_source_module_id_idx").using("btree", table.sourceModule.asc().nullsLast().op("text_ops"), table.sourceModuleId.asc().nullsLast().op("text_ops")),
	index("idx_financial_transactions_category").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("idx_financial_transactions_date").using("btree", table.transactionDate.asc().nullsLast().op("date_ops")),
	index("idx_financial_transactions_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("idx_financial_transactions_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_ft_account_external_id").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.accountId.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")).where(sql`((external_id IS NOT NULL) AND (account_id IS NOT NULL))`),
	index("idx_ft_import_batch").using("btree", table.importBatchId.asc().nullsLast().op("uuid_ops")).where(sql`(import_batch_id IS NOT NULL)`),
	index("idx_ft_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_ft_teller_txn").using("btree", table.tellerTransactionId.asc().nullsLast().op("text_ops")).where(sql`(teller_transaction_id IS NOT NULL)`),
	index("idx_ft_transfer_group").using("btree", table.transferGroupId.asc().nullsLast().op("uuid_ops")).where(sql`(transfer_group_id IS NOT NULL)`),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [financialAccounts.id],
			name: "financial_transactions_account_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [userBrands.id],
			name: "financial_transactions_brand_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [budgetCategories.id],
			name: "financial_transactions_category_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "financial_transactions_job_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "financial_transactions_user_id_fkey"
		}).onDelete("cascade"),
	check("financial_transactions_fx_rate_positive_check", sql`(fx_rate IS NULL) OR (fx_rate > (0)::numeric)`),
	check("financial_transactions_currency_format_check", sql`(currency IS NULL) OR (currency ~ '^[A-Z]{3}$'::text)`),
	check("financial_transactions_dispute_status_check", sql`(dispute_status IS NULL) OR (dispute_status = ANY (ARRAY['flagged'::text, 'submitted'::text, 'resolved'::text, 'denied'::text]))`),
	check("financial_transactions_return_status_check", sql`(return_status IS NULL) OR (return_status = ANY (ARRAY['eligible'::text, 'expired'::text, 'returned'::text]))`),
	check("financial_transactions_source_check", sql`source = ANY (ARRAY['manual'::text, 'csv_import'::text, 'stripe'::text, 'fuel_log'::text, 'vehicle_maintenance'::text, 'trip'::text, 'transfer'::text, 'interest'::text, 'recurring'::text, 'scan'::text, 'bank_sync'::text, 'job'::text, 'schedule'::text])`),
	check("financial_transactions_source_module_check", sql`(source_module IS NULL) OR (source_module = ANY (ARRAY['fuel_log'::text, 'vehicle_maintenance'::text, 'trip'::text, 'scan'::text, 'job'::text, 'schedule'::text]))`),
	check("financial_transactions_transfer_kind_check", sql`(transfer_kind IS NULL) OR (transfer_kind = ANY (ARRAY['transfer'::text, 'card_payment'::text, 'loan_payment'::text]))`),
	check("financial_transactions_type_check", sql`type = ANY (ARRAY['expense'::text, 'income'::text])`),
]);

export const equipmentMedia = pgTable("equipment_media", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	equipmentId: uuid("equipment_id").notNull(),
	userId: uuid("user_id").notNull(),
	url: text().notNull(),
	publicId: text("public_id"),
	mediaType: text("media_type").notNull(),
	title: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_equipment_media_equipment").using("btree", table.equipmentId.asc().nullsLast().op("uuid_ops")),
	index("idx_equipment_media_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.equipmentId],
			foreignColumns: [equipment.id],
			name: "equipment_media_equipment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "equipment_media_user_id_fkey"
		}).onDelete("cascade"),
	check("equipment_media_media_type_check", sql`media_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text])`),
]);

export const equipmentValuations = pgTable("equipment_valuations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	equipmentId: uuid("equipment_id").notNull(),
	userId: uuid("user_id").notNull(),
	valuedAt: date("valued_at").notNull(),
	value: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
	source: text().default('manual'),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_equipment_valuations_equip").using("btree", table.equipmentId.asc().nullsLast().op("uuid_ops")),
	index("idx_equipment_valuations_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.equipmentId],
			foreignColumns: [equipment.id],
			name: "equipment_valuations_equipment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "equipment_valuations_user_id_fkey"
		}).onDelete("cascade"),
	check("equipment_valuations_source_check", sql`source = ANY (ARRAY['manual'::text, 'ebay'::text, 'other'::text])`),
]);

export const userFeedback = pgTable("user_feedback", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	category: text().notNull(),
	message: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	mediaUrl: text("media_url"),
	isReadByAdmin: boolean("is_read_by_admin").default(false),
	app: text().default('centenarian').notNull(),
	resolutionStatus: text("resolution_status").default('open').notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	resolvedBy: uuid("resolved_by"),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_user_feedback_app").using("btree", table.app.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_feedback_user_id_fkey"
		}).onDelete("cascade"),
	check("user_feedback_category_check", sql`category = ANY (ARRAY['bug'::text, 'feature'::text, 'general'::text])`),
	check("user_feedback_resolution_status_check", sql`resolution_status = ANY (ARRAY['open'::text, 'resolved'::text, 'confirmed'::text, 'reopened'::text])`),
]);

export const feedbackReplies = pgTable("feedback_replies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	feedbackId: uuid("feedback_id").notNull(),
	senderId: uuid("sender_id"),
	isAdmin: boolean("is_admin").default(false).notNull(),
	body: text().notNull(),
	mediaUrl: text("media_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	kind: text().default('message').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.feedbackId],
			foreignColumns: [userFeedback.id],
			name: "feedback_replies_feedback_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "feedback_replies_sender_id_fkey"
		}).onDelete("set null"),
	check("feedback_replies_kind_check", sql`kind = ANY (ARRAY['message'::text, 'resolved'::text, 'confirmed'::text, 'reopened'::text])`),
]);

export const financialAccounts = pgTable("financial_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	accountType: text("account_type").notNull(),
	institutionName: text("institution_name"),
	lastFour: char("last_four", { length: 4 }),
	interestRate: numeric("interest_rate", { precision: 5, scale: 2, mode: "number" }),
	creditLimit: numeric("credit_limit", { precision: 10, scale: 2, mode: "number" }),
	openingBalance: numeric("opening_balance", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	monthlyFee: numeric("monthly_fee", { precision: 10, scale: 2, mode: "number" }),
	dueDate: integer("due_date"),
	statementDate: integer("statement_date"),
	isActive: boolean("is_active").default(true).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	tellerEnrollmentId: uuid("teller_enrollment_id"),
	tellerAccountId: text("teller_account_id"),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: 'string' }),
	oldestTransactionDate: date("oldest_transaction_date"),
	disputeWindowDays: integer("dispute_window_days"),
	defaultReturnDays: integer("default_return_days"),
	promoApr: numeric("promo_apr", { precision: 5, scale: 2, mode: "number" }),
	promoAprExpires: date("promo_apr_expires"),
	promoDescription: text("promo_description"),
	btApr: numeric("bt_apr", { precision: 5, scale: 2, mode: "number" }),
	btFeePercent: numeric("bt_fee_percent", { precision: 5, scale: 2, mode: "number" }),
	btExpires: date("bt_expires"),
	btDescription: text("bt_description"),
	rewardsType: text("rewards_type"),
	rewardsRate: text("rewards_rate"),
	annualFee: numeric("annual_fee", { precision: 10, scale: 2, mode: "number" }),
	csvImportMapping: jsonb("csv_import_mapping"),
	currency: text().default('USD').notNull(),
	nickname: text(),
	openingBalanceDate: date("opening_balance_date"),
}, (table) => [
	index("financial_accounts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("financial_accounts_user_nickname_active_key").using("btree", sql`user_id`, sql`lower(nickname)`).where(sql`((nickname IS NOT NULL) AND is_active)`),
	index("idx_fa_teller_account").using("btree", table.tellerAccountId.asc().nullsLast().op("text_ops")).where(sql`(teller_account_id IS NOT NULL)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "financial_accounts_user_id_fkey"
		}).onDelete("cascade"),
	check("financial_accounts_account_type_check", sql`account_type = ANY (ARRAY['checking'::text, 'savings'::text, 'credit_card'::text, 'loan'::text, 'cash'::text])`),
	check("financial_accounts_currency_format_check", sql`currency ~ '^[A-Z]{3}$'::text`),
	check("financial_accounts_due_date_check", sql`(due_date >= 1) AND (due_date <= 28)`),
	check("financial_accounts_nickname_format", sql`(nickname IS NULL) OR (nickname ~ '^[A-Za-z][A-Za-z0-9_-]{0,19}$'::text)`),
	check("financial_accounts_statement_date_check", sql`(statement_date >= 1) AND (statement_date <= 28)`),
]);

export const institutions = pgTable("institutions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logoUrl: text("logo_url"),
	website: text(),
	description: text(),
	avgCheckingApr: numeric("avg_checking_apr", { precision: 5, scale: 2, mode: "number" }),
	avgSavingsApr: numeric("avg_savings_apr", { precision: 5, scale: 2, mode: "number" }),
	avgCreditCardApr: numeric("avg_credit_card_apr", { precision: 5, scale: 2, mode: "number" }),
	avgLoanApr: numeric("avg_loan_apr", { precision: 5, scale: 2, mode: "number" }),
	commonMonthlyFees: jsonb("common_monthly_fees"),
	avgCreditLimit: numeric("avg_credit_limit", { precision: 10, scale: 2, mode: "number" }),
	knownDisputeWindowDays: integer("known_dispute_window_days"),
	knownReturnDays: integer("known_return_days"),
	rewardsSummary: text("rewards_summary"),
	accountCount: integer("account_count").default(0).notNull(),
	shortLinkId: text("short_link_id"),
	shortLinkUrl: text("short_link_url"),
	lastAggregatedAt: timestamp("last_aggregated_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("institutions_name_key").on(table.name),
	unique("institutions_slug_key").on(table.slug),
]);

export const institutionOffers = pgTable("institution_offers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	institutionId: uuid("institution_id"),
	title: text().notNull(),
	slug: text().notNull(),
	description: text(),
	offerType: text("offer_type").notNull(),
	details: jsonb(),
	expiresAt: date("expires_at"),
	url: text(),
	isPublished: boolean("is_published").default(false).notNull(),
	shortLinkId: text("short_link_id"),
	shortLinkUrl: text("short_link_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.institutionId],
			foreignColumns: [institutions.id],
			name: "institution_offers_institution_id_fkey"
		}).onDelete("cascade"),
	unique("institution_offers_slug_key").on(table.slug),
	check("institution_offers_offer_type_check", sql`offer_type = ANY (ARRAY['promo_apr'::text, 'balance_transfer'::text, 'cashback'::text, 'signup_bonus'::text, 'fee_waiver'::text, 'other'::text])`),
]);

export const invitedUsers = pgTable("invited_users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	invitedBy: uuid("invited_by"),
	userId: uuid("user_id"),
	accessType: text("access_type").default('trial').notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	allowedModules: text("allowed_modules").array(),
	demoProfile: text("demo_profile"),
	demoSeeded: boolean("demo_seeded").default(false).notNull(),
	demoSeededAt: timestamp("demo_seeded_at", { withTimezone: true, mode: 'string' }),
	inviteToken: text("invite_token").default(sql`encode(gen_random_bytes(32), 'hex'::text)`),
	invitedAt: timestamp("invited_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	product: text().default('centos').notNull(),
	invitedByRole: text("invited_by_role").default('admin'),
	isPaid: boolean("is_paid").default(false).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	subscriptionTier: text("subscription_tier"),
	jobLimit: integer("job_limit"),
}, (table) => [
	index("idx_invited_users_invited_by").using("btree", table.invitedBy.asc().nullsLast().op("uuid_ops")),
	index("idx_invited_users_is_paid").using("btree", table.isPaid.asc().nullsLast().op("bool_ops")),
	index("invited_users_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops"), table.expiresAt.asc().nullsLast().op("bool_ops")),
	index("invited_users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("invited_users_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "invited_users_invited_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "invited_users_user_id_fkey"
		}).onDelete("set null"),
	unique("invited_users_email_product_key").on(table.email, table.product),
	unique("invited_users_invite_token_key").on(table.inviteToken),
	check("invited_users_access_type_check", sql`access_type = ANY (ARRAY['trial'::text, 'lifetime'::text])`),
	check("invited_users_demo_profile_check", sql`demo_profile = ANY (ARRAY['visitor'::text, 'tutorial'::text, 'contractor_demo'::text, 'lister_demo'::text])`),
	check("invited_users_invited_by_role_check", sql`invited_by_role = ANY (ARRAY['admin'::text, 'contractor'::text, 'lister'::text])`),
	check("invited_users_product_check", sql`product = ANY (ARRAY['centos'::text, 'contractor'::text, 'lister'::text])`),
]);

export const invoices = pgTable("invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	direction: text().notNull(),
	status: text().default('draft').notNull(),
	contactName: text("contact_name").notNull(),
	contactId: uuid("contact_id"),
	subtotal: numeric({ precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	taxAmount: numeric("tax_amount", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	total: numeric({ precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	amountPaid: numeric("amount_paid", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	invoiceDate: date("invoice_date").default(sql`CURRENT_DATE`).notNull(),
	dueDate: date("due_date"),
	paidDate: date("paid_date"),
	invoiceNumber: text("invoice_number"),
	accountId: uuid("account_id"),
	brandId: uuid("brand_id"),
	categoryId: uuid("category_id"),
	transactionId: uuid("transaction_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	invoiceNumberPrefix: text("invoice_number_prefix"),
	customFields: jsonb("custom_fields").default({}),
	jobId: uuid("job_id"),
	paycheckId: uuid("paycheck_id"),
}, (table) => [
	index("idx_invoices_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	index("idx_invoices_paycheck").using("btree", table.paycheckId.asc().nullsLast().op("uuid_ops")),
	index("invoices_user_id_direction_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.direction.asc().nullsLast().op("text_ops")),
	index("invoices_user_id_due_date_idx").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.dueDate.asc().nullsLast().op("date_ops")),
	index("invoices_user_id_status_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [financialAccounts.id],
			name: "invoices_account_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [userBrands.id],
			name: "invoices_brand_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [budgetCategories.id],
			name: "invoices_category_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "invoices_contact_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "invoices_job_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.paycheckId],
			foreignColumns: [paychecks.id],
			name: "invoices_paycheck_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [financialTransactions.id],
			name: "invoices_transaction_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "invoices_user_id_fkey"
		}).onDelete("cascade"),
	check("invoices_direction_check", sql`direction = ANY (ARRAY['receivable'::text, 'payable'::text])`),
	check("invoices_status_check", sql`status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])`),
]);

export const invoiceItems = pgTable("invoice_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	description: text().notNull(),
	quantity: numeric({ precision: 10, scale: 2, mode: "number" }).default(1).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	amount: numeric({ precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	itemType: text("item_type").default('line_item').notNull(),
}, (table) => [
	index("invoice_items_invoice_id_idx").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_items_invoice_id_fkey"
		}).onDelete("cascade"),
	check("invoice_items_item_type_check", sql`item_type = ANY (ARRAY['line_item'::text, 'benefit'::text])`),
]);

export const invoiceTemplates = pgTable("invoice_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	direction: text().default('receivable').notNull(),
	contactName: text("contact_name"),
	contactId: uuid("contact_id"),
	subtotal: numeric({ precision: 10, scale: 2, mode: "number" }).default(0),
	taxAmount: numeric("tax_amount", { precision: 10, scale: 2, mode: "number" }).default(0),
	total: numeric({ precision: 10, scale: 2, mode: "number" }).default(0),
	accountId: uuid("account_id"),
	brandId: uuid("brand_id"),
	categoryId: uuid("category_id"),
	notes: text(),
	useCount: integer("use_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	invoiceNumberPrefix: text("invoice_number_prefix"),
	customFields: jsonb("custom_fields").default([]),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [financialAccounts.id],
			name: "invoice_templates_account_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [userBrands.id],
			name: "invoice_templates_brand_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [budgetCategories.id],
			name: "invoice_templates_category_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "invoice_templates_contact_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "invoice_templates_user_id_fkey"
		}).onDelete("cascade"),
	check("invoice_templates_direction_check", sql`direction = ANY (ARRAY['receivable'::text, 'payable'::text])`),
]);

export const invoiceTemplateItems = pgTable("invoice_template_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id").notNull(),
	description: text().default('').notNull(),
	quantity: numeric({ precision: 10, scale: 2, mode: "number" }).default(1),
	unitPrice: numeric("unit_price", { precision: 10, scale: 2, mode: "number" }).default(0),
	amount: numeric({ precision: 10, scale: 2, mode: "number" }).default(0),
	sortOrder: integer("sort_order").default(0),
	itemType: text("item_type").default('line_item').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [invoiceTemplates.id],
			name: "invoice_template_items_template_id_fkey"
		}).onDelete("cascade"),
	check("invoice_template_items_item_type_check", sql`item_type = ANY (ARRAY['line_item'::text, 'benefit'::text])`),
]);

export const paychecks = pgTable("paychecks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	jobId: uuid("job_id"),
	paycheckNumber: text("paycheck_number"),
	payPeriodStart: date("pay_period_start").notNull(),
	payPeriodEnd: date("pay_period_end").notNull(),
	payDate: date("pay_date").notNull(),
	grossAmount: numeric("gross_amount", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	benefitsTotal: numeric("benefits_total", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	taxesTotal: numeric("taxes_total", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	otherDeductions: jsonb("other_deductions").default([]).notNull(),
	otherDeductionsTotal: numeric("other_deductions_total", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	netAmount: numeric("net_amount", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	expectedGross: numeric("expected_gross", { precision: 10, scale: 2, mode: "number" }),
	varianceAmount: numeric("variance_amount", { precision: 10, scale: 2, mode: "number" }),
	varianceNotes: text("variance_notes"),
	status: text().default('draft').notNull(),
	isReconciled: boolean("is_reconciled").default(false).notNull(),
	reconciledAt: timestamp("reconciled_at", { withTimezone: true, mode: 'string' }),
	brandId: uuid("brand_id"),
	notes: text(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_paychecks_date").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.payDate.desc().nullsFirst().op("date_ops")),
	index("idx_paychecks_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	index("idx_paychecks_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "paychecks_job_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "paychecks_user_id_fkey"
		}).onDelete("cascade"),
	check("paychecks_status_check", sql`status = ANY (ARRAY['draft'::text, 'pending'::text, 'reconciled'::text, 'disputed'::text])`),
]);

export const itemPrices = pgTable("item_prices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	itemName: text("item_name").notNull(),
	normalizedName: text("normalized_name").generatedAlwaysAs(sql`lower(TRIM(BOTH FROM item_name))`),
	category: text(),
	price: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
	unit: text(),
	unitPrice: numeric("unit_price", { precision: 10, scale: 4, mode: "number" }),
	vendorContactId: uuid("vendor_contact_id"),
	vendorName: text("vendor_name"),
	recordedDate: date("recorded_date").default(sql`CURRENT_DATE`).notNull(),
	source: text().default('scan'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_item_prices_unique").using("btree", table.userId, table.normalizedName, sql`COALESCE(vendor_contact_id, '00000000-0000-0000-0000-000000000000'::uuid)`, table.recordedDate),
	index("idx_item_prices_user_date").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.recordedDate.desc().nullsFirst().op("date_ops")),
	index("idx_item_prices_user_name").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.normalizedName.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "item_prices_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.vendorContactId],
			foreignColumns: [userContacts.id],
			name: "item_prices_vendor_contact_id_fkey"
		}).onDelete("set null"),
	check("item_prices_source_check", sql`source = ANY (ARRAY['scan'::text, 'manual'::text])`),
]);

export const jobDocuments = pgTable("job_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: uuid("job_id").notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	url: text(),
	docType: text("doc_type").default('other').notNull(),
	isShared: boolean("is_shared").default(false).notNull(),
	fileSize: integer("file_size"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	docCategory: text("doc_category"),
	title: text(),
	description: text(),
	metadata: jsonb(),
}, (table) => [
	index("idx_job_documents_category").using("btree", table.jobId.asc().nullsLast().op("text_ops"), table.docCategory.asc().nullsLast().op("text_ops")),
	index("idx_job_documents_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "job_documents_job_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "job_documents_user_id_fkey"
		}).onDelete("cascade"),
	check("job_documents_doc_type_check", sql`doc_type = ANY (ARRAY['call_sheet'::text, 'crew_list'::text, 'w9'::text, 'certificate'::text, 'contract'::text, 'receipt'::text, 'schematic'::text, 'map'::text, 'other'::text])`),
]);

export const jobNotes = pgTable("job_notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: uuid("job_id").notNull(),
	userId: uuid("user_id").notNull(),
	content: text().default('').notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_job_notes_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	index("idx_job_notes_public").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")).where(sql`(is_public = true)`),
	index("idx_job_notes_user").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "job_notes_job_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "job_notes_user_id_fkey"
		}).onDelete("cascade"),
]);

export const jobReplacementRequests = pgTable("job_replacement_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: uuid("job_id").notNull(),
	posterId: uuid("poster_id").notNull(),
	requesterId: uuid("requester_id").notNull(),
	status: text().default('pending').notNull(),
	message: text(),
	posterNote: text("poster_note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_replacement_req_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	index("idx_replacement_req_poster").using("btree", table.posterId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("idx_replacement_req_requester").using("btree", table.requesterId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "job_replacement_requests_job_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.posterId],
			foreignColumns: [users.id],
			name: "job_replacement_requests_poster_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.requesterId],
			foreignColumns: [users.id],
			name: "job_replacement_requests_requester_id_fkey"
		}).onDelete("cascade"),
	unique("job_replacement_requests_job_id_requester_id_key").on(table.jobId, table.requesterId),
	check("job_replacement_requests_status_check", sql`status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'withdrawn'::text])`),
]);

export const jobTimeEntries = pgTable("job_time_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: uuid("job_id").notNull(),
	userId: uuid("user_id").notNull(),
	workDate: date("work_date").notNull(),
	timeIn: timestamp("time_in", { withTimezone: true, mode: 'string' }),
	timeOut: timestamp("time_out", { withTimezone: true, mode: 'string' }),
	adjustedIn: timestamp("adjusted_in", { withTimezone: true, mode: 'string' }),
	adjustedOut: timestamp("adjusted_out", { withTimezone: true, mode: 'string' }),
	breakMinutes: integer("break_minutes").default(0).notNull(),
	totalHours: numeric("total_hours", { precision: 6, scale: 2, mode: "number" }),
	stHours: numeric("st_hours", { precision: 6, scale: 2, mode: "number" }),
	otHours: numeric("ot_hours", { precision: 6, scale: 2, mode: "number" }),
	dtHours: numeric("dt_hours", { precision: 6, scale: 2, mode: "number" }),
	mealProvided: boolean("meal_provided").default(false).notNull(),
	invoiceId: uuid("invoice_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	benefitDeductions: jsonb("benefit_deductions").default([]).notNull(),
}, (table) => [
	index("idx_job_time_entries_date").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.workDate.desc().nullsFirst().op("date_ops")),
	index("idx_job_time_entries_job").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_job_time_entries_unique").using("btree", table.jobId.asc().nullsLast().op("date_ops"), table.userId.asc().nullsLast().op("date_ops"), table.workDate.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "job_time_entries_invoice_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [contractorJobs.id],
			name: "job_time_entries_job_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "job_time_entries_user_id_fkey"
		}).onDelete("cascade"),
]);

export const listerMessageGroups = pgTable("lister_message_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	listerId: uuid("lister_id").notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_msg_groups_lister").using("btree", table.listerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.listerId],
			foreignColumns: [users.id],
			name: "lister_message_groups_lister_id_fkey"
		}).onDelete("cascade"),
]);

export const listerMessageGroupMembers = pgTable("lister_message_group_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id"),
	userId: uuid("user_id").notNull(),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_group_members_group").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")),
	index("idx_group_members_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [listerMessageGroups.id],
			name: "lister_message_group_members_group_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "lister_message_group_members_user_id_fkey"
		}).onDelete("cascade"),
	unique("lister_message_group_members_group_id_user_id_key").on(table.groupId, table.userId),
]);

export const listerMessages = pgTable("lister_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	senderId: uuid("sender_id").notNull(),
	recipientId: uuid("recipient_id"),
	groupId: uuid("group_id"),
	subject: text(),
	body: text().notNull(),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_messages_recipient").using("btree", table.recipientId.asc().nullsLast().op("uuid_ops")),
	index("idx_messages_sender").using("btree", table.senderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [listerMessageGroups.id],
			name: "lister_messages_group_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [users.id],
			name: "lister_messages_recipient_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "lister_messages_sender_id_fkey"
		}).onDelete("cascade"),
	check("lister_messages_check", sql`((recipient_id IS NOT NULL) AND (group_id IS NULL)) OR ((recipient_id IS NULL) AND (group_id IS NOT NULL))`),
]);

export const messageReplies = pgTable("message_replies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	messageId: uuid("message_id").notNull(),
	senderId: uuid("sender_id"),
	isAdmin: boolean("is_admin").default(false).notNull(),
	body: text().notNull(),
	mediaUrl: text("media_url"),
	isReadByAdmin: boolean("is_read_by_admin").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [adminMessages.id],
			name: "message_replies_message_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "message_replies_sender_id_fkey"
		}).onDelete("set null"),
]);

export const moduleTours = pgTable("module_tours", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	moduleSlug: text("module_slug").notNull(),
	app: text().default('main').notNull(),
	status: text().default('available').notNull(),
	currentStep: integer("current_step").default(0),
	totalSteps: integer("total_steps").default(0),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	skippedAt: timestamp("skipped_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_module_tours_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "module_tours_user_id_fkey"
		}).onDelete("cascade"),
	unique("module_tours_user_id_app_module_slug_key").on(table.app, table.moduleSlug, table.userId),
	check("module_tours_app_check", sql`app = ANY (ARRAY['main'::text, 'contractor'::text, 'lister'::text])`),
	check("module_tours_status_check", sql`status = ANY (ARRAY['available'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text])`),
]);

export const notificationLog = pgTable("notification_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	notificationType: text("notification_type").notNull(),
	referenceId: uuid("reference_id"),
	referenceDate: date("reference_date"),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notif_log_user_type").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.notificationType.asc().nullsLast().op("uuid_ops"), table.referenceDate.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_log_user_id_fkey"
		}).onDelete("cascade"),
]);

export const notificationPreferences = pgTable("notification_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	clockInReminder: boolean("clock_in_reminder").default(true),
	clockInMinutesBefore: integer("clock_in_minutes_before").default(30),
	clockOutReminder: boolean("clock_out_reminder").default(true),
	payDayReminder: boolean("pay_day_reminder").default(true),
	jobStartReminder: boolean("job_start_reminder").default(true),
	saveScanImages: boolean("save_scan_images").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	emailMarketing: boolean("email_marketing").default(true).notNull(),
	emailWeeklyDigest: boolean("email_weekly_digest").default(true).notNull(),
	invoiceStatusReminder: boolean("invoice_status_reminder").default(true).notNull(),
	assignmentUpdate: boolean("assignment_update").default(true).notNull(),
	courseUpdate: boolean("course_update").default(true).notNull(),
}, (table) => [
	uniqueIndex("idx_notif_prefs_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_preferences_user_id_fkey"
		}).onDelete("cascade"),
]);

export const paycheckDeposits = pgTable("paycheck_deposits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	paycheckId: uuid("paycheck_id").notNull(),
	accountId: uuid("account_id").notNull(),
	amount: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
	percentage: numeric({ precision: 5, scale: 2, mode: "number" }),
	depositType: text("deposit_type").default('direct_deposit').notNull(),
	transactionId: uuid("transaction_id"),
	label: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	index("idx_paycheck_deposits_account").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("idx_paycheck_deposits_paycheck").using("btree", table.paycheckId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [financialAccounts.id],
			name: "paycheck_deposits_account_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paycheckId],
			foreignColumns: [paychecks.id],
			name: "paycheck_deposits_paycheck_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [financialTransactions.id],
			name: "paycheck_deposits_transaction_id_fkey"
		}).onDelete("set null"),
	check("paycheck_deposits_deposit_type_check", sql`deposit_type = ANY (ARRAY['direct_deposit'::text, 'check'::text, 'cash'::text, 'other'::text])`),
]);

export const paycheckInvoices = pgTable("paycheck_invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	paycheckId: uuid("paycheck_id").notNull(),
	invoiceId: uuid("invoice_id").notNull(),
}, (table) => [
	index("idx_paycheck_invoices_invoice").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	index("idx_paycheck_invoices_paycheck").using("btree", table.paycheckId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "paycheck_invoices_invoice_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paycheckId],
			foreignColumns: [paychecks.id],
			name: "paycheck_invoices_paycheck_id_fkey"
		}).onDelete("cascade"),
	unique("paycheck_invoices_paycheck_id_invoice_id_key").on(table.invoiceId, table.paycheckId),
]);

export const paycheckTaxes = pgTable("paycheck_taxes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	paycheckId: uuid("paycheck_id").notNull(),
	taxType: text("tax_type").notNull(),
	label: text().notNull(),
	expectedAmount: numeric("expected_amount", { precision: 10, scale: 2, mode: "number" }),
	actualAmount: numeric("actual_amount", { precision: 10, scale: 2, mode: "number" }).default(0).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	notes: text(),
}, (table) => [
	index("idx_paycheck_taxes_paycheck").using("btree", table.paycheckId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.paycheckId],
			foreignColumns: [paychecks.id],
			name: "paycheck_taxes_paycheck_id_fkey"
		}).onDelete("cascade"),
	check("paycheck_taxes_tax_type_check", sql`tax_type = ANY (ARRAY['federal'::text, 'state'::text, 'local'::text, 'fica_ss'::text, 'fica_medicare'::text, 'state_disability'::text, 'state_unemployment'::text, 'local_other'::text, 'other'::text])`),
]);

export const publicVenues = pgTable("public_venues", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	address: text(),
	city: text(),
	state: text(),
	country: text().default('US').notNull(),
	lat: numeric({ mode: "number" }),
	lng: numeric({ mode: "number" }),
	venueType: text("venue_type"),
	capacity: integer(),
	notes: text(),
	knowledgeBase: jsonb("knowledge_base").default({}).notNull(),
	schematicsUrl: text("schematics_url"),
	createdBy: uuid("created_by"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "public_venues_created_by_fkey"
		}).onDelete("set null"),
]);

export const pushSubscriptions = pgTable("push_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	endpoint: text().notNull(),
	p256Dh: text("p256dh").notNull(),
	auth: text().notNull(),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("idx_push_subs_endpoint").using("btree", table.endpoint.asc().nullsLast().op("text_ops")),
	index("idx_push_subs_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "push_subscriptions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const scanImages = pgTable("scan_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	documentType: text("document_type").notNull(),
	entityType: text("entity_type"),
	entityId: uuid("entity_id"),
	contactId: uuid("contact_id"),
	cloudinaryUrl: text("cloudinary_url").notNull(),
	cloudinaryPublicId: text("cloudinary_public_id").notNull(),
	originalFilename: text("original_filename"),
	scanData: jsonb("scan_data"),
	confidence: numeric({ precision: 4, scale: 3, mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_scan_images_contact").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")).where(sql`(contact_id IS NOT NULL)`),
	index("idx_scan_images_entity").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("idx_scan_images_user_date").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [userContacts.id],
			name: "scan_images_contact_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "scan_images_user_id_fkey"
		}).onDelete("cascade"),
	check("scan_images_document_type_check", sql`document_type = ANY (ARRAY['receipt'::text, 'recipe'::text, 'fuel_receipt'::text, 'maintenance_invoice'::text, 'medical'::text, 'unknown'::text])`),
]);

export const receiptLineItems = pgTable("receipt_line_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	scanImageId: uuid("scan_image_id"),
	transactionId: uuid("transaction_id"),
	itemName: text("item_name").notNull(),
	normalizedName: text("normalized_name").generatedAlwaysAs(sql`lower(TRIM(BOTH FROM item_name))`),
	quantity: numeric({ precision: 10, scale: 3, mode: "number" }).default(1),
	unit: text(),
	unitPrice: numeric("unit_price", { precision: 10, scale: 2, mode: "number" }),
	totalPrice: numeric("total_price", { precision: 10, scale: 2, mode: "number" }),
	categoryHint: text("category_hint"),
	matchedItemId: uuid("matched_item_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_receipt_items_scan").using("btree", table.scanImageId.asc().nullsLast().op("uuid_ops")).where(sql`(scan_image_id IS NOT NULL)`),
	index("idx_receipt_items_txn").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")).where(sql`(transaction_id IS NOT NULL)`),
	index("idx_receipt_items_user_name").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.normalizedName.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.scanImageId],
			foreignColumns: [scanImages.id],
			name: "receipt_line_items_scan_image_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [financialTransactions.id],
			name: "receipt_line_items_transaction_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "receipt_line_items_user_id_fkey"
		}).onDelete("cascade"),
]);

export const recurringPayments = pgTable("recurring_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	description: text().notNull(),
	amount: numeric({ precision: 12, scale: 2, mode: "number" }).notNull(),
	type: text().default('expense').notNull(),
	categoryId: uuid("category_id"),
	dayOfMonth: integer("day_of_month").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastGenerated: date("last_generated"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [financialAccounts.id],
			name: "recurring_payments_account_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [budgetCategories.id],
			name: "recurring_payments_category_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "recurring_payments_user_id_fkey"
		}).onDelete("cascade"),
	check("recurring_payments_day_of_month_check", sql`(day_of_month >= 1) AND (day_of_month <= 28)`),
	check("recurring_payments_type_check", sql`type = ANY (ARRAY['expense'::text, 'income'::text])`),
]);

export const referralRewardTiers = pgTable("referral_reward_tiers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	app: text().default('contractor').notNull(),
	name: text().notNull(),
	paidReferrals: integer("paid_referrals").notNull(),
	rewardType: text("reward_type").default('credit').notNull(),
	rewardMonths: integer("reward_months").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_referral_reward_tiers_app").using("btree", table.app.asc().nullsLast().op("text_ops")),
]);

export const referralRewards = pgTable("referral_rewards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tierId: uuid("tier_id").notNull(),
	paidCount: integer("paid_count").notNull(),
	appliedAt: timestamp("applied_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	stripeCreditId: text("stripe_credit_id"),
}, (table) => [
	uniqueIndex("idx_referral_rewards_user_tier").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.tierId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tierId],
			foreignColumns: [referralRewardTiers.id],
			name: "referral_rewards_tier_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "referral_rewards_user_id_fkey"
		}).onDelete("cascade"),
]);

export const tourEvents = pgTable("tour_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	publicAlias: text("public_alias"),
	app: text().default('main').notNull(),
	moduleSlug: text("module_slug").notNull(),
	eventType: text("event_type").notNull(),
	stepIndex: integer("step_index"),
	stepTitle: text("step_title"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_tour_events_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_tour_events_module").using("btree", table.app.asc().nullsLast().op("text_ops"), table.moduleSlug.asc().nullsLast().op("text_ops")),
	index("idx_tour_events_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tour_events_user_id_fkey"
		}).onDelete("set null"),
	check("tour_events_event_type_check", sql`event_type = ANY (ARRAY['tour_started'::text, 'tour_completed'::text, 'tour_skipped'::text, 'tour_exited'::text, 'step_completed'::text, 'step_skipped'::text, 'demo_login'::text, 'demo_feature_view'::text, 'feature_page_view'::text, 'cta_signup_click'::text, 'cta_demo_click'::text, 'tour_restarted'::text])`),
]);

export const unionDocuments = pgTable("union_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	unionLocal: text("union_local"),
	docUrl: text("doc_url"),
	docType: text("doc_type").notNull(),
	isShared: boolean("is_shared").default(false),
	status: text().default('pending'),
	errorMsg: text("error_msg"),
	pageCount: integer("page_count"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_union_documents_shared").using("btree", table.isShared.asc().nullsLast().op("bool_ops")).where(sql`(is_shared = true)`),
	index("idx_union_documents_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "union_documents_user_id_fkey"
		}).onDelete("cascade"),
	check("union_documents_doc_type_check", sql`doc_type = ANY (ARRAY['contract'::text, 'bylaws'::text, 'rate_sheet'::text, 'rules'::text, 'other'::text])`),
	check("union_documents_status_check", sql`status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready'::text, 'error'::text])`),
]);

export const unionDocumentChunks = pgTable("union_document_chunks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid("document_id").notNull(),
	chunkText: text("chunk_text").notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	embedding: vector({ dimensions: 768 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_union_chunks_document").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
	index("idx_union_chunks_embedding").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "50"}),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [unionDocuments.id],
			name: "union_document_chunks_document_id_fkey"
		}).onDelete("cascade"),
]);

export const unionMemberships = pgTable("union_memberships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	unionName: text("union_name").notNull(),
	localNumber: text("local_number").notNull(),
	memberId: text("member_id"),
	status: text().default('active').notNull(),
	joinDate: date("join_date"),
	expirationDate: date("expiration_date"),
	duesAmount: numeric("dues_amount", { precision: 10, scale: 2, mode: "number" }),
	duesFrequency: text("dues_frequency").default('quarterly'),
	nextDuesDate: date("next_dues_date"),
	autoPay: boolean("auto_pay").default(false),
	initiationFee: numeric("initiation_fee", { precision: 10, scale: 2, mode: "number" }),
	initiationPaid: boolean("initiation_paid").default(false),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_union_memberships_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "union_memberships_user_id_fkey"
		}).onDelete("cascade"),
	unique("union_memberships_user_id_union_name_local_number_key").on(table.localNumber, table.unionName, table.userId),
	check("union_memberships_dues_frequency_check", sql`dues_frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'semi_annual'::text, 'annual'::text])`),
	check("union_memberships_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'retired'::text, 'honorary'::text])`),
]);

export const unionDuesPayments = pgTable("union_dues_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	membershipId: uuid("membership_id").notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
	paymentDate: date("payment_date").notNull(),
	periodStart: date("period_start"),
	periodEnd: date("period_end"),
	paymentMethod: text("payment_method"),
	confirmationNumber: text("confirmation_number"),
	transactionId: uuid("transaction_id"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_union_dues_membership").using("btree", table.membershipId.asc().nullsLast().op("uuid_ops")),
	index("idx_union_dues_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [unionMemberships.id],
			name: "union_dues_payments_membership_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [financialTransactions.id],
			name: "union_dues_payments_transaction_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "union_dues_payments_user_id_fkey"
		}).onDelete("cascade"),
]);

export const unionRagSubmissions = pgTable("union_rag_submissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileUrl: text("file_url").notNull(),
	fileName: text("file_name").notNull(),
	unionLocal: text("union_local"),
	docType: text("doc_type").notNull(),
	description: text(),
	coverageDates: text("coverage_dates"),
	status: text().default('pending').notNull(),
	adminNotes: text("admin_notes"),
	documentId: uuid("document_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	replacesDocumentId: uuid("replaces_document_id"),
}, (table) => [
	index("idx_rag_submissions_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_rag_submissions_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [unionDocuments.id],
			name: "union_rag_submissions_document_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.replacesDocumentId],
			foreignColumns: [unionDocuments.id],
			name: "union_rag_submissions_replaces_document_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "union_rag_submissions_user_id_fkey"
		}).onDelete("cascade"),
	check("union_rag_submissions_doc_type_check", sql`doc_type = ANY (ARRAY['contract'::text, 'bylaws'::text, 'rate_sheet'::text, 'rules'::text, 'other'::text])`),
	check("union_rag_submissions_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'processing'::text, 'live'::text])`),
]);

export const usageEvents = pgTable("usage_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	userType: text("user_type").default('real').notNull(),
	subscriptionType: text("subscription_type"),
	module: text().notNull(),
	action: text().notNull(),
	detail: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("usage_events_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("usage_events_created_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("usage_events_module_idx").using("btree", table.module.asc().nullsLast().op("text_ops")),
	index("usage_events_sub_type_idx").using("btree", table.subscriptionType.asc().nullsLast().op("text_ops")),
	index("usage_events_user_type_idx").using("btree", table.userType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "usage_events_user_id_fkey"
		}).onDelete("set null"),
	check("usage_events_user_type_check", sql`user_type = ANY (ARRAY['admin'::text, 'demo'::text, 'tutorial'::text, 'real'::text])`),
]);

export const venueChangeRequests = pgTable("venue_change_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	venueId: uuid("venue_id"),
	userId: uuid("user_id"),
	requestType: text("request_type").notNull(),
	proposedChanges: jsonb("proposed_changes"),
	reason: text(),
	status: text().default('pending').notNull(),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	adminNote: text("admin_note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "venue_change_requests_reviewed_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "venue_change_requests_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [publicVenues.id],
			name: "venue_change_requests_venue_id_fkey"
		}).onDelete("cascade"),
	check("venue_change_requests_request_type_check", sql`request_type = ANY (ARRAY['edit'::text, 'delete'::text])`),
	check("venue_change_requests_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`),
]);

export const witusIdentities = pgTable("witus_identities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	witusSub: text("witus_sub").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "witus_identities_user_id_fkey"
		}).onDelete("cascade"),
	unique("witus_identities_user_id_key").on(table.userId),
	unique("witus_identities_witus_sub_key").on(table.witusSub),
]);

export const blogLikes = pgTable("blog_likes", {
	userId: uuid("user_id").notNull(),
	postId: uuid("post_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_blog_likes_post").using("btree", table.postId.asc().nullsLast().op("uuid_ops")),
	index("idx_blog_likes_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [blogPosts.id],
			name: "blog_likes_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "blog_likes_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.postId, table.userId], name: "blog_likes_pkey"}),
]);

export const blogSaves = pgTable("blog_saves", {
	userId: uuid("user_id").notNull(),
	postId: uuid("post_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_blog_saves_post").using("btree", table.postId.asc().nullsLast().op("uuid_ops")),
	index("idx_blog_saves_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [blogPosts.id],
			name: "blog_saves_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "blog_saves_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.postId, table.userId], name: "blog_saves_pkey"}),
]);

export const messageReads = pgTable("message_reads", {
	userId: uuid("user_id").notNull(),
	messageId: uuid("message_id").notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_message_reads_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [adminMessages.id],
			name: "message_reads_message_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "message_reads_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.messageId, table.userId], name: "message_reads_pkey"}),
]);
export const expectedPayments = pgView("expected_payments", {	userId: uuid("user_id"),
	sourceType: text("source_type"),
	sourceId: uuid("source_id"),
	expectedDate: date("expected_date"),
	label: text(),
	referenceNumber: text("reference_number"),
	expectedAmount: numeric("expected_amount", { mode: "number" }),
	status: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	brandId: uuid("brand_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
}).with({"securityInvoker":true}).as(sql`SELECT j.user_id, 'job'::text AS source_type, j.id AS source_id, j.est_pay_date AS expected_date, j.client_name AS label, j.job_number AS reference_number, COALESCE(( SELECT sum(COALESCE(te.st_hours, te.total_hours, 0::numeric) * COALESCE(j.pay_rate, 0::numeric) + COALESCE(te.ot_hours, 0::numeric) * COALESCE(j.ot_rate, j.pay_rate * 1.5, 0::numeric) + COALESCE(te.dt_hours, 0::numeric) * COALESCE(j.dt_rate, j.pay_rate * 2::numeric, 0::numeric)) AS sum FROM job_time_entries te WHERE te.job_id = j.id), CASE WHEN j.rate_type = 'daily'::text AND j.start_date IS NOT NULL AND j.end_date IS NOT NULL THEN j.pay_rate * (j.end_date - j.start_date + 1)::numeric WHEN j.rate_type = 'flat'::text THEN j.pay_rate ELSE 0::numeric END) AS expected_amount, j.status, j.start_date, j.end_date, j.brand_id, j.created_at FROM contractor_jobs j WHERE j.est_pay_date IS NOT NULL AND (j.status = ANY (ARRAY['completed'::text, 'invoiced'::text])) UNION ALL SELECT i.user_id, 'invoice'::text AS source_type, i.id AS source_id, i.due_date AS expected_date, i.contact_name AS label, i.invoice_number AS reference_number, i.total - i.amount_paid AS expected_amount, i.status, i.invoice_date AS start_date, NULL::date AS end_date, i.brand_id, i.created_at FROM invoices i WHERE i.direction = 'receivable'::text AND i.due_date IS NOT NULL AND (i.status = ANY (ARRAY['sent'::text, 'overdue'::text]))`);

export const publicProfiles = pgView("public_profiles", {	id: uuid(),
	username: text(),
	displayName: text("display_name"),
	bio: text(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}).with({"securityBarrier":true}).as(sql`SELECT id, username, display_name, bio, avatar_url, created_at, updated_at FROM profiles p`);