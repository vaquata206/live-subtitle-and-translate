import { estimateTokens } from '../summarize/Summarizer';
import { formatLine, type TranscriptLine } from './transcriptText';

/**
 * Splits transcript lines into chunks that fit `budget` tokens, breaking only
 * between speaker turns. Consecutive chunks share `overlap` lines for context.
 */
export function chunkLines(
  lines: TranscriptLine[],
  budget: number,
  overlap = 1,
  count: (text: string) => number = estimateTokens,
): TranscriptLine[][] {
  const chunks: TranscriptLine[][] = [];
  let current: TranscriptLine[] = [];
  let tokens = 0;
  let fresh = 0;
  for (const line of lines) {
    const t = count(formatLine(line)) + 1;
    if (fresh > 0 && tokens + t > budget) {
      chunks.push(current);
      const carry = overlap > 0 ? current.slice(-overlap) : [];
      current = [...carry];
      tokens = carry.reduce((sum, l) => sum + count(formatLine(l)) + 1, 0);
      fresh = 0;
      // Drop overlap if it would leave no room for the new line.
      if (tokens + t > budget) {
        current = [];
        tokens = 0;
      }
    }
    current.push(line);
    tokens += t;
    fresh++;
  }
  if (fresh > 0) chunks.push(current);
  return chunks;
}

/** Groups texts into batches whose combined size fits `budget`. */
export function groupByBudget(texts: string[], budget: number, count: (text: string) => number = estimateTokens): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  let tokens = 0;
  for (const text of texts) {
    const t = count(text) + 2;
    if (current.length && tokens + t > budget) {
      groups.push(current);
      current = [];
      tokens = 0;
    }
    current.push(text);
    tokens += t;
  }
  if (current.length) groups.push(current);
  return groups;
}

/** FNV-1a 32-bit hash, hex encoded. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
