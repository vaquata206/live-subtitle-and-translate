import { z } from 'zod';

/**
 * Realtime protocol between the extension (publisher), the realtime service and viewers.
 * Bump PROTOCOL_VERSION on breaking changes; the server must accept MIN_SUPPORTED_PROTOCOL..PROTOCOL_VERSION
 * because installed extensions update later than the server.
 */
export const PROTOCOL_VERSION = 1;
export const MIN_SUPPORTED_PROTOCOL = 1;

export const LIMITS = {
  segmentTextMax: 2000,
  titleMax: 300,
  langCode: 16,
  maxBatch: 100,
} as const;

const langCode = z.string().min(2).max(LIMITS.langCode);
const segmentId = z.string().min(1).max(64);
const seconds = z
  .number()
  .finite()
  .min(0)
  .max(24 * 3600);
const seq = z.number().int().nonnegative();

// ---------- Publisher (extension) → server, over WebSocket ----------

export const HelloMessage = z.object({
  type: z.literal('hello'),
  protocol: z.number().int().positive(),
  clientVersion: z.string().max(32),
  token: z.string().min(1).max(4096),
  /** Resume an existing meeting; omitted to create a new one. */
  meetingId: z.uuid().optional(),
  /** Last sequence number the client believes the server acknowledged. */
  resumeFromSeq: seq.optional(),
  meeting: z
    .object({
      title: z.string().max(LIMITS.titleMax),
      sourceUrl: z.url().max(2048).optional(),
      sourceLanguage: z.string().max(LIMITS.langCode),
      startedAt: z.number().int().positive(),
    })
    .optional(),
});

const sequenced = { seq };

export const SegmentFinalEvent = z.object({
  type: z.literal('segment.final'),
  ...sequenced,
  segment: z.object({
    id: segmentId,
    speaker: z.number().int().min(0).max(99).nullable(),
    text: z.string().min(1).max(LIMITS.segmentTextMax),
    lang: langCode.optional(),
    start: seconds,
    end: seconds,
  }),
});

export const SegmentTranslationEvent = z.object({
  type: z.literal('segment.translation'),
  ...sequenced,
  id: segmentId,
  lang: langCode,
  text: z.string().max(LIMITS.segmentTextMax * 2),
});

/** Interim (not yet final) text: not persisted, not sequenced, may be dropped under load. */
export const SegmentInterimEvent = z.object({
  type: z.literal('segment.interim'),
  speaker: z.number().int().min(0).max(99).nullable(),
  text: z.string().max(LIMITS.segmentTextMax),
});

export const SpeakerRenameEvent = z.object({
  type: z.literal('speaker.rename'),
  ...sequenced,
  speaker: z.number().int().min(0).max(99),
  name: z.string().max(80),
});

export const SummaryLiveEvent = z.object({
  type: z.literal('summary.live'),
  ...sequenced,
  text: z.string().max(10_000),
  upToSegment: z.number().int().nonnegative(),
  lang: langCode,
});

export const MeetingMetaEvent = z.object({
  type: z.literal('meeting.meta'),
  ...sequenced,
  title: z.string().max(LIMITS.titleMax),
});

export const MeetingEndEvent = z.object({
  type: z.literal('meeting.end'),
  ...sequenced,
  endedAt: z.number().int().positive(),
});

export const PublisherEvent = z.discriminatedUnion('type', [
  SegmentFinalEvent,
  SegmentTranslationEvent,
  SegmentInterimEvent,
  SpeakerRenameEvent,
  SummaryLiveEvent,
  MeetingMetaEvent,
  MeetingEndEvent,
]);

export const PublisherMessage = z.discriminatedUnion('type', [
  HelloMessage,
  SegmentFinalEvent,
  SegmentTranslationEvent,
  SegmentInterimEvent,
  SpeakerRenameEvent,
  SummaryLiveEvent,
  MeetingMetaEvent,
  MeetingEndEvent,
  z.object({ type: z.literal('ping'), at: z.number() }),
]);

// ---------- Server → publisher ----------

export const ServerToPublisher = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('welcome'),
    meetingId: z.uuid(),
    ackedSeq: seq,
    shareUrl: z.url().optional(),
    serverProtocol: z.number().int(),
  }),
  z.object({ type: z.literal('ack'), seq }),
  z.object({ type: z.literal('viewers'), count: z.number().int().nonnegative() }),
  z.object({ type: z.literal('limit.reached'), feature: z.string(), message: z.string() }),
  z.object({
    type: z.literal('error'),
    code: z.enum(['unauthorized', 'forbidden', 'upgrade_required', 'invalid_message', 'rate_limited', 'internal']),
    message: z.string(),
    fatal: z.boolean(),
  }),
  z.object({ type: z.literal('pong'), at: z.number() }),
]);

// ---------- Server → viewer, over SSE (`event:` name = `type`) ----------

export const ViewerEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('segment'), segment: SegmentFinalEvent.shape.segment }),
  z.object({ type: z.literal('translation'), id: segmentId, lang: langCode, text: z.string() }),
  z.object({ type: z.literal('interim'), speaker: z.number().int().nullable(), text: z.string() }),
  z.object({ type: z.literal('speakers'), names: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal('summary'), text: z.string(), lang: langCode }),
  z.object({ type: z.literal('status'), status: z.enum(['live', 'ended']) }),
  z.object({ type: z.literal('viewers'), count: z.number().int().nonnegative() }),
]);

export type HelloMessage = z.infer<typeof HelloMessage>;
export type PublisherEvent = z.infer<typeof PublisherEvent>;
export type PublisherMessage = z.infer<typeof PublisherMessage>;
export type ServerToPublisher = z.infer<typeof ServerToPublisher>;
export type ViewerEvent = z.infer<typeof ViewerEvent>;

export function isProtocolSupported(version: number): boolean {
  return version >= MIN_SUPPORTED_PROTOCOL && version <= PROTOCOL_VERSION;
}

/** Parses an incoming publisher frame; returns a typed message or a validation error string. */
export function parsePublisherMessage(
  raw: string,
): { ok: true; message: PublisherMessage } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
  const result = PublisherMessage.safeParse(json);
  if (!result.success) return { ok: false, error: z.prettifyError(result.error) };
  return { ok: true, message: result.data };
}
