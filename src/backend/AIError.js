/**
 * Error Classification Layer for Central AI Router
 */
class AIError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} type - CONFIG_ERROR | PROVIDER_ERROR | REQUEST_ERROR
   * @param {number} [statusCode] - HTTP status code if applicable
   * @param {string} [provider] - Provider name
   */
  constructor(message, type = 'PROVIDER_ERROR', statusCode = 500, provider = 'unknown') {
    super(message);
    this.name = 'AIError';
    this.type = type; // 'CONFIG_ERROR' | 'PROVIDER_ERROR' | 'REQUEST_ERROR'
    this.statusCode = statusCode;
    this.provider = provider;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Classify an HTTP response or catch error into an AIError instance
   * @param {Error|Response|any} err
   * @param {string} provider
   * @returns {AIError}
   */
  static classify(err, provider = 'unknown') {
    if (err instanceof AIError) return err;

    let message = err?.message || 'Unknown provider error';
    let status = err?.status || 500;
    let type = 'PROVIDER_ERROR';

    if (status === 401 || status === 403 || message.includes('API key') || message.includes('Unauthorized')) {
      type = 'CONFIG_ERROR';
    } else if (status === 400 || message.includes('Invalid model') || message.includes('Malformed')) {
      type = 'CONFIG_ERROR';
    } else if (status === 429 || status >= 500 || message.includes('fetch failed') || message.includes('ETIMEDOUT')) {
      type = 'PROVIDER_ERROR';
    }

    return new AIError(message, type, status, provider);
  }
}

module.exports = AIError;
