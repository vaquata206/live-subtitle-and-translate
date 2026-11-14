'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Button } from './button';

export interface MarketingNavigationProps {
  brand: string;
  links: readonly { href: string; label: string }[];
  action: { href: string; label: string };
}

export function MarketingNavigation({ brand, links, action }: MarketingNavigationProps) {
  const disclosureRef = useRef<HTMLDetailsElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && disclosureRef.current?.open) {
      disclosureRef.current.open = false;
      disclosureRef.current.querySelector('summary')?.focus();
    }
  }

  function closeDisclosure() {
    if (disclosureRef.current) disclosureRef.current.open = false;
  }

  return (
    <header className="border-b bg-background">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
      >
        <a href="/" className="rounded-sm text-lg font-bold tracking-tight text-foreground focus-visible:outline-2">
          {brand}
        </a>

        <div className="flex items-center gap-3">
          <ul className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label }) => (
              <li key={`${href}-${label}`}>
                <a
                  href={href}
                  className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <details ref={disclosureRef} className="group relative md:hidden">
            <summary
              onKeyDown={handleKeyDown}
              className="list-none rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
            >
              Mục lục
            </summary>
            <ul className="absolute top-full right-0 z-10 hidden min-w-48 flex-col gap-1 rounded-lg border bg-card p-2 text-card-foreground shadow-md group-open:flex">
              {links.map(({ href, label }) => (
                <li key={`${href}-${label}`}>
                  <a
                    href={href}
                    onClick={closeDisclosure}
                    onKeyDown={handleKeyDown}
                    className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <Button asChild size="sm">
            <a href={action.href}>{action.label}</a>
          </Button>
        </div>
      </nav>
    </header>
  );
}
