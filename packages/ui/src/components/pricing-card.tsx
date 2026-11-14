import { useId } from 'react';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { cn } from '../lib/cn';

export interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  period: string;
  features: readonly string[];
  highlighted?: boolean;
  cta: { label: string; href: string };
}

export function PricingCard({
  name,
  description,
  price,
  period,
  features,
  highlighted = false,
  cta,
}: PricingCardProps) {
  const titleId = useId();

  return (
    <article aria-labelledby={titleId} data-highlighted={highlighted || undefined} className="h-full">
      <Card className={cn('relative h-full', highlighted && 'border-primary shadow-md shadow-primary/10')}>
        {highlighted && (
          <Badge className="absolute top-4 right-4" variant="default">
            Được đề xuất
          </Badge>
        )}
        <CardHeader className={highlighted ? 'pr-32' : undefined}>
          <CardTitle id={titleId}>{name}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="mb-5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-4xl font-bold tracking-tight text-foreground">{price}</span>
            <span className="text-sm text-muted-foreground">/ {period}</span>
          </p>
          <ul className="grid list-inside list-disc gap-3 text-sm leading-relaxed marker:text-primary">
            {features.map((feature, index) => (
              <li key={`${feature}-${index}`}>{feature}</li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="mt-auto">
          <Button asChild className="w-full" variant={highlighted ? 'default' : 'outline'}>
            <a href={cta.href}>{cta.label}</a>
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}
