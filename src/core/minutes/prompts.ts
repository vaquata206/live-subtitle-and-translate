import type { MinutesTemplateId } from '../settings';

export interface MinutesTemplate {
  id: MinutesTemplateId;
  label: string;
  guidance: string;
}

export const MINUTES_TEMPLATES: MinutesTemplate[] = [
  {
    id: 'standard',
    label: 'Biên bản tiêu chuẩn',
    guidance:
      'Produce complete formal meeting minutes: an executive summary, the main discussion topics with key points, ' +
      'decisions made, action items, open questions and next steps.',
  },
  {
    id: 'brief',
    label: 'Tóm tắt ngắn',
    guidance:
      'Produce brief minutes: an executive summary of at most 3 sentences, at most 4 topics with at most 3 points each, ' +
      'and only clearly stated decisions and action items.',
  },
  {
    id: 'standup',
    label: 'Daily stand-up',
    guidance:
      'This is a daily stand-up. Create one topic per participant titled with their name; points cover what they did, ' +
      'what they plan to do next and any blockers (prefix blockers with "Blocker:"). Blockers that need follow-up go to open questions.',
  },
  {
    id: 'interview',
    label: 'Phỏng vấn / Trao đổi khách hàng',
    guidance:
      'This is an interview or customer conversation. Topics should capture requirements, pain points, feedback and ' +
      'answers given. Decisions are agreements reached; action items are follow-ups promised by either side.',
  },
  {
    id: 'lecture',
    label: 'Bài giảng / Video',
    guidance:
      'This is a lecture, webinar or video. The summary describes what the content is about. Topics are the main ' +
      'sections with key ideas, definitions and examples. Decisions and action items are usually empty; next steps may ' +
      'list recommended further study if mentioned.',
  },
];

export function templateById(id: string): MinutesTemplate {
  return MINUTES_TEMPLATES.find((t) => t.id === id) ?? MINUTES_TEMPLATES[0];
}

const refsSchema = { type: 'array', items: { type: 'string' } };

/** JSON Schema compatible with OpenAI strict structured outputs and Chrome's responseConstraint. */
export const MINUTES_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'participants', 'summary', 'topics', 'decisions', 'actionItems', 'openQuestions', 'nextSteps'],
  properties: {
    title: { type: 'string' },
    participants: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    topics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'points', 'refs'],
        properties: { title: { type: 'string' }, points: { type: 'array', items: { type: 'string' } }, refs: refsSchema },
      },
    },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'refs'],
        properties: { text: { type: 'string' }, refs: refsSchema },
      },
    },
    actionItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['task', 'owner', 'due', 'refs'],
        properties: { task: { type: 'string' }, owner: { type: 'string' }, due: { type: 'string' }, refs: refsSchema },
      },
    },
    openQuestions: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } },
  },
};

const TRANSCRIPT_CAVEAT =
  'The input is an automatic speech-to-text transcript: it may contain recognition errors, may mix languages, and ' +
  'speaker labels come from automatic diarization and can be wrong. Each line starts with a [m:ss] timestamp.';

const GROUNDING =
  'Only use information present in the input. Never invent facts, names, owners or deadlines: use an empty string ' +
  'for an unknown owner or due date. Merge duplicates and drop small talk.';

export function minutesSystemPrompt(templateId: string, languageName: string, extraInstructions?: string): string {
  const t = templateById(templateId);
  return [
    'You are an expert meeting secretary.',
    TRANSCRIPT_CAVEAT,
    t.guidance,
    GROUNDING,
    'For "refs", list 1-3 timestamps exactly as they appear in the input (format m:ss or h:mm:ss) where the item is discussed.',
    `Write every text value in ${languageName}. Keep participant names as given.`,
    'Respond with a single JSON object with keys: title, participants, summary, topics[{title, points[], refs[]}], ' +
      'decisions[{text, refs[]}], actionItems[{task, owner, due, refs[]}], openQuestions[], nextSteps[]. No Markdown.',
    extraInstructions?.trim() ? `Additional instructions from the user: ${extraInstructions.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export interface MinutesContext {
  title: string;
  date: string;
  durationMinutes: number;
  participants: string[];
}

export function minutesUserPrompt(ctx: MinutesContext, body: string, isNotes: boolean): string {
  return [
    `Meeting title (from the browser tab, may be generic): ${ctx.title}`,
    `Date: ${ctx.date}`,
    `Duration: ${ctx.durationMinutes} minutes`,
    `Speakers: ${ctx.participants.join(', ') || 'unknown'}`,
    '',
    isNotes ? 'Notes extracted from consecutive parts of the meeting, in order:' : 'Transcript:',
    body,
  ].join('\n');
}

export function notesSystemPrompt(templateId: string): string {
  return [
    'You are an expert meeting secretary taking notes on one part of a longer meeting.',
    TRANSCRIPT_CAVEAT,
    `The final minutes will follow this brief: ${templateById(templateId).guidance}`,
    GROUNDING,
    'Write concise English bullet notes ("- ") covering topics and key points, decisions (prefix "DECISION:"), ' +
      'action items (prefix "ACTION:" with owner and due date if stated) and open questions (prefix "QUESTION:"). ' +
      'End every bullet with the most relevant timestamp in brackets, e.g. [12:34]. Output only the bullets.',
  ].join('\n');
}

export function mergeNotesSystemPrompt(): string {
  return [
    'Merge the following meeting notes from consecutive parts of a meeting into one shorter list of bullet notes.',
    'Keep every DECISION:, ACTION: and QUESTION: item, merge duplicates, keep the [m:ss] timestamps, keep English, ' +
      'and output only "- " bullets.',
  ].join('\n');
}

export function liveSummarySystemPrompt(languageName: string): string {
  return [
    'You maintain a running summary of a live meeting for someone who joins late.',
    TRANSCRIPT_CAVEAT,
    'You receive the current summary (possibly empty) and the newest part of the transcript. Return the updated summary: ' +
      'at most 8 short "- " bullets covering the main topics, decisions and action items so far, most important first. ' +
      'Drop timestamps. Only use information from the input.',
    `Write in ${languageName}. Output only the bullets.`,
  ].join('\n');
}

export function liveSummaryUserPrompt(current: string, newTranscript: string): string {
  return `Current summary:\n${current.trim() || '(empty)'}\n\nNew transcript:\n${newTranscript}`;
}
