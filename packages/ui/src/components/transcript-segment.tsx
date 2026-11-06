import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

const SPEAKER_HUES = [262, 330, 155, 40, 290, 200, 85, 10];

export interface TranscriptSegmentProps extends ComponentProps<'article'> {
  speaker?: string | null;
  speakerIndex?: number | null;
  time?: string;
  text: string;
  translation?: string | null;
  /** BCP-47 code of the translation, for screen readers and hyphenation. */
  translationLang?: string;
  /** `bilingual` shows both; `translation` shows only the translation (falls back to original). */
  mode?: 'bilingual' | 'original' | 'translation';
  /** Same speaker as the previous segment: hide the header. */
  continued?: boolean;
}

/** One caption line with optional speaker, time and translation. Used by the live viewer and transcript pages. */
export function TranscriptSegment({
  speaker,
  speakerIndex,
  time,
  text,
  translation,
  translationLang,
  mode = 'bilingual',
  continued = false,
  className,
  ...props
}: TranscriptSegmentProps) {
  const hue = speakerIndex == null ? null : SPEAKER_HUES[speakerIndex % SPEAKER_HUES.length];
  const showOriginal = mode !== 'translation' || !translation;
  const showTranslation = mode !== 'original' && !!translation && translation !== text;
  return (
    <article
      data-slot="transcript-segment"
      className={cn('py-1.5', !continued && 'border-t border-dashed pt-3 first:border-t-0', className)}
      {...props}
    >
      {!continued && (speaker || time) && (
        <header className="mb-0.5 flex items-baseline gap-2 text-xs">
          {speaker && (
            <span className="font-semibold" style={hue == null ? undefined : { color: `oklch(0.55 0.17 ${hue})` }}>
              {speaker}
            </span>
          )}
          {time && <time className="font-mono text-muted-foreground tabular-nums">{time}</time>}
        </header>
      )}
      {showOriginal && <p className="leading-relaxed text-pretty">{text}</p>}
      {showTranslation && (
        <p lang={translationLang} className="leading-relaxed text-pretty text-translation">
          {translation}
        </p>
      )}
    </article>
  );
}
