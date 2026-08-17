/**
 * Abstract AI Provider Interface
 */
class AIProvider {
  /**
   * @param {string} name - Provider ID ('gemma', 'gemini', etc.)
   */
  constructor(name) {
    if (new.target === AIProvider) {
      throw new TypeError("Cannot instantiate abstract class AIProvider directly.");
    }
    this.name = name;
  }

  /**
   * Test live API connection and latency
   * @abstract
   * @returns {Promise<{ success: boolean, latencyMs: number, message?: string, model?: string }>}
   */
  async testConnection() {
    throw new Error("Method 'testConnection()' must be implemented.");
  }

  /**
   * Execute text generation request
   * @abstract
   * @param {Object} options
   * @param {string} options.prompt
   * @param {string} [options.systemPrompt]
   * @param {string} [options.model]
   * @param {number} [options.temperature]
   * @param {number} [options.maxTokens]
   * @returns {Promise<{ text: string, provider: string, model: string, latencyMs: number, usage?: { inputTokens: number, outputTokens: number } }>}
   */
  async generate(options) {
    throw new Error("Method 'generate()' must be implemented.");
  }

  /**
   * Multi-turn chat completion
   * @param {Object} options
   * @param {Array<{ role: string, content: string }>} options.messages
   * @param {string} [options.systemPrompt]
   * @param {string} [options.model]
   */
  async chat(options) {
    throw new Error("Method 'chat()' must be implemented.");
  }
}

module.exports = AIProvider;
