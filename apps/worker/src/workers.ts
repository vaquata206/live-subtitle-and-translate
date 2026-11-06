import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';

/** Queue names shared with producers (web/realtime). */
export const QUEUES = {
  maintenance: 'maintenance',
  translate: 'translate',
  email: 'email',
} as const;

export type JobHandler = (job: Job) => Promise<unknown>;

/** Job handlers by queue and job name. Phase 1 only has the maintenance heartbeat. */
export const handlers: Record<string, Record<string, JobHandler>> = {
  [QUEUES.maintenance]: {
    heartbeat: async () => ({ ok: true, at: new Date().toISOString() }),
  },
};

export function connectionFromUrl(url = process.env.REDIS_URL ?? 'redis://localhost:6379'): ConnectionOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ for blocking connections.
    maxRetriesPerRequest: null,
  };
}

export async function dispatch(queue: string, job: Job): Promise<unknown> {
  const handler = handlers[queue]?.[job.name];
  if (!handler) throw new Error(`No handler for ${queue}/${job.name}`);
  return handler(job);
}

export function startWorkers(connection: ConnectionOptions) {
  const workers = Object.keys(handlers).map(
    (queue) => new Worker(queue, (job) => dispatch(queue, job), { connection, concurrency: 4 }),
  );
  return {
    workers,
    async close() {
      await Promise.all(workers.map((w) => w.close()));
    },
  };
}

export async function scheduleRepeatables(connection: ConnectionOptions) {
  const maintenance = new Queue(QUEUES.maintenance, { connection });
  await maintenance.upsertJobScheduler('heartbeat', { every: 60_000 }, { name: 'heartbeat' });
  await maintenance.close();
}
