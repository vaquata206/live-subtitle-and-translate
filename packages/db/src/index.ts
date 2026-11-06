import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export { schema };
export * from './schema';

export type Database = ReturnType<typeof createDb>;

/** Server-only. Never import @lst/db from browser or extension code. */
export function createDb(url = process.env.DATABASE_URL, opts: { max?: number } = {}) {
  if (!url) throw new Error('DATABASE_URL is not set');
  const client = postgres(url, { max: opts.max ?? 10, prepare: false });
  return drizzle(client, { schema, casing: 'snake_case' });
}
