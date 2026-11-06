import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------- Users & auth (Auth.js compatible) ----------

export const userRole = pgEnum('user_role', ['user', 'admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  name: text('name'),
  image: text('image'),
  passwordHash: text('password_hash'),
  role: userRole('role').notNull().default('user'),
  locale: text('locale').notNull().default('vi'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/** Extension sign-ins (OAuth PKCE). Only a hash of the rotating refresh token is stored. */
export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceName: text('device_name').notNull(),
    refreshHash: text('refresh_hash').notNull().unique(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('device_tokens_user_idx').on(t.userId)],
);

// ---------- Plans & entitlements ----------

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  priceLabel: text('price_label'),
  isPublic: boolean('is_public').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Feature catalog mirrored from @lst/entitlements on deploy (for admin UI and FK integrity). */
export const features = pgTable('features', {
  key: text('key').primaryKey(),
  type: text('type').notNull(),
  defaultValue: jsonb('default_value').notNull(),
  description: text('description').notNull(),
});

export const planFeatures = pgTable(
  'plan_features',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    featureKey: text('feature_key')
      .notNull()
      .references(() => features.key, { onDelete: 'cascade' }),
    value: jsonb('value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.featureKey] })],
);

export const subscriptionStatus = pgEnum('subscription_status', ['active', 'trialing', 'past_due', 'canceled']);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatus('status').notNull().default('active'),
    source: text('source').notNull().default('manual'),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull().defaultNow(),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('subscriptions_user_idx').on(t.userId, t.status)],
);

export const userFeatureOverrides = pgTable(
  'user_feature_overrides',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    featureKey: text('feature_key')
      .notNull()
      .references(() => features.key, { onDelete: 'cascade' }),
    value: jsonb('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    note: text('note'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.featureKey] })],
);

/** Aggregated usage per metered feature per period (e.g. '2026-11'). Hot counters live in Redis. */
export const usageCounters = pgTable(
  'usage_counters',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    featureKey: text('feature_key').notNull(),
    period: text('period').notNull(),
    used: bigint('used', { mode: 'number' }).notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.featureKey, t.period] })],
);

export const usageEvents = pgTable(
  'usage_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    meetingId: uuid('meeting_id'),
    kind: text('kind').notNull(),
    qty: real('qty').notNull(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('usage_events_user_at_idx').on(t.userId, t.at)],
);

// ---------- Meetings ----------

export const meetingStatus = pgEnum('meeting_status', ['live', 'ended']);

export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sourceUrl: text('source_url'),
    platform: text('platform'),
    status: meetingStatus('status').notNull().default('live'),
    sourceLanguage: text('source_language').notNull().default('multi'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    lastSeq: bigint('last_seq', { mode: 'number' }).notNull().default(0),
    retentionUntil: timestamp('retention_until', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('meetings_owner_started_idx').on(t.ownerId, t.startedAt.desc()),
    index('meetings_retention_idx').on(t.retentionUntil),
  ],
);

export const meetingShares = pgTable('meeting_shares', {
  meetingId: uuid('meeting_id')
    .primaryKey()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  pinHash: text('pin_hash'),
  enabled: boolean('enabled').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  allowTranscriptAfter: boolean('allow_transcript_after').notNull().default(true),
  allowDownload: boolean('allow_download').notNull().default(false),
  /** Bumped on PIN change/disable to invalidate existing viewer sessions. */
  version: integer('version').notNull().default(1),
  updatedAt: updatedAt(),
});

export const speakers = pgTable(
  'speakers',
  {
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    idx: integer('idx').notNull(),
    displayName: text('display_name').notNull(),
  },
  (t) => [primaryKey({ columns: [t.meetingId, t.idx] })],
);

export const segments = pgTable(
  'segments',
  {
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    speakerIdx: integer('speaker_idx'),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    text: text('text').notNull(),
    lang: text('lang'),
    // Accent-insensitive search for Vietnamese: simple config over unaccent(text).
    searchTsv: tsvector('search_tsv').generatedAlwaysAs(sql`to_tsvector('simple', f_unaccent(text))`),
  },
  (t) => [
    primaryKey({ columns: [t.meetingId, t.id] }),
    index('segments_meeting_seq_idx').on(t.meetingId, t.seq),
    index('segments_search_idx').using('gin', t.searchTsv),
  ],
);

export const segmentTranslations = pgTable(
  'segment_translations',
  {
    meetingId: uuid('meeting_id').notNull(),
    segmentId: text('segment_id').notNull(),
    lang: text('lang').notNull(),
    text: text('text').notNull(),
    source: text('source').notNull().default('extension'),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.meetingId, t.segmentId, t.lang] })],
);

export const summaries = pgTable('summaries', {
  meetingId: uuid('meeting_id')
    .primaryKey()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  liveText: text('live_text'),
  liveLang: text('live_lang'),
  minutes: jsonb('minutes'),
  minutesMeta: jsonb('minutes_meta'),
  /** Optimistic locking for concurrent minutes edits (extension vs web). */
  version: integer('version').notNull().default(0),
  updatedAt: updatedAt(),
});

// ---------- Audit ----------

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    data: jsonb('data'),
    ip: text('ip'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_target_idx').on(t.targetType, t.targetId),
    index('audit_logs_actor_idx').on(t.actorId, t.at),
  ],
);

export const shareAccessLogs = pgTable(
  'share_access_logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    meetingId: uuid('meeting_id').notNull(),
    ip: text('ip'),
    success: boolean('success').notNull(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('share_access_logs_meeting_idx').on(t.meetingId, t.at)],
);
