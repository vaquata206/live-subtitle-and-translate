import { describe, expect, it } from 'vitest';
import {
  allowsValue,
  EntitlementError,
  FEATURE_KEYS,
  FEATURES,
  hasFeature,
  remaining,
  requireFeature,
  requireQuota,
  resolveEntitlements,
  UNLIMITED,
} from '../src';

const free = { code: 'free', features: { 'share.pin_link': true, 'viewer.max_concurrent': 5 } };
const pro = {
  code: 'pro',
  features: {
    'publish.live': true,
    'ai.managed_stt': true,
    'ai.managed_stt_minutes': 600,
    'ai.managed_llm_tokens': UNLIMITED,
    'ai.models': ['gpt-4o-mini'],
  },
};

describe('catalog', () => {
  it('defaults are the most restrictive values', () => {
    for (const key of FEATURE_KEYS) {
      const d = FEATURES[key].default;
      expect(d === false || d === 0 || (Array.isArray(d) && d.length === 0), key).toBe(true);
    }
  });
});

describe('resolveEntitlements', () => {
  it('applies plan values over defaults', () => {
    const e = resolveEntitlements(free);
    expect(hasFeature(e, 'share.pin_link')).toBe(true);
    expect(hasFeature(e, 'publish.live')).toBe(false);
    expect(e.values['viewer.max_concurrent']).toBe(5);
    expect(e.values['ai.models']).toEqual([]);
  });

  it('ignores unknown keys and invalid values', () => {
    const e = resolveEntitlements({
      code: 'x',
      features: { 'publish.live': 'yes', 'viewer.max_concurrent': -5, 'ai.models': [1], hacker: true },
    });
    expect(e.values['publish.live']).toBe(false);
    expect(e.values['viewer.max_concurrent']).toBe(0);
    expect(e.values['ai.models']).toEqual([]);
    expect('hacker' in e.values).toBe(false);
  });

  it('applies only unexpired overrides', () => {
    const now = 1_000_000;
    const e = resolveEntitlements(
      free,
      [
        { feature: 'publish.live', value: true, expiresAt: now + 1 },
        { feature: 'export.docx', value: true, expiresAt: now - 1 },
        { feature: 'viewer.max_concurrent', value: 50, expiresAt: null },
      ],
      {},
      now,
    );
    expect(hasFeature(e, 'publish.live')).toBe(true);
    expect(hasFeature(e, 'export.docx')).toBe(false);
    expect(e.values['viewer.max_concurrent']).toBe(50);
  });
});

describe('guards', () => {
  it('requireFeature throws for features outside the plan', () => {
    const e = resolveEntitlements(free);
    expect(() => requireFeature(e, 'publish.live')).toThrow(EntitlementError);
    expect(() => requireFeature(resolveEntitlements(pro), 'publish.live')).not.toThrow();
  });

  it('computes remaining quota including unlimited', () => {
    const e = resolveEntitlements(pro, [], { 'ai.managed_stt_minutes': 590 });
    expect(remaining(e, 'ai.managed_stt_minutes')).toBe(10);
    expect(() => requireQuota(e, 'ai.managed_stt_minutes', 11)).toThrow(/hạn mức/);
    expect(remaining(e, 'ai.managed_llm_tokens')).toBe(Infinity);
  });

  it('checks list membership with wildcard', () => {
    expect(allowsValue(resolveEntitlements(pro), 'ai.models', 'gpt-4o-mini')).toBe(true);
    expect(allowsValue(resolveEntitlements(pro), 'ai.models', 'gpt-4o')).toBe(false);
    const all = resolveEntitlements({ code: 'ent', features: { 'ai.models': ['*'] } });
    expect(allowsValue(all, 'ai.models', 'anything')).toBe(true);
  });
});
