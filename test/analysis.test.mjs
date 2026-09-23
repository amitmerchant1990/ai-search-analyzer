import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePair, normalizeDomain, normalizeQueries, summarize } from '../src/analysis.mjs';

test('normalizes domains and compares www consistently', () => {
  assert.equal(normalizeDomain(' https://WWW.Example.com/path '), 'example.com');
});

test('deduplicates queries without changing the first spelling', () => {
  assert.deepEqual(normalizeQueries('One\none\n two \n'), ['One', 'two']);
});

test('normalizes optional provider fields and computes visibility signals', () => {
  const result = analyzePair({
    domain: 'example.com',
    query: 'test query',
    aiResponse: { markdown: 'A useful answer mentioning example.com.', reference_links: [{ title: 'Example', link: 'https://www.example.com/page', source: 'Example' }] },
    googleResponse: { web_results: [{ position: 3, title: 'Example result', link: 'https://example.com/result' }, { position: 1, title: 'Other', link: 'https://other.test/page' }] }
  });
  assert.equal(result.status, 'success');
  assert.equal(result.aiMode.mentionedDomain, true);
  assert.equal(result.aiMode.references[0].hostname, 'example.com');
  assert.equal(result.google.foundDomain, true);
  assert.equal(result.google.bestPosition, 3);
  assert.deepEqual(result.google.otherDomains, ['other.test']);
});

test('uses structured AI text before citation markdown', () => {
  const result = analyzePair({
    domain: 'example.com',
    query: 'test',
    aiResponse: { markdown: '[0](https://source.test)', text_blocks: [{ type: 'paragraph', answer: 'The answer mentions example.com.' }] },
    googleResponse: { organic_results: [{ position: 2, title: 'Example', link: 'https://example.com/page' }] }
  });
  assert.equal(result.aiMode.answerText, 'The answer mentions example.com.');
  assert.equal(result.google.foundDomain, true);
  assert.equal(result.google.bestPosition, 2);
});

test('keeps a query partial when one surface fails', () => {
  const result = analyzePair({ domain: 'example.com', query: 'test', aiResponse: {}, googleResponse: undefined, googleError: new Error('failed') });
  assert.equal(result.status, 'partial');
  assert.equal(result.error.surface, 'google');
});

test('summarizes query signals', () => {
  const query = analyzePair({ domain: 'example.com', query: 'test', aiResponse: { markdown: 'example.com' }, googleResponse: { web_results: [] } });
  const result = summarize('example.com', [query]);
  assert.equal(result.summary.answerMentionCount, 1);
  assert.equal(result.summary.regularResultCount, 0);
});
