/**
 * Normalizes an LLM provider's base URL and resolves the endpoint URL.
 * Handles cases where:
 * - base_url is 'https://openrouter.ai/api/v1' or 'https://openrouter.ai/api' or 'https://openrouter.ai'
 * - base_url is 'https://api.openai.com/v1' or 'https://api.openai.com'
 * - base_url has trailing slashes (e.g., 'https://openrouter.ai/api/v1/')
 * - base_url already includes '/v1' (prevents double '/v1/v1/models')
 * - provider is 'ollama' vs 'openai' (or any OpenAI-compatible provider)
 */
export function resolveEndpointUrl(
  rawBaseUrl: string,
  provider: string = 'openai',
  endpointType: 'models' | 'chat' = 'models'
): string {
  let url = (rawBaseUrl || '').trim().replace(/\/+$/, '');

  // Handle openrouter root
  if (url === 'https://openrouter.ai' || url === 'http://openrouter.ai') {
    url = `${url}/api/v1`;
  }

  if (provider === 'ollama') {
    // If Ollama is configured with OpenAI-compatible endpoint ending in /v1
    if (url.endsWith('/v1')) {
      return endpointType === 'models' ? `${url}/models` : `${url}/chat/completions`;
    }
    // Standard Ollama native API: /api/tags and /api/chat
    const baseWithoutApi = url.replace(/\/api$/, '');
    return endpointType === 'models' ? `${baseWithoutApi}/api/tags` : `${baseWithoutApi}/api/chat`;
  }

  // OpenAI-compatible providers:
  // Check if user already provided the full endpoint
  if (endpointType === 'models' && url.endsWith('/models')) {
    return url;
  }
  if (endpointType === 'chat' && (url.endsWith('/chat/completions') || url.endsWith('/completions'))) {
    return url;
  }

  // If base_url already ends with /v1, don't duplicate /v1
  if (url.endsWith('/v1')) {
    return endpointType === 'models' ? `${url}/models` : `${url}/chat/completions`;
  }

  // Default: append /v1/models or /v1/chat/completions
  return endpointType === 'models' ? `${url}/v1/models` : `${url}/v1/chat/completions`;
}

/**
 * Builds appropriate headers for LLM requests based on provider and API key.
 */
export function getLLMHeaders(
  apiKey?: string,
  provider: string = 'openai',
  siteUrl: string = 'http://localhost:3000',
  siteName: string = 'NeuronKnowledge'
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  // Add OpenRouter recommended headers for ranking & attribution
  headers['HTTP-Referer'] = siteUrl;
  headers['X-Title'] = siteName;

  return headers;
}
