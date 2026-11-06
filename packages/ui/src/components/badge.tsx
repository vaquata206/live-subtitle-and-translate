import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-success/15 text-success',
        live: 'border-transparent bg-live/12 text-live',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** "LIVE" indicator with a pulsing dot; pulse is disabled for users who prefer reduced motion. */
export function LiveBadge({ label = 'LIVE', className }: { label?: string; className?: string }) {
  return (
    <Badge variant="live" className={cn('font-semibold tracking-wide', className)}>
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-live motion-safe:animate-[live-pulse_1.4s_ease-in-out_infinite]"
      />
      {label}
    </Badge>
  );
}
