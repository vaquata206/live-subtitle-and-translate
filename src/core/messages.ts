import type { CaptureState, CaptureStatus, Segment, Session, SessionMeta } from './types';
import type { Settings } from './settings';

/** Messages handled by the service worker (sent by the side panel / options page). */
export type BackgroundRequest =
  | { type: 'START_CAPTURE'; tabId: number }
  | { type: 'STOP_CAPTURE' }
  | { type: 'GET_STATE' }
  | { type: 'LIST_SESSIONS' }
  | { type: 'GET_SESSION'; sessionId: string }
  | { type: 'DELETE_SESSION'; sessionId: string }
  | { type: 'RENAME_SPEAKER'; sessionId: string; speaker: number; name: string };

export interface BackgroundResponses {
  START_CAPTURE: { ok: true; sessionId: string } | { ok: false; error: string };
  STOP_CAPTURE: { ok: true };
  GET_STATE: { state: CaptureState; session: Session | null };
  LIST_SESSIONS: { sessions: SessionMeta[] };
  GET_SESSION: { session: Session | null };
  DELETE_SESSION: { ok: true };
  RENAME_SPEAKER: { session: Session | null };
}

/** Messages addressed to the offscreen document. */
export type OffscreenRequest =
  | { target: 'offscreen'; type: 'OFFSCREEN_START'; streamId: string; sessionId: string; settings: Settings }
  | { target: 'offscreen'; type: 'OFFSCREEN_STOP' };

/** Broadcast events (offscreen → service worker + side panel, service worker → side panel). */
export type BroadcastEvent =
  | { type: 'STATUS'; status: CaptureStatus; message?: string; sessionId?: string }
  | { type: 'SEGMENT_INTERIM'; sessionId: string; segment: Segment }
  | { type: 'SEGMENT_FINAL'; sessionId: string; segment: Segment }
  | { type: 'SEGMENT_TRANSLATED'; sessionId: string; id: string; translation?: string; error?: string }
  | { type: 'SESSION_UPDATED'; session: Session }
  | { type: 'CAPTURE_STATE'; state: CaptureState };

export type AnyMessage = BackgroundRequest | OffscreenRequest | BroadcastEvent;

export async function sendToBackground<T extends BackgroundRequest>(
  msg: T,
): Promise<BackgroundResponses[T['type']]> {
  return chrome.runtime.sendMessage(msg);
}

/** Fire-and-forget broadcast; ignores "no receiver" errors when no page is listening. */
export function broadcast(event: BroadcastEvent): void {
  chrome.runtime.sendMessage(event).catch(() => undefined);
}

const BACKGROUND_TYPES = new Set<string>([
  'START_CAPTURE',
  'STOP_CAPTURE',
  'GET_STATE',
  'LIST_SESSIONS',
  'GET_SESSION',
  'DELETE_SESSION',
  'RENAME_SPEAKER',
]);

export function isBackgroundRequest(msg: unknown): msg is BackgroundRequest {
  return !!msg && typeof msg === 'object' && BACKGROUND_TYPES.has((msg as { type?: string }).type ?? '') &&
    !('target' in msg);
}

export function isOffscreenRequest(msg: unknown): msg is OffscreenRequest {
  return !!msg && typeof msg === 'object' && (msg as { target?: string }).target === 'offscreen';
}
