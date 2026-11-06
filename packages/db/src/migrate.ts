import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import { FEATURES, FEATURE_KEYS } from '@lst/entitlements';
import { createDb } from './index';
import { features, planFeatures, plans } from './schema';

/** Applies extensions, generated migrations, syncs the feature catalog and seeds the default plan. */
async function main() {
  const db = createDb(process.env.DATABASE_URL, { max: 1 });
  await db.execute(sql.raw(readFileSync(resolve(import.meta.dirname, '../sql/000_extensions.sql'), 'utf8')));
  await migrate(db, { migrationsFolder: resolve(import.meta.dirname, '../drizzle') });

  for (const key of FEATURE_KEYS) {
    const def = FEATURES[key];
    await db
      .insert(features)
      .values({ key, type: def.type, defaultValue: def.default, description: def.description })
      .onConflictDoUpdate({
        target: features.key,
        set: { type: def.type, defaultValue: def.default, description: def.description },
      });
  }

  const [free] = await db
    .insert(plans)
    .values({ code: 'free', name: 'Free', isDefault: true, sortOrder: 0, priceLabel: '0đ' })
    .onConflictDoNothing({ target: plans.code })
    .returning();
  if (free) {
    const defaults: Record<string, unknown> = {
      'share.pin_link': true,
      'viewer.max_concurrent': 10,
      'viewer.translation_langs': 1,
      'meetings.live_concurrent': 1,
      'history.retention_days': 30,
      'history.search': true,
      'export.docx': true,
    };
    await db
      .insert(planFeatures)
      .values(Object.entries(defaults).map(([featureKey, value]) => ({ planId: free.id, featureKey, value })));
  }
  console.info('Database migrated; feature catalog synced.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
