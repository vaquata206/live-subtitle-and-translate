import { describe, expect, it } from 'vitest';
import { isProtocolSupported, parsePublisherMessage, PROTOCOL_VERSION, ServerToPublisher, ViewerEvent } from '../src';

const uuid = '3f1c2b7e-8a4d-4c1e-9f2a-6b5d4e3c2a10';

describe('publisher messages', () => {
  it('accepts a valid hello', () => {
    const r = parsePublisherMessage(
      JSON.stringify({
        type: 'hello',
        protocol: PROTOCOL_VERSION,
        clientVersion: '0.2.0',
        token: 'jwt',
        meeting: {
          title: 'Sprint',
          sourceUrl: 'https://meet.google.com/abc',
          sourceLanguage: 'multi',
          startedAt: Date.now(),
        },
      }),
    );
    expect(r.ok).toBe(true);
  });

  it('accepts a final segment and rejects oversize text', () => {
    const seg = { id: 's1', speaker: 0, text: 'Hello', lang: 'en', start: 1, end: 2 };
    expect(parsePublisherMessage(JSON.stringify({ type: 'segment.final', seq: 1, segment: seg })).ok).toBe(true);
    const bad = parsePublisherMessage(
      JSON.stringify({ type: 'segment.final', seq: 2, segment: { ...seg, text: 'x'.repeat(2001) } }),
    );
    expect(bad.ok).toBe(false);
  });

  it('rejects unknown types, invalid JSON and negative seq', () => {
    expect(parsePublisherMessage('{"type":"nope"}').ok).toBe(false);
    expect(parsePublisherMessage('{oops').ok).toBe(false);
    expect(parsePublisherMessage(JSON.stringify({ type: 'meeting.end', seq: -1, endedAt: 1 })).ok).toBe(false);
  });

  it('interim events need no seq', () => {
    expect(parsePublisherMessage(JSON.stringify({ type: 'segment.interim', speaker: null, text: 'hel' })).ok).toBe(
      true,
    );
  });
});

describe('server and viewer messages', () => {
  it('validates welcome and error frames', () => {
    expect(
      ServerToPublisher.safeParse({ type: 'welcome', meetingId: uuid, ackedSeq: 0, serverProtocol: 1 }).success,
    ).toBe(true);
    expect(
      ServerToPublisher.safeParse({ type: 'error', code: 'upgrade_required', message: 'x', fatal: true }).success,
    ).toBe(true);
    expect(ServerToPublisher.safeParse({ type: 'error', code: 'weird', message: 'x', fatal: true }).success).toBe(
      false,
    );
  });

  it('validates viewer events', () => {
    expect(ViewerEvent.safeParse({ type: 'translation', id: 's1', lang: 'vi', text: 'Xin chào' }).success).toBe(true);
    expect(ViewerEvent.safeParse({ type: 'status', status: 'paused' }).success).toBe(false);
  });

  it('checks protocol support window', () => {
    expect(isProtocolSupported(PROTOCOL_VERSION)).toBe(true);
    expect(isProtocolSupported(PROTOCOL_VERSION + 1)).toBe(false);
    expect(isProtocolSupported(0)).toBe(false);
  });
});
