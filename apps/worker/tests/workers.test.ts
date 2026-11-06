import type { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { connectionFromUrl, dispatch, QUEUES } from '../src/workers';

describe('worker', () => {
  it('parses redis URLs', () => {
    expect(connectionFromUrl('redis://:secret@cache:6380/2')).toMatchObject({
      host: 'cache',
      port: 6380,
      password: 'secret',
      db: 2,
      maxRetriesPerRequest: null,
    });
    expect(connectionFromUrl('rediss://cache')).toMatchObject({ port: 6379, tls: {} });
  });

  it('dispatches to registered handlers and rejects unknown jobs', async () => {
    await expect(dispatch(QUEUES.maintenance, { name: 'heartbeat' } as Job)).resolves.toMatchObject({ ok: true });
    await expect(dispatch(QUEUES.maintenance, { name: 'nope' } as Job)).rejects.toThrow(/No handler/);
  });
});
