export interface FaqListProps {
  items: readonly { question: string; answer: string }[];
}

export function FaqList({ items }: FaqListProps) {
  return (
    <div className="grid gap-3">
      {items.map(({ question, answer }, index) => (
        <details
          key={`${question}-${index}`}
          className="group rounded-xl border bg-card px-5 py-4 text-card-foreground"
        >
          <summary className="cursor-pointer rounded-sm font-semibold text-foreground marker:text-primary focus-visible:outline-2 focus-visible:outline-ring">
            {question}
          </summary>
          <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">{answer}</p>
        </details>
      ))}
    </div>
  );
}
