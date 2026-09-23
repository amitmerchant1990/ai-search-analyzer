const endpoint = process.env.SEARCHAPI_BASE_URL || 'https://www.searchapi.io/api/v1/search';

export async function searchApi({ engine, query, apiKey, fetchImpl = fetch, timeoutMs = 30000 }) {
  if (!apiKey) throw new Error('SEARCHAPI_API_KEY is not configured.');
  const url = new URL(endpoint);
  url.searchParams.set('engine', engine);
  url.searchParams.set('q', query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`SearchApi returned ${response.status}.`);
    try { return await response.json(); } catch { throw new Error('SearchApi returned invalid JSON.'); }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('SearchApi request timed out.');
    throw error;
  } finally { clearTimeout(timer); }
}

export const searchAiMode = options => searchApi({ ...options, engine: 'google_ai_mode' });
export const searchGoogle = options => searchApi({ ...options, engine: 'google' });
