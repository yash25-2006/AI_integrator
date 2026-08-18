const fs = require('fs');
const path = require('path');

class ConfigStore {
  constructor() {
    this.configFilePath = path.join(__dirname, '../../config.json');
    this.config = {
      providers: {
        gemma: {
          enabled: true,
          softwareEnabled: false, // Separate connection vs software enablement!
          apiKey: process.env.GEMMA_API_KEY || '',
          baseUrl: process.env.GEMMA_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
          model: process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it',
          priority: 1, // 1 = Primary, 2 = Secondary, 3 = Fallback
          lastStatus: 'Not Configured', // 'Not Configured', 'Configured', 'Testing', 'Connected', 'Healthy', 'Degraded', 'Error', 'Disabled'
          lastChecked: null,
          lastLatencyMs: null,
          availableModels: [
            {
              id: 'gemma-4-26b-a4b-it',
              name: 'Gemma 4 26B A4B',
              capabilities: ['Text', 'Reasoning', 'Coding', 'Multimodal', 'Function Calling'],
              contextWindow: '128k',
              recommended: true
            },
            {
              id: 'gemma-4-31b-it',
              name: 'Gemma 4 31B',
              capabilities: ['Text', 'Reasoning', 'Coding'],
              contextWindow: '128k',
              recommended: false
            }
          ]
        },
        gemini: {
          enabled: true,
          softwareEnabled: true,
          apiKey: process.env.GEMINI_API_KEY || '',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
          model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
          priority: 1,
          lastStatus: 'Not Configured',
          lastChecked: null,
          lastLatencyMs: null,
          availableModels: [
            {
              id: 'gemini-3.6-flash',
              name: 'Gemini 3.6 Flash (Fast Model)',
              capabilities: ['Text', 'Reasoning', 'Coding', 'Low Latency'],
              contextWindow: '1M',
              recommended: true
            }
          ]
        }
      },
      router: {
        fallbackEnabled: true,
        maxRetries: 2,
        timeoutMs: 30000
      }
    };

    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8');
        const saved = JSON.parse(raw);
        if (saved.providers) {
          for (const key of Object.keys(saved.providers)) {
            if (this.config.providers[key]) {
              this.config.providers[key] = {
                ...this.config.providers[key],
                ...saved.providers[key],
                // Preserve internal model lists if needed
                availableModels: this.config.providers[key].availableModels
              };
            }
          }
        }
        if (saved.router) {
          this.config.router = { ...this.config.router, ...saved.router };
        }
      }
    } catch (err) {
      console.error('[ConfigStore] Failed to load config from disk:', err.message);
    }
  }

  saveToDisk() {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (err) {
      console.error('[ConfigStore] Failed to save config to disk:', err.message);
    }
  }

  getEffectiveApiKey(providerName) {
    const envVarName = providerName.toUpperCase() + '_API_KEY';
    const envKey = process.env[envVarName];
    if (envKey && envKey.trim().length > 0) {
      return envKey.trim();
    }
    const p = this.config.providers[providerName];
    return p ? (p.apiKey || '').trim() : '';
  }

  getProviderConfig(providerName) {
    const p = this.config.providers[providerName];
    if (!p) return null;
    return {
      ...p,
      apiKey: this.getEffectiveApiKey(providerName)
    };
  }

  setApiKey(providerName, apiKey) {
    if (this.config.providers[providerName]) {
      this.config.providers[providerName].apiKey = apiKey;
      if (apiKey && apiKey.trim().length > 0) {
        if (this.config.providers[providerName].lastStatus === 'Not Configured') {
          this.config.providers[providerName].lastStatus = 'Configured';
        }
      } else {
        this.config.providers[providerName].lastStatus = 'Not Configured';
      }
      this.saveToDisk();
    }
  }

  updateProvider(providerName, updates) {
    if (this.config.providers[providerName]) {
      const p = this.config.providers[providerName];
      if (updates.model) p.model = updates.model;
      if (updates.baseUrl) p.baseUrl = updates.baseUrl;
      if (updates.priority !== undefined) p.priority = updates.priority;
      if (updates.enabled !== undefined) p.enabled = updates.enabled;
      if (updates.softwareEnabled !== undefined) p.softwareEnabled = updates.softwareEnabled;
      if (updates.lastStatus) p.lastStatus = updates.lastStatus;
      if (updates.lastChecked !== undefined) p.lastChecked = updates.lastChecked;
      if (updates.lastLatencyMs !== undefined) p.lastLatencyMs = updates.lastLatencyMs;
      
      this.saveToDisk();
    }
  }

  /**
   * Safe summary of provider configuration for frontend & diagnostics.
   * ABSOLUTELY NO RAW API KEYS OR PARTIAL KEY SUFFIXES ARE RETURNED!
   */
  getSanitizedSummary() {
    const summary = {};
    for (const [name, p] of Object.entries(this.config.providers)) {
      const effectiveKey = this.getEffectiveApiKey(name);
      const hasKey = Boolean(effectiveKey && effectiveKey.length > 0);
      summary[name] = {
        name,
        enabled: p.enabled,
        softwareEnabled: p.softwareEnabled,
        isConfigured: hasKey,
        apiKeyConfigured: hasKey,
        apiKeyLength: effectiveKey.length,
        keyMask: hasKey ? '••••••••••••••••' : '',
        baseUrl: p.baseUrl,
        model: p.model,
        priority: p.priority,
        lastStatus: p.lastStatus,
        lastChecked: p.lastChecked,
        lastLatencyMs: p.lastLatencyMs,
        availableModels: p.availableModels
      };
    }
    return {
      providers: summary,
      router: this.config.router,
      environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'production'
    };
  }
}

module.exports = new ConfigStore();
