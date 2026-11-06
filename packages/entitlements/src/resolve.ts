import {
  coerceFeatureValue,
  FEATURE_KEYS,
  FEATURES,
  isFeatureKey,
  UNLIMITED,
  type FeatureKey,
  type FeatureValue,
} from './catalog';

export interface PlanInput {
  code: string;
  /** Raw feature values assigned to the plan (from `plan_features`). Unknown keys are ignored. */
  features: Record<string, unknown>;
}

export interface OverrideInput {
  feature: string;
  value: unknown;
  /** Epoch ms; expired overrides are ignored. */
  expiresAt?: number | null;
}

export interface Entitlements {
  plan: string;
  values: { [K in FeatureKey]: FeatureValue<K> };
  /** Usage in the current period for metered int features. */
  usage: Partial<Record<FeatureKey, number>>;
}

/**
 * Effective entitlements = catalog defaults ⊕ plan values ⊕ unexpired user overrides.
 * Invalid values are ignored so a bad admin edit can never grant more than the default.
 */
export function resolveEntitlements(
  plan: PlanInput,
  overrides: OverrideInput[] = [],
  usage: Partial<Record<string, number>> = {},
  now: number = Date.now(),
): Entitlements {
  const values = {} as Record<FeatureKey, boolean | number | string[]>;
  for (const key of FEATURE_KEYS) {
    const def = FEATURES[key].default;
    values[key] = Array.isArray(def) ? [...def] : def;
    const fromPlan = coerceFeatureValue(key, plan.features[key]);
    if (fromPlan !== undefined) values[key] = fromPlan;
  }
  for (const o of overrides) {
    if (!isFeatureKey(o.feature) || (o.expiresAt != null && o.expiresAt <= now)) continue;
    const v = coerceFeatureValue(o.feature, o.value);
    if (v !== undefined) values[o.feature] = v;
  }
  const cleanUsage: Partial<Record<FeatureKey, number>> = {};
  for (const [k, v] of Object.entries(usage)) if (isFeatureKey(k) && typeof v === 'number') cleanUsage[k] = v;
  return { plan: plan.code, values: values as Entitlements['values'], usage: cleanUsage };
}

export function hasFeature(e: Entitlements, key: FeatureKey): boolean {
  const v = e.values[key];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return v.length > 0;
}

export function limitOf(e: Entitlements, key: FeatureKey): number {
  const v = e.values[key];
  if (typeof v !== 'number') throw new Error(`${key} is not a numeric feature`);
  return v;
}

/** Remaining quota for a metered feature; `Infinity` when unlimited. */
export function remaining(e: Entitlements, key: FeatureKey): number {
  const limit = limitOf(e, key);
  if (limit === UNLIMITED) return Infinity;
  return Math.max(0, limit - (e.usage[key] ?? 0));
}

export function allowsValue(e: Entitlements, key: FeatureKey, value: string): boolean {
  const v = e.values[key];
  if (!Array.isArray(v)) throw new Error(`${key} is not a list feature`);
  return v.includes('*') || v.includes(value);
}

export class EntitlementError extends Error {
  constructor(
    readonly feature: FeatureKey,
    readonly reason: 'not_in_plan' | 'quota_exceeded' | 'value_not_allowed',
  ) {
    super(
      reason === 'not_in_plan'
        ? `Gói hiện tại chưa có tính năng ${feature}`
        : reason === 'quota_exceeded'
          ? `Đã dùng hết hạn mức ${feature}`
          : `Giá trị không được phép cho ${feature}`,
    );
    this.name = 'EntitlementError';
  }
}

/** Throws EntitlementError unless the feature is enabled. Server-side guard; never trust the client. */
export function requireFeature(e: Entitlements, key: FeatureKey): void {
  if (!hasFeature(e, key)) throw new EntitlementError(key, 'not_in_plan');
}

/** Throws unless `amount` fits in the remaining quota. The caller records the usage atomically afterwards. */
export function requireQuota(e: Entitlements, key: FeatureKey, amount: number): void {
  if (remaining(e, key) < amount) throw new EntitlementError(key, 'quota_exceeded');
}
