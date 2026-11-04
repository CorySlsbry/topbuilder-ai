// =============================================================================
// JSON-LD structured data (schema.org) — the GEO "multiplier" layer.
// =============================================================================
// One @graph covering Organization/ProfessionalService (with NAP + founder +
// parentOrganization), WebSite, the Service + offers, and FAQPage. Built from
// lib/site-facts so the entity data is identical across JSON-LD, llms.txt, and
// the MCP server. Rendered server-side as a single <script type=ld+json>.
// =============================================================================

import { SITE, FAQ } from '@/lib/site-facts';

// Canonical cross-site entity IDs. The Person @id is IDENTICAL on all three of
// Cory's properties (salisburybookkeeping.com, topbuilderai.com, neuron-hq.com)
// so AI answer engines resolve them to one founder entity.
const PERSON_ID = 'https://salisburybookkeeping.com/#cory-salisbury';
const SALISBURY_ORG_ID = 'https://salisburybookkeeping.com/#organization';
const NEURON_ORG_ID = 'https://neuron-hq.com/#organization';

// `faqLimit` keeps the FAQPage markup 1:1 with the questions actually visible on
// the page that renders this component (the full set is marked up on /faq).
export function StructuredData({ faqLimit }: { faqLimit?: number } = {}) {
  const faq = faqLimit ? FAQ.slice(0, faqLimit) : FAQ;
  const orgId = `${SITE.url}/#organization`;
  const graph = [
    {
      '@type': ['Organization', 'ProfessionalService'],
      '@id': orgId,
      name: SITE.brand,
      legalName: SITE.legalName,
      url: SITE.url,
      logo: `${SITE.url}/logo.svg`,
      image: `${SITE.url}/logo.svg`,
      description: SITE.summary,
      telephone: SITE.phoneDisplay,
      email: SITE.email,
      priceRange: '$8,000 install + from $500/mo',
      address: {
        '@type': 'PostalAddress',
        streetAddress: SITE.address.street,
        addressLocality: SITE.address.city,
        addressRegion: SITE.address.region,
        postalCode: SITE.address.postalCode,
        addressCountry: SITE.address.country,
      },
      areaServed: { '@type': 'Country', name: SITE.areaServed },
      founder: { '@id': PERSON_ID },
      // Top Builder AI is the AI-operations brand of Salisbury Bookkeeping LLC.
      // sameAs is same-entity-only, so the parent firm is linked via
      // parentOrganization (a distinct Organization node), never via sameAs.
      parentOrganization: { '@id': SALISBURY_ORG_ID },
      slogan: SITE.tagline,
    },
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: SITE.founder,
      jobTitle: 'Founder',
      sameAs: ['https://salisburybookkeeping.com', 'https://topbuilderai.com', 'https://neuron-hq.com'],
    },
    // Minimal cross-property stubs — full org nodes live on each property's own site.
    {
      '@type': 'Organization',
      '@id': SALISBURY_ORG_ID,
      name: 'Salisbury Bookkeeping',
      legalName: SITE.parent.name,
      url: SITE.parent.url,
    },
    {
      '@type': 'Organization',
      '@id': NEURON_ORG_ID,
      name: 'Neuron',
      url: 'https://neuron-hq.com',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.brand,
      description: SITE.tagline,
      publisher: { '@id': orgId },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Service',
      '@id': `${SITE.url}/#service`,
      serviceType: 'Six self-learning AI agents installed on ServiceTitan',
      provider: { '@id': orgId },
      areaServed: { '@type': 'Country', name: SITE.areaServed },
      description: SITE.summary,
      offers: SITE.services.map((s) => ({
        '@type': 'Offer',
        name: s.name,
        description: s.description,
        priceSpecification: { '@type': 'PriceSpecification', price: s.price, priceCurrency: 'USD' },
        availability: 'https://schema.org/InStock',
      })),
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE.url}/#faq`,
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];

  const json = { '@context': 'https://schema.org', '@graph': graph };

  return (
    <script
      type="application/ld+json"
      // Static, developer-authored data — no user input, safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
