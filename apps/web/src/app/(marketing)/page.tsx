import { Badge } from '@lst/ui/components/badge';
import { Button } from '@lst/ui/components/button';
import { FaqList } from '@lst/ui/components/faq-list';
import { MarketingNavigation } from '@lst/ui/components/marketing-navigation';
import { PricingCard } from '@lst/ui/components/pricing-card';
import { ProductPreview } from '@lst/ui/components/product-preview';
import { AudioLines, Captions, FileText, Languages, MonitorPlay, Play, Share2, Sparkles, Users } from 'lucide-react';
import {
  demoPlans,
  faqs,
  features,
  landingCopy,
  marketing,
  navigation,
  steps,
  useCases,
  type DemoPlan,
} from '@/lib/marketing';

const featureIcons = [Captions, Languages, Sparkles, FileText];
const useCaseIcons = [Users, MonitorPlay, FileText];

function PricingSection({ plans }: { plans: readonly DemoPlan[] }) {
  return (
    <section id="goi-cuoc" aria-labelledby="pricing-title" className="landing-section landing-container">
      <div className="landing-section-heading">
        <h2 id="pricing-title">{landingCopy.pricingTitle}</h2>
        <p>{landingCopy.pricingDescription}</p>
      </div>
      <p className="landing-pricing-disclaimer">{marketing.pricingDisclaimer}</p>
      <div className="landing-pricing-grid">
        {plans.map(({ id, period, ...plan }) => (
          <PricingCard key={id} {...plan} period={period.replace(/^\/\s*/, '')} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="landing-page">
      <a href="#main-content" className="landing-skip-link">
        {landingCopy.skipLink}
      </a>
      <MarketingNavigation
        brand={marketing.brand}
        links={navigation}
        action={{ href: marketing.primaryCta.href, label: landingCopy.navigationCta }}
      />

      <main id="main-content" tabIndex={-1}>
        <div className="landing-hero-backdrop">
          <section aria-labelledby="hero-title" className="landing-hero landing-container">
            <div className="landing-hero-copy">
              <p className="landing-tagline">
                <AudioLines aria-hidden="true" />
                {marketing.tagline}
              </p>
              <h1 id="hero-title">{marketing.headline}</h1>
              <p className="landing-hero-description">{marketing.description}</p>
              <div className="landing-actions">
                <Button asChild size="lg">
                  <a href={marketing.primaryCta.href}>{marketing.primaryCta.label}</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={marketing.secondaryCta.href}>
                    <Play aria-hidden="true" data-icon="inline-start" />
                    {marketing.secondaryCta.label}
                  </a>
                </Button>
              </div>
            </div>
            <section id="trai-nghiem" aria-labelledby="preview-title" className="landing-preview">
              <h2 id="preview-title" className="sr-only">
                {landingCopy.previewTitle}
              </h2>
              <figure>
                <ProductPreview />
                <figcaption>{landingCopy.previewCaption}</figcaption>
              </figure>
              <p className="landing-preview-note">{marketing.previewDisclaimer}</p>
            </section>
          </section>
        </div>

        <section aria-labelledby="use-cases-title" className="landing-use-cases landing-container">
          <h2 id="use-cases-title">{landingCopy.useCasesTitle}</h2>
          <ul className="landing-use-case-list">
            {useCases.map(({ id, title, description }, index) => {
              const Icon = useCaseIcons[index];
              return (
                <li key={id}>
                  {Icon ? <Icon aria-hidden="true" className="landing-use-case-icon" /> : null}
                  <h3>{title}</h3>
                  <p>{description}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          id="tinh-nang"
          aria-labelledby="features-title"
          className="landing-section landing-container landing-features"
        >
          <div className="landing-section-heading">
            <h2 id="features-title">{landingCopy.featuresTitle}</h2>
            <p>{landingCopy.featuresDescription}</p>
            <div className="landing-language-art" aria-hidden="true">
              <span>
                <AudioLines />
              </span>
              <span>EN</span>
              <Languages />
              <span>VI</span>
              <span>
                <FileText />
              </span>
            </div>
          </div>
          <dl className="landing-feature-list">
            {features.map(({ id, title, description }, index) => {
              const Icon = featureIcons[index];
              return (
                <div key={id}>
                  <dt>
                    {Icon ? <Icon aria-hidden="true" className="landing-feature-icon" /> : null}
                    {title}
                  </dt>
                  <dd>{description}</dd>
                </div>
              );
            })}
          </dl>
        </section>

        <section id="cach-dung" aria-labelledby="workflow-title" className="landing-workflow">
          <div className="landing-container landing-section">
            <div className="landing-section-heading">
              <h2 id="workflow-title">{landingCopy.workflowTitle}</h2>
              <p>{landingCopy.workflowDescription}</p>
            </div>
            <ol className="landing-step-list">
              {steps.map(({ id, title, description }, index) => (
                <li key={id}>
                  <span className="landing-step-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3>{title}</h3>
                  <p>{id === 'listen' ? landingCopy.workflowCaptureNote : description}</p>
                </li>
              ))}
            </ol>
            <p className="landing-privacy-note">{marketing.privacyNote}</p>
          </div>
        </section>

        <aside aria-labelledby="roadmap-title" className="landing-roadmap landing-container">
          <Share2 className="landing-roadmap-icon" aria-hidden="true" />
          <Badge variant="secondary">{landingCopy.roadmapBadge}</Badge>
          <div>
            <h2 id="roadmap-title">{landingCopy.roadmapTitle}</h2>
            <p>{marketing.roadmapNote}</p>
          </div>
        </aside>

        <PricingSection plans={demoPlans} />

        <section id="cau-hoi" aria-labelledby="faq-title" className="landing-section landing-container landing-faq">
          <div className="landing-section-heading">
            <h2 id="faq-title">{landingCopy.faqTitle}</h2>
            <p>{landingCopy.faqDescription}</p>
          </div>
          <FaqList items={faqs} />
        </section>

        <section id="cai-dat" aria-labelledby="installation-title" className="landing-install">
          <div className="landing-container landing-section">
            <div className="landing-section-heading">
              <h2 id="installation-title">{marketing.installation.title}</h2>
              <p>{marketing.installation.description}</p>
            </div>
            <div className="landing-install-layout">
              <div className="landing-install-intro">
                <p>{landingCopy.installationRequirements}</p>
                <a className="landing-text-link" href={marketing.repositoryHref}>
                  {landingCopy.repositoryLabel}
                </a>
                <a className="landing-text-link" href={`${marketing.repositoryHref}#bắt-đầu`}>
                  {landingCopy.readmeLabel}
                </a>
              </div>
              <ol className="landing-install-steps">
                {landingCopy.installSteps.map(({ title, description }, index) => (
                  <li key={title}>
                    <h3>{title}</h3>
                    <p>{description}</p>
                    {index === 0 ? (
                      <pre className="landing-command">
                        <code>{landingCopy.buildCommands}</code>
                      </pre>
                    ) : null}
                    {index === 1 ? (
                      <p className="landing-address">
                        <code>{landingCopy.extensionsAddress}</code>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="final-title" className="landing-final landing-container">
          <div>
            <h2 id="final-title">{landingCopy.finalTitle}</h2>
            <p>{landingCopy.finalDescription}</p>
          </div>
          <Button asChild size="lg">
            <a href={marketing.primaryCta.href}>{marketing.primaryCta.label}</a>
          </Button>
        </section>
      </main>

      <footer className="landing-footer landing-container">
        <div>
          <p className="landing-brand">{marketing.brand}</p>
          <p>{landingCopy.footerNote}</p>
        </div>
        <a className="landing-text-link" href={marketing.repositoryHref}>
          {landingCopy.repositoryLabel}
        </a>
      </footer>
    </div>
  );
}
