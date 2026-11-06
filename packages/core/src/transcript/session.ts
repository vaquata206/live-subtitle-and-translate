import type { Segment, Session, SessionMeta } from '../types';

export function createSession(init: {
  id: string;
  title: string;
  url?: string;
  startedAt: number;
  sourceLanguage: string;
  targetLanguage: string;
}): Session {
  return { ...init, segmentCount: 0, segments: [], speakerNames: {} };
}

export function toMeta(s: Session): SessionMeta {
  return {
    id: s.id,
    title: s.title,
    url: s.url,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    segmentCount: s.segments.length,
  };
}

/** Appends a final segment (idempotent by id) keeping segments ordered by start time. */
export function applyFinalSegment(session: Session, segment: Segment): Session {
  if (session.segments.some((s) => s.id === segment.id)) return session;
  const segments = [...session.segments];
  let i = segments.length;
  while (i > 0 && segments[i - 1].start > segment.start) i--;
  segments.splice(i, 0, { ...segment, isFinal: true });
  return { ...session, segments, segmentCount: segments.length };
}

export function applyTranslation(
  session: Session,
  id: string,
  translation: string | undefined,
  error: string | undefined,
): Session {
  let changed = false;
  const segments = session.segments.map((s) => {
    if (s.id !== id) return s;
    changed = true;
    return { ...s, translation, translationError: error };
  });
  return changed ? { ...session, segments } : session;
}

export function renameSpeaker(session: Session, speaker: number, name: string): Session {
  const speakerNames = { ...session.speakerNames };
  const trimmed = name.trim();
  if (trimmed) speakerNames[speaker] = trimmed;
  else delete speakerNames[speaker];
  return { ...session, speakerNames };
}

export function speakerLabel(session: Pick<Session, 'speakerNames'>, speaker: number | null): string {
  if (speaker === null || speaker === undefined) return '';
  return session.speakerNames[speaker] ?? `Speaker ${speaker + 1}`;
}
