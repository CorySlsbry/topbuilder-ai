// Validates every <script type="application/ld+json"> block in the prerendered
// pages parses as JSON, and checks the cross-entity GEO invariants.
// Run: node scripts/validate-jsonld.mjs   (after `pnpm --filter web build`)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP = join(import.meta.dirname, '..', 'apps', 'web', '.next', 'server', 'app');
const PAGES = ['index.html', 'faq.html'];
const RE = /<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs;

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

let failures = 0;
const blocks = {};

for (const page of PAGES) {
  const html = readFileSync(join(APP, page), 'utf8');
  const found = [...html.matchAll(RE)];
  if (found.length === 0) {
    console.error(`FAIL ${page}: no application/ld+json block found`);
    failures++;
    continue;
  }
  blocks[page] = [];
  found.forEach((m, i) => {
    try {
      const parsed = JSON.parse(decode(m[1]));
      blocks[page].push(parsed);
      console.log(`OK   ${page} block ${i + 1}: valid JSON`);
    } catch (e) {
      console.error(`FAIL ${page} block ${i + 1}: ${e.message}`);
      failures++;
    }
  });
}

// --- Invariants -------------------------------------------------------------
const PERSON_ID = 'https://salisburybookkeeping.com/#cory-salisbury';
const assert = (cond, label) => {
  if (cond) console.log(`OK   ${label}`);
  else {
    console.error(`FAIL ${label}`);
    failures++;
  }
};

const homeGraph = blocks['index.html']?.[0]?.['@graph'] ?? [];
const org = homeGraph.find((n) => n['@id'] === 'https://topbuilderai.com/#organization');
const person = homeGraph.find((n) => n['@id'] === PERSON_ID);
const salisburyStub = homeGraph.find((n) => n['@id'] === 'https://salisburybookkeeping.com/#organization');
const neuronStub = homeGraph.find((n) => n['@id'] === 'https://neuron-hq.com/#organization');
const homeFaq = homeGraph.find((n) => n['@type'] === 'FAQPage');

assert(!!org, 'home: Organization node present');
assert(org?.founder?.['@id'] === PERSON_ID, 'home: org.founder references canonical Person @id');
assert(org?.parentOrganization?.['@id'] === 'https://salisburybookkeeping.com/#organization', 'home: parentOrganization references Salisbury org stub');
assert(org?.sameAs === undefined, 'home: org has NO cross-org sameAs');
assert(!!person && person.jobTitle === 'Founder' && Array.isArray(person.sameAs) && person.sameAs.length === 3, 'home: canonical Person node with 3-domain sameAs');
assert(!!salisburyStub && salisburyStub.legalName === 'Salisbury Bookkeeping LLC', 'home: Salisbury org stub with legalName');
assert(!!neuronStub && neuronStub.url === 'https://neuron-hq.com', 'home: Neuron org stub');

const faqLd = blocks['faq.html']?.find((b) => b['@type'] === 'FAQPage');
assert(!!faqLd, 'faq: FAQPage block present');
// The homepage renders (and marks up) only a curated FAQ subset; /faq carries
// the full set. The subset must be drawn 1:1 from the full set.
const fullCount = faqLd?.mainEntity?.length ?? 0;
const homeCount = homeFaq?.mainEntity?.length ?? 0;
assert(homeCount > 0 && homeCount <= fullCount, `home: FAQPage carries a curated subset (${homeCount} of ${fullCount})`);
const fullNames = new Set((faqLd?.mainEntity ?? []).map((q) => q.name));
assert(
  (homeFaq?.mainEntity ?? []).every((q) => fullNames.has(q.name)),
  'home: every homepage FAQ question exists in the /faq full set',
);

// Visible-text mirror: every JSON-LD question + answer must appear in its own page's HTML.
const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mirrorCheck = (page, entity) => {
  const html = readFileSync(join(APP, page), 'utf8');
  return (entity ?? []).filter(
    (q) => !html.includes(escapeHtml(q.name)) || !html.includes(escapeHtml(q.acceptedAnswer.text)),
  );
};
const missingHome = mirrorCheck('index.html', homeFaq?.mainEntity);
assert(missingHome.length === 0, `home: all ${homeCount} curated Q&As mirrored 1:1 in visible HTML${missingHome.length ? ` (missing: ${missingHome.map((q) => q.name).join('; ')})` : ''}`);
const missing = mirrorCheck('faq.html', faqLd?.mainEntity);
assert(missing.length === 0, `faq: all ${fullCount} Q&As mirrored 1:1 in visible HTML${missing.length ? ` (missing: ${missing.map((q) => q.name).join('; ')})` : ''}`);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
