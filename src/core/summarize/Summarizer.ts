export interface GenerateRequest {
  system: string;
  prompt: string;
  /** JSON Schema for structured output. When set, the provider returns a JSON string. */
  schema?: Record<string, unknown>;
  signal?: AbortSignal;
}

/** A text-generation backend used for summaries and meeting minutes. */
export interface Summarizer {
  readonly id: string;
  readonly model: string;
  /** Whether output quality in this language is supported; otherwise callers generate English and translate. */
  supportsOutputLanguage(lang: string): boolean;
  /** Token budget for transcript text per request (excluding instructions). */
  inputBudget(): Promise<number>;
  /** Max parallel requests for map steps. */
  readonly concurrency: number;
  generate(req: GenerateRequest): Promise<string>;
  /** Where transcript data is sent, for privacy notices (undefined = on device / local). */
  readonly remoteHost?: string;
}

/** Rough multilingual token estimate (Vietnamese/CJK tokenise denser than English). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

/** Extracts a JSON object from model output that may be wrapped in Markdown fences or prose. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // fall through
    }
  }
  throw new Error('Mô hình không trả về JSON hợp lệ');
}
