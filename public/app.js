const form = document.querySelector('#analyze-form');
const submit = document.querySelector('#submit');
const formError = document.querySelector('#form-error');
const results = document.querySelector('#results');

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const link = (item) => item?.link ? `<a href="${esc(item.link)}" target="_blank" rel="noreferrer noopener">${esc(item.title || item.hostname || item.link)}</a>` : esc(item?.title || item?.snippet || 'Untitled source');
const sources = (items, empty) => items?.length ? `<ul class="source-list">${items.map(item => `<li>${link(item)}<div class="source-meta">${esc(item.source || item.displayedLink || item.hostname || '')}${item.position ? ` · position ${item.position}` : ''}</div>${item.snippet ? `<p>${esc(item.snippet)}</p>` : ''}</li>`).join('')}</ul>` : `<p class="empty">${empty}</p>`;
const signal = (yes, label) => `<span class="signal ${yes ? 'yes' : ''}">${yes ? '✓' : '—'} ${label}</span>`;

function render(data) {
  const s = data.summary;
  results.hidden = false;
  results.innerHTML = `<div class="results-header"><div><h2>Analysis for ${esc(data.targetDomain)}</h2><p>Live results from ${new Date(data.analyzedAt).toLocaleString()}</p></div></div>
    <div class="summary"><div class="metric"><strong>${s.totalQueries}</strong><span>queries analyzed</span></div><div class="metric"><strong>${s.answerMentionCount}</strong><span>mentioned in AI answers</span></div><div class="metric"><strong>${s.aiReferenceCount}</strong><span>cited in AI references</span></div><div class="metric"><strong>${s.regularResultCount}</strong><span>found in Google results</span></div></div>
    ${data.queries.map(item => { const ai = item.aiMode; const google = item.google; const aiCited = !!ai?.references.some(ref => ref.hostname === data.targetDomain); const compare = ai && google ? (ai.mentionedDomain && google.foundDomain ? 'The domain appears in both surfaces.' : ai.mentionedDomain ? 'The domain is mentioned in the AI answer but was not found in the regular results returned.' : google.foundDomain ? 'The domain appears in regular results but was not mentioned in the AI answer.' : 'The domain was not detected in either surface for this query.') : 'Only part of this query could be analyzed.'; return `<article class="query-card"><header><h3>${esc(item.query)}</h3><span class="status ${item.status}">${item.status}</span></header><div class="card-body"><div class="signals">${signal(!!ai?.mentionedDomain, 'mentioned in answer')}${signal(aiCited, 'cited in AI references')}${signal(!!google?.foundDomain, `found in Google${google?.bestPosition ? ` · #${google.bestPosition}` : ''}`)}</div>${item.error ? `<p class="error">${esc(item.error.message)}</p>` : ''}<div class="block"><h4>Google AI Mode answer</h4>${ai?.answerText ? `<div class="answer">${esc(ai.answerText)}</div>` : '<p class="empty">No AI Mode answer was returned.</p>'}</div><div class="block"><h4>AI references</h4>${sources(ai?.references, 'No AI reference links were returned.')}</div><div class="block"><h4>Regular Google results</h4>${sources(google?.results, 'No regular web results were returned.')}</div><p class="compare">${compare}</p></div></article>`; }).join('')}`;
}

form.addEventListener('submit', async event => {
  event.preventDefault(); formError.hidden = true; submit.disabled = true; submit.textContent = 'Analyzing…';
  try {
    const response = await fetch('/api/analyze', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ domain:form.domain.value, queries:form.queries.value }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Analysis failed.'); render(data);
  } catch (error) { formError.textContent = error.message; formError.hidden = false; }
  finally { submit.disabled = false; submit.innerHTML = 'Analyze visibility <span aria-hidden="true">→</span>'; }
});
