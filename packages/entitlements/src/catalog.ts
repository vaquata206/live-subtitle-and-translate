/**
 * Feature catalog. Keys are defined in code (each one is enforced somewhere on the server);
 * admins only assign values to plans. Adding a feature = add it here + enforce it + test it.
 */
export type FeatureType = 'bool' | 'int' | 'list';

export interface FeatureDefinition<T extends FeatureType = FeatureType> {
  type: T;
  /** Value when neither the plan nor an override sets it. Must be the most restrictive value. */
  default: T extends 'bool' ? boolean : T extends 'int' ? number : string[];
  /** For int features with a usage counter: the reset period. */
  period?: 'month';
  description: string;
}

function bool(description: string): FeatureDefinition<'bool'> {
  return { type: 'bool', default: false, description };
}
function int(description: string, period?: 'month'): FeatureDefinition<'int'> {
  return { type: 'int', default: 0, description, period };
}
function list(description: string): FeatureDefinition<'list'> {
  return { type: 'list', default: [], description };
}

export const FEATURES = {
  'publish.live': bool('Phát cuộc họp lên web theo thời gian thực'),
  'share.pin_link': bool('Chia sẻ cuộc họp bằng link + mã PIN'),
  'viewer.max_concurrent': int('Số người xem đồng thời tối đa mỗi cuộc họp'),
  'viewer.translation_langs': int('Số ngôn ngữ dịch phía server cho người xem'),
  'meetings.live_concurrent': int('Số cuộc họp phát cùng lúc'),
  'history.retention_days': int('Số ngày lưu dữ liệu cuộc họp'),
  'history.search': bool('Tìm kiếm toàn văn trong lịch sử cuộc họp'),
  'export.docx': bool('Tải biên bản DOCX trên web'),
  'ai.managed_stt': bool('Server cấp token Deepgram tạm thời (không cần key riêng)'),
  'ai.managed_stt_minutes': int('Số phút STT managed mỗi tháng', 'month'),
  'ai.managed_llm': bool('Tóm tắt/biên bản bằng LLM của server'),
  'ai.managed_llm_tokens': int('Số token LLM managed mỗi tháng', 'month'),
  'ai.models': list('Các model LLM được phép dùng'),
  'minutes.templates_custom': bool('Mẫu biên bản tuỳ chỉnh'),
} as const satisfies Record<string, FeatureDefinition>;

export type FeatureKey = keyof typeof FEATURES;
export type FeatureValue<K extends FeatureKey> = (typeof FEATURES)[K]['default'] extends boolean
  ? boolean
  : (typeof FEATURES)[K]['default'] extends number
    ? number
    : string[];

export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

export function isFeatureKey(key: string): key is FeatureKey {
  return Object.hasOwn(FEATURES, key);
}

/** `-1` on an int feature means unlimited. */
export const UNLIMITED = -1;

/** Validates a raw (e.g. DB jsonb) value against the feature type; returns undefined if invalid. */
export function coerceFeatureValue(key: FeatureKey, value: unknown): boolean | number | string[] | undefined {
  switch (FEATURES[key].type) {
    case 'bool':
      return typeof value === 'boolean' ? value : undefined;
    case 'int':
      return typeof value === 'number' && Number.isInteger(value) && value >= UNLIMITED ? value : undefined;
    case 'list':
      return Array.isArray(value) && value.every((v) => typeof v === 'string') ? [...value] : undefined;
  }
}
