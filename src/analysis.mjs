export const MAX_QUERIES = 10;

export function normalizeDomain(value) {
  const input = String(value ?? '').trim();
  if (!input) throw new Error('Enter a domain.');
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let hostname;
  try {
    hostname = new URL(candidate).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    throw new Error('Enter a valid domain, such as example.com.');
  }
  if (!hostname || hostname.includes(' ') || !hostname.includes('.') || hostname.startsWith('.') || hostname.endsWith('.')) {
    throw new Error('Enter a valid domain, such as example.com.');
  }
  return hostname;
}

export function normalizeQueries(value) {
  const queries = String(value ?? '').split(/\r?\n/).map(q => q.trim()).filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const query of queries) {
    const key = query.toLowerCase();
    if (!seen.has(key)) { seen.add(key); unique.push(query); }
  }
  if (!unique.length) throw new Error('Enter at least one query.');
  if (unique.length > MAX_QUERIES) throw new Error(`Use ${MAX_QUERIES} queries or fewer per analysis.`);
  return unique;
}

export function hostnameFromUrl(value) {
  if (!value || typeof value !== 'string') return undefined;
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); } catch { return undefined; }
}

function asText(value) { return typeof value === 'string' ? value : ''; }

export function answerText(response) {
  const blocks = Array.isArray(response?.text_blocks) ? response.text_blocks : [];
  const text = blocks.map(block => {
    if (typeof block === 'string') return block;
    const parts = [block?.answer, ...(Array.isArray(block?.items) ? block.items.map(item => item?.answer) : [])];
    return parts.filter(Boolean).join('\n');
  }).filter(Boolean).join('\n\n');
  return text || (typeof response?.markdown === 'string' ? response.markdown : '');
}

function normalizeLink(item) {
  const link = asText(item?.link) || undefined;
  return {
    title: asText(item?.title) || undefined,
    link,
    hostname: hostnameFromUrl(link),
    source: asText(item?.source) || undefined,
    snippet: asText(item?.snippet) || undefined,
    displayedLink: asText(item?.displayed_link) || undefined,
    position: Number.isFinite(item?.position) ? item.position : undefined,
    index: Number.isFinite(item?.index) ? item.index : undefined
  };
}

export function normalizeReferences(response) {
  return (Array.isArray(response?.reference_links) ? response.reference_links : []).map(normalizeLink).filter(item => item.link || item.title || item.snippet);
}

export function normalizeWebResults(response) {
  const results = response?.organic_results ?? response?.web_results ?? [];
  return (Array.isArray(results) ? results : []).map(normalizeLink).filter(item => item.link || item.title || item.snippet);
}

function otherDomains(items, targetDomain) {
  return [...new Set(items.map(item => item.hostname).filter(hostname => hostname && hostname !== targetDomain))];
}

export function analyzePair({ domain, query, aiResponse, googleResponse, aiError, googleError }) {
  const aiMode = aiError ? undefined : (() => {
    const text = answerText(aiResponse);
    const references = normalizeReferences(aiResponse);
    return { answerMarkdown: asText(aiResponse?.markdown) || undefined, answerText: text || undefined, mentionedDomain: text.toLowerCase().includes(domain), references, otherDomains: otherDomains(references, domain) };
  })();
  const google = googleError ? undefined : (() => {
    const results = normalizeWebResults(googleResponse);
    const matching = results.filter(result => result.hostname === domain);
    return { results, foundDomain: matching.length > 0, bestPosition: matching.map(result => result.position).filter(Number.isFinite).sort((a, b) => a - b)[0], otherDomains: otherDomains(results, domain) };
  })();
  const status = aiError && googleError ? 'error' : aiError || googleError ? 'partial' : 'success';
  const errors = [aiError && { message: aiError.message, surface: 'ai_mode' }, googleError && { message: googleError.message, surface: 'google' }].filter(Boolean);
  return { query, status, ...(errors[0] && { error: errors[0] }), ...(aiMode && { aiMode }), ...(google && { google }) };
}

export function summarize(targetDomain, queries, analyzedAt = new Date().toISOString()) {
  const successfulQueries = queries.filter(item => item.status === 'success').length;
  const referencedDomains = [...new Set(queries.flatMap(item => [...(item.aiMode?.otherDomains ?? []), ...(item.google?.otherDomains ?? [])]))];
  return { targetDomain, analyzedAt, summary: { totalQueries: queries.length, successfulQueries, failedQueries: queries.length - successfulQueries, answerMentionCount: queries.filter(item => item.aiMode?.mentionedDomain).length, aiReferenceCount: queries.filter(item => item.aiMode?.references.some(ref => ref.hostname === targetDomain)).length, regularResultCount: queries.filter(item => item.google?.foundDomain).length, referencedDomains }, queries };
}
