import { cn } from '../lib/cn';

/** Decorative, original vector artwork; participant details live in the adjacent preview. */
export function MeetingIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 216"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('meeting-illustration', className)}
    >
      <rect width="640" height="216" rx="20" fill="var(--illustration-stage)" />
      <circle cx="578" cy="24" r="95" fill="var(--illustration-violet)" opacity=".3" />
      <path d="M0 184Q190 80 350 184T640 164" stroke="var(--illustration-cyan)" strokeWidth="2" opacity=".4" />
      <g transform="translate(20 20)">
        <rect width="190" height="154" rx="14" fill="var(--illustration-violet)" />
        <circle cx="150" cy="30" r="38" fill="var(--illustration-paper)" opacity=".15" />
        <path d="M39 154c0-38 22-57 56-57s56 19 56 57" fill="var(--illustration-ink)" />
        <path d="M83 94h24v25q-12 14-24 0" fill="var(--illustration-skin)" />
        <path d="M65 70q-4-43 30-43t30 43v14q-4 30-30 30T65 84" fill="var(--illustration-skin)" />
        <path d="M63 74q-17-48 24-53 40-6 44 31l-8 22-4-27q-29 17-49 5l-2 23" fill="var(--illustration-ink)" />
        <path
          d="M80 77h5m21 0h5m-24 17q8 6 16 0"
          stroke="var(--illustration-ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="12" y="130" width="36" height="12" rx="6" fill="var(--illustration-paper)" opacity=".5" />
      </g>
      <g transform="translate(225 20)">
        <rect width="190" height="154" rx="14" fill="var(--illustration-cyan)" />
        <path d="M0 111L95 0h55L20 154H0" fill="var(--illustration-paper)" opacity=".12" />
        <path d="M60 81q-8-60 35-60t35 60v57H60" fill="var(--illustration-ink)" />
        <path d="M34 154q4-51 61-51t61 51" fill="var(--illustration-paper)" />
        <path d="M83 91h24v23q-12 14-24 0" fill="var(--illustration-skin-deep)" />
        <path d="M68 58q9-22 29-20l24 26v18q-4 28-26 28T68 82" fill="var(--illustration-skin-deep)" />
        <path
          d="M79 76h5m22 0h5m-22 16q6 5 12 0"
          stroke="var(--illustration-ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="12" y="130" width="30" height="12" rx="6" fill="var(--illustration-ink)" opacity=".35" />
      </g>
      <g transform="translate(430 20)">
        <rect width="190" height="154" rx="14" fill="var(--illustration-peach)" />
        <circle cx="155" cy="136" r="65" fill="var(--illustration-paper)" opacity=".25" />
        <path d="M34 154q6-51 61-51t61 51" fill="var(--illustration-violet)" />
        <path d="M83 91h24v25q-12 13-24 0" fill="var(--illustration-skin)" />
        <path d="M66 58q0-30 29-30t29 30v24q-3 29-29 29T66 82" fill="var(--illustration-skin)" />
        <path
          d="M62 64q-10-24 9-33-2-16 20-14 17-10 28 8 19 1 11 31l-9 12-4-24q-13 13-43 3l-6 22"
          fill="var(--illustration-ink)"
        />
        <path
          d="M75 75h14m13 0h14m-27 0h13m-14 18q7 6 14 0"
          stroke="var(--illustration-ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M76 74v9h12v-9m15 0v9h12v-9" stroke="var(--illustration-ink)" strokeWidth="2" />
        <rect x="12" y="130" width="34" height="12" rx="6" fill="var(--illustration-ink)" opacity=".35" />
      </g>
      <g fill="var(--illustration-paper)" opacity=".8">
        <rect x="284" y="187" width="24" height="16" rx="8" />
        <rect x="314" y="187" width="24" height="16" rx="8" />
      </g>
      <rect x="344" y="187" width="24" height="16" rx="8" fill="var(--illustration-peach)" />
    </svg>
  );
}
