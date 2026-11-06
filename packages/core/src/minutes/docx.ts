import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from 'docx';
import { speakerLabel } from '../transcript/session';
import type { MeetingMinutes, Session } from '../types';
import { minutesLabels, type MinutesLabels } from './labels';
import { formatTimestamp } from './transcriptText';

export interface DocxOptions {
  language: string;
  /** Append the full transcript as an appendix. */
  includeTranscript?: boolean;
  /** Session used for the source URL and transcript appendix. */
  session?: Pick<Session, 'segments' | 'speakerNames' | 'url'>;
  /** Show [m:ss] transcript references next to items. */
  includeRefs?: boolean;
}

const FONT = 'Arial';
const ACCENT = '1F4E79';
const MUTED = '6B7280';
const NUMBERING_REF = 'minutes-numbered';

function refRuns(refs: number[], show: boolean): ParagraphChild[] {
  if (!show || !refs.length) return [];
  return [new TextRun({ text: `  [${refs.map(formatTimestamp).join(', ')}]`, color: MUTED, size: 18 })];
}

function heading(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 } });
}

function bullet(children: ParagraphChild[], level = 0): Paragraph {
  return new Paragraph({ children, bullet: { level }, spacing: { after: 60 } });
}

function bulletList(items: string[], L: MinutesLabels): Paragraph[] {
  if (!items.length) return [new Paragraph({ children: [new TextRun({ text: L.none, italics: true, color: MUTED })] })];
  return items.map((t) => bullet([new TextRun(t)]));
}

function cell(text: string, opts: { header?: boolean; width: number; center?: boolean }): TableCell {
  return new TableCell({
    width: { size: opts.width, type: WidthType.PERCENTAGE },
    shading: opts.header ? { type: ShadingType.CLEAR, color: 'auto', fill: 'DCE6F1' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.header })],
      }),
    ],
  });
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const TABLE_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
  insideHorizontal: BORDER,
  insideVertical: BORDER,
};

function infoTable(m: MeetingMinutes, L: MinutesLabels, locale: string, url?: string): Table {
  const d = new Date(m.date);
  const rows: Array<[string, string]> = [
    [L.date, d.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })],
    [L.time, d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })],
    [L.duration, `${m.durationMinutes} ${L.minutes}`],
    [L.participants, m.participants.join(', ') || L.none],
  ];
  if (url) rows.push([L.source, url]);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: rows.map(
      ([k, v]) => new TableRow({ children: [cell(k, { header: true, width: 28 }), cell(v, { width: 72 })] }),
    ),
  });
}

function actionTable(m: MeetingMinutes, L: MinutesLabels, showRefs: boolean): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell(L.no, { header: true, width: 8, center: true }),
      cell(L.task, { header: true, width: 52 }),
      cell(L.owner, { header: true, width: 22 }),
      cell(L.due, { header: true, width: 18 }),
    ],
  });
  const rows = m.actionItems.map(
    (a, i) =>
      new TableRow({
        children: [
          cell(String(i + 1), { width: 8, center: true }),
          new TableCell({
            width: { size: 52, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun(a.task), ...refRuns(a.refs, showRefs)] })],
          }),
          cell(a.owner, { width: 22 }),
          cell(a.due, { width: 18 }),
        ],
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [header, ...rows],
  });
}

/** Builds the default minutes layout. A company template can replace this function later. */
export function buildMinutesDocument(m: MeetingMinutes, opts: DocxOptions): Document {
  const L = minutesLabels(opts.language);
  const showRefs = opts.includeRefs ?? true;
  const locale = opts.language.toLowerCase().startsWith('vi') ? 'vi-VN' : opts.language;
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: L.docTitle, bold: true, size: 32, color: ACCENT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: m.title, bold: true, size: 26 })],
    }),
    infoTable(m, L, locale, opts.session?.url),
    heading(`1. ${L.summary}`),
    ...(m.summary
      ? m.summary
          .split(/\n+/)
          .map((p) => new Paragraph({ text: p, spacing: { after: 100 }, alignment: AlignmentType.JUSTIFIED }))
      : bulletList([], L)),
    heading(`2. ${L.topics}`),
  ];

  if (!m.topics.length) children.push(...bulletList([], L));
  m.topics.forEach((t, i) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 160, after: 80 },
        children: [new TextRun(`2.${i + 1}. ${t.title}`), ...refRuns(t.refs, showRefs)],
      }),
    );
    t.points.forEach((p) => children.push(bullet([new TextRun(p)])));
  });

  children.push(heading(`3. ${L.decisions}`));
  if (!m.decisions.length) children.push(...bulletList([], L));
  m.decisions.forEach((d) =>
    children.push(
      new Paragraph({
        numbering: { reference: NUMBERING_REF, level: 0 },
        spacing: { after: 60 },
        children: [new TextRun(d.text), ...refRuns(d.refs, showRefs)],
      }),
    ),
  );

  children.push(heading(`4. ${L.actionItems}`));
  children.push(m.actionItems.length ? actionTable(m, L, showRefs) : bulletList([], L)[0]);

  children.push(heading(`5. ${L.openQuestions}`), ...bulletList(m.openQuestions, L));
  children.push(heading(`6. ${L.nextSteps}`), ...bulletList(m.nextSteps, L));

  children.push(
    new Paragraph({
      spacing: { before: 360 },
      children: [new TextRun({ text: L.generatedBy, italics: true, color: MUTED, size: 18 })],
    }),
  );

  if (opts.includeTranscript && opts.session?.segments.length) {
    children.push(new Paragraph({ text: L.transcript, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    for (const seg of opts.session.segments) {
      const who = speakerLabel(opts.session, seg.speaker);
      const runs: ParagraphChild[] = [
        new TextRun({ text: `[${formatTimestamp(seg.start)}] `, color: MUTED }),
        ...(who ? [new TextRun({ text: `${who}: `, bold: true })] : []),
        new TextRun(seg.text),
      ];
      if (seg.translation && seg.translation !== seg.text) {
        runs.push(new TextRun({ text: seg.translation, break: 1, color: '1D4ED8' }));
      }
      children.push(new Paragraph({ children: runs, spacing: { after: 80 } }));
    }
  }

  return new Document({
    creator: 'Meeting Live Subtitles',
    title: m.title,
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: 26, bold: true, color: ACCENT },
          paragraph: { spacing: { before: 280, after: 120 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: 23, bold: true },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: NUMBERING_REF,
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }],
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1418, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [`${L.page} `, PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
                    color: MUTED,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

export function minutesDocxBlob(m: MeetingMinutes, opts: DocxOptions): Promise<Blob> {
  return Packer.toBlob(buildMinutesDocument(m, opts));
}

export function minutesDocxFileName(m: MeetingMinutes): string {
  const d = new Date(m.date);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const safe =
    m.title
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) || 'meeting';
  return `Bien ban - ${safe} - ${stamp}.docx`;
}

/** Triggers a browser download of the minutes as DOCX. */
export async function downloadMinutesDocx(m: MeetingMinutes, opts: DocxOptions): Promise<void> {
  const blob = await minutesDocxBlob(m, opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = minutesDocxFileName(m);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
