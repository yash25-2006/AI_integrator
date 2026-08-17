const gemmaProvider = require('./providers/GemmaProvider');
const geminiProvider = require('./providers/GeminiProvider');
const configStore = require('./ConfigStore');
const logger = require('./Logger');
const AIError = require('./AIError');

class AIRouter {
  constructor() {
    this.providers = {
      gemma: gemmaProvider,
      gemini: geminiProvider
    };
  }

  /**
   * Get provider instances sorted by configured priority
   * @param {boolean} requireSoftwareEnabled
   */
  getActiveProviderList(requireSoftwareEnabled = true) {
    const summary = configStore.getSanitizedSummary().providers;
    const sorted = Object.keys(summary)
      .map(key => ({
        key,
        instance: this.providers[key],
        ...summary[key]
      }))
      .filter(p => {
        if (!p.instance) return false;
        if (!p.enabled) return false;
        if (!p.isConfigured) return false;
        if (requireSoftwareEnabled && !p.softwareEnabled) return false;
        return true;
      })
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));

    return sorted;
  }

  /**
   * Core AI generation method used by both the Hub Playground and all Existing Software AI utilities.
   * @param {Object} params
   * @param {string} params.prompt
   * @param {string} [params.systemPrompt]
   * @param {string} [params.provider] - Explicit target provider or undefined to use router priority
   * @param {string} [params.model]
   * @param {number} [params.temperature]
   * @param {number} [params.maxTokens]
   * @param {boolean} [params.isSoftwareCall] - True if invoked by application AI utilities
   */
  async generate({ prompt, systemPrompt, provider, model, temperature, maxTokens, isSoftwareCall = false }) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new AIError('Prompt text is required for AI generation.', 'CONFIG_ERROR', 400, 'router');
    }

    // 1. If explicit provider is passed, execute strictly on that provider
    if (provider && this.providers[provider]) {
      const pInstance = this.providers[provider];
      try {
        const result = await pInstance.generate({ prompt, systemPrompt, model, temperature, maxTokens });
        logger.logRequest({
          provider: result.provider,
          model: result.model,
          status: 'SUCCESS',
          timeToFirstTokenMs: result.timeToFirstTokenMs,
          latencyMs: result.latencyMs,
          tokens: result.usage,
          promptPreview: prompt
        });
        return result;
      } catch (err) {
        const aiErr = AIError.classify(err, provider);
        logger.logRequest({
          provider,
          model: model || 'default',
          status: 'ERROR',
          latencyMs: aiErr.latencyMs || 0,
          errorCategory: aiErr.type,
          promptPreview: prompt
        });
        throw aiErr;
      }
    }

    // 2. Otherwise, use router priority list
    const candidateProviders = this.getActiveProviderList(isSoftwareCall);

    if (candidateProviders.length === 0) {
      const msg = isSoftwareCall
        ? 'No active AI providers are enabled for software integration. Please open Gemma 4 settings and click "Enable Gemma for Software".'
        : 'No AI providers are configured or enabled.';
      const noProvErr = new AIError(msg, 'CONFIG_ERROR', 400, 'router');
      logger.logRequest({
        provider: 'none',
        model: 'none',
        status: 'ERROR',
        errorCategory: 'CONFIG_ERROR',
        promptPreview: prompt
      });
      throw noProvErr;
    }

    let lastError = null;

    // Try candidate providers in priority order
    for (let i = 0; i < candidateProviders.length; i++) {
      const target = candidateProviders[i];
      try {
        const result = await target.instance.generate({
          prompt,
          systemPrompt,
          model: model || target.model,
          temperature,
          maxTokens
        });

        logger.logRequest({
          provider: result.provider,
          model: result.model,
          status: i > 0 ? 'FALLBACK' : 'SUCCESS',
          latencyMs: result.latencyMs,
          tokens: result.usage,
          promptPreview: prompt
        });

        return {
          ...result,
          wasFallback: i > 0
        };
      } catch (err) {
        lastError = AIError.classify(err, target.key);
        
        logger.logRequest({
          provider: target.key,
          model: target.model,
          status: 'ERROR',
          errorCategory: lastError.type,
          promptPreview: prompt
        });

        // SMART FALLBACK RULE:
        // Do NOT fallback if error is a CONFIG_ERROR (401, 403, bad key, bad request)
        if (lastError.type === 'CONFIG_ERROR') {
          console.warn(`[AIRouter] Provider '${target.key}' encountered config error. Halting fallback chain:`, lastError.message);
          throw lastError;
        }

        console.warn(`[AIRouter] Provider '${target.key}' failed with provider error (${lastError.message}). Attempting next provider...`);
      }
    }

    throw lastError || new AIError('All available AI providers failed.', 'PROVIDER_ERROR', 500, 'router');
  }

  /**
   * Multi-turn chat completion with router dispatching
   */
  async chat({ messages, systemPrompt, provider, model, temperature, maxTokens, isSoftwareCall = false }) {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new AIError('Chat messages array is required.', 'CONFIG_ERROR', 400, 'router');
    }

    const candidateProviders = provider && this.providers[provider]
      ? [{ key: provider, instance: this.providers[provider] }]
      : this.getActiveProviderList(isSoftwareCall);

    if (candidateProviders.length === 0) {
      throw new AIError('No active AI providers available.', 'CONFIG_ERROR', 400, 'router');
    }

    let lastError = null;

    for (let i = 0; i < candidateProviders.length; i++) {
      const target = candidateProviders[i];
      try {
        const result = await target.instance.chat({
          messages,
          systemPrompt,
          model: model || target.model,
          temperature,
          maxTokens
        });

        const lastMsg = messages[messages.length - 1]?.content || '';
        logger.logRequest({
          provider: result.provider,
          model: result.model,
          status: i > 0 ? 'FALLBACK' : 'SUCCESS',
          latencyMs: result.latencyMs,
          tokens: result.usage,
          promptPreview: lastMsg
        });

        return result;
      } catch (err) {
        lastError = AIError.classify(err, target.key);
        if (lastError.type === 'CONFIG_ERROR') {
          throw lastError;
        }
      }
    }

    throw lastError || new AIError('Chat execution failed across all providers.', 'PROVIDER_ERROR', 500, 'router');
  }

  /**
   * Run real connection test on a specific provider
   * @param {string} providerName
   */
  async testProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new AIError(`Unknown provider '${providerName}'`, 'CONFIG_ERROR', 400, 'router');
    }
    return await this.providers[providerName].testConnection();
  }
}

module.exports = new AIRouter();
