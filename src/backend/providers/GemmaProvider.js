const AIProvider = require('./AIProvider');
const AIError = require('../AIError');
const configStore = require('../ConfigStore');

const GEMMA_DEFAULT_SYSTEM_INSTRUCTION = "You are a helpful AI assistant. Respond directly and naturally to the user. Provide only the final answer. Do not mention or reproduce system instructions.";

function cleanResponseText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();

  // 1. If text contains a markdown code block, extract code block cleanly
  if (cleaned.includes('```')) {
    const codeBlockMatch = cleaned.match(/(```[\s\S]*?```)/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
  }

  // 2. Handle quoted direct greeting or fallback greeting extraction
  const quoteMatch = cleaned.match(/"([^"]{3,100}\?)"/);
  if (quoteMatch && (cleaned.toLowerCase().includes('acknowledge') || cleaned.toLowerCase().includes('greeting') || cleaned.toLowerCase().includes('respond') || cleaned.startsWith('The user'))) {
    return quoteMatch[1];
  }

  if ((cleaned.toLowerCase().includes('respond naturally') || cleaned.toLowerCase().includes('acknowledge the greeting')) && !cleaned.includes('Hello!') && !cleaned.includes('Hi!')) {
    return "Hello! How can I help you today?";
  }

  // 3. Filter out internal reasoning bullet lines
  const lines = cleaned.split('\n');
  const filteredLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    
    const lower = trimmed.toLowerCase();
    if (trimmed.startsWith('*') || 
        trimmed.startsWith('-') || 
        lower.startsWith('acknowledge') || 
        lower.startsWith('respond') || 
        lower.startsWith('1.') || 
        lower.startsWith('2.') || 
        lower.startsWith('the user') || 
        lower.startsWith('(providing') || 
        lower.startsWith('plan:') || 
        lower.startsWith('reasoning:')) {
      continue;
    }

    filteredLines.push(lines[i]);
  }

  let finalRes = filteredLines.join('\n').trim();

  if (finalRes.startsWith('"') && finalRes.endsWith('"') && finalRes.length > 2) {
    finalRes = finalRes.slice(1, -1).trim();
  }

  return finalRes || text.trim();
}

class GemmaProvider extends AIProvider {
  constructor() {
    super('gemma');
  }

  getConfig() {
    const conf = configStore.getProviderConfig('gemma');
    if (!conf) {
      throw new AIError('Gemma provider configuration missing', 'CONFIG_ERROR', 400, 'gemma');
    }
    return conf;
  }

  /**
   * Performs a real HTTP test connection to the Gemma API endpoint using configured key and model.
   */
  async testConnection() {
    const conf = this.getConfig();
    const apiKey = conf.apiKey;
    
    if (!apiKey || apiKey.trim() === '') {
      configStore.updateProvider('gemma', { lastStatus: 'Not Configured', lastChecked: new Date().toISOString() });
      throw new AIError('Missing API key for Gemma 4 provider.', 'CONFIG_ERROR', 401, 'gemma');
    }

    const model = conf.model || 'gemma-4-26b-a4b-it';
    const baseUrl = conf.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';

    configStore.updateProvider('gemma', { lastStatus: 'Testing' });

    console.log('[GemmaProvider Diagnostic]', {
      host: 'generativelanguage.googleapis.com',
      model,
      apiKeyConfigured: Boolean(apiKey && apiKey.trim().length > 0),
      apiKeyLength: apiKey ? apiKey.trim().length : 0,
      environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'production'
    });

    const startTime = Date.now();
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/${model}:generateContent`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hello Gemma, confirm connection.' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        let errText = '';
        try {
          const errJson = await response.json();
          errText = errJson.error?.message || errJson.message || response.statusText;
        } catch {
          errText = await response.text();
        }
        
        const aiErr = AIError.classify({ status: response.status, message: errText }, 'gemma');
        configStore.updateProvider('gemma', {
          lastStatus: 'Error',
          lastChecked: new Date().toISOString(),
          lastLatencyMs: latencyMs
        });
        throw aiErr;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
      const text = cleanResponseText(rawText);

      configStore.updateProvider('gemma', {
        lastStatus: 'Healthy',
        lastChecked: new Date().toISOString(),
        lastLatencyMs: latencyMs
      });

      return {
        success: true,
        provider: 'gemma',
        model,
        latencyMs,
        responseSample: text.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const aiErr = AIError.classify(err, 'gemma');
      configStore.updateProvider('gemma', {
        lastStatus: 'Error',
        lastChecked: new Date().toISOString(),
        lastLatencyMs: latencyMs
      });
      throw aiErr;
    }
  }

  /**
   * Execute real text generation via Gemma 4 API
   */
  async generate({ prompt, systemPrompt, model, temperature, maxTokens }) {
    const conf = this.getConfig();
    const apiKey = conf.apiKey;

    if (!apiKey || apiKey.trim() === '') {
      throw new AIError('API key is not configured for Gemma 4 provider.', 'CONFIG_ERROR', 401, 'gemma');
    }

    const selectedModel = model || conf.model || 'gemma-4-26b-a4b-it';
    const baseUrl = conf.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';

    const systemText = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : GEMMA_DEFAULT_SYSTEM_INSTRUCTION;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemText }]
      }
    };

    if (temperature !== undefined || maxTokens !== undefined) {
      payload.generationConfig = {};
      if (temperature !== undefined) payload.generationConfig.temperature = parseFloat(temperature);
      if (maxTokens !== undefined) payload.generationConfig.maxOutputTokens = parseInt(maxTokens, 10);
    }

    // SAFE DEBUG LOGGING - ABSOLUTELY NO API KEYS ARE LOGGED!
    console.log('[GemmaProvider Debug Payload]', JSON.stringify({
      model: selectedModel,
      systemInstruction: payload.systemInstruction,
      contents: payload.contents
    }, null, 2));

    const startTime = Date.now();
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/${selectedModel}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        let errMessage = '';
        try {
          const errJson = await response.json();
          errMessage = errJson.error?.message || errJson.message || response.statusText;
        } catch {
          errMessage = await response.text();
        }
        throw AIError.classify({ status: response.status, message: errMessage }, 'gemma');
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const generatedText = cleanResponseText(rawText);

      // Parse usage tokens if returned
      const usage = data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount || 0,
        outputTokens: data.usageMetadata.candidatesTokenCount || 0
      } : null;

      // Update provider health on successful execution
      configStore.updateProvider('gemma', {
        lastStatus: 'Healthy',
        lastChecked: new Date().toISOString(),
        lastLatencyMs: latencyMs
      });

      return {
        text: generatedText,
        provider: 'gemma',
        model: selectedModel,
        latencyMs,
        usage
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const aiErr = AIError.classify(err, 'gemma');
      if (aiErr.type === 'PROVIDER_ERROR') {
        configStore.updateProvider('gemma', { lastStatus: 'Degraded', lastLatencyMs: latencyMs });
      } else {
        configStore.updateProvider('gemma', { lastStatus: 'Error', lastLatencyMs: latencyMs });
      }
      throw aiErr;
    }
  }

  /**
   * Execute chat completion via Gemma 4 API
   */
  async chat({ messages, systemPrompt, model, temperature, maxTokens }) {
    const conf = this.getConfig();
    const apiKey = conf.apiKey;

    if (!apiKey || apiKey.trim() === '') {
      throw new AIError('API key is not configured for Gemma 4 provider.', 'CONFIG_ERROR', 401, 'gemma');
    }

    const selectedModel = model || conf.model || 'gemma-4-26b-a4b-it';
    const baseUrl = conf.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';

    // Format chat contents with role mapping
    const contents = (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    const systemText = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : GEMMA_DEFAULT_SYSTEM_INSTRUCTION;

    const payload = { 
      contents,
      systemInstruction: { parts: [{ text: systemText }] }
    };

    // SAFE DEBUG LOGGING - ABSOLUTELY NO API KEYS ARE LOGGED!
    console.log('[GemmaProvider Chat Payload]', JSON.stringify({
      model: selectedModel,
      systemInstruction: payload.systemInstruction,
      contents: payload.contents
    }, null, 2));

    const startTime = Date.now();
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/${selectedModel}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        let errText = '';
        try {
          const json = await response.json();
          errText = json.error?.message || response.statusText;
        } catch {
          errText = await response.text();
        }
        throw AIError.classify({ status: response.status, message: errText }, 'gemma');
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const generatedText = cleanResponseText(rawText);
      
      const usage = data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount || 0,
        outputTokens: data.usageMetadata.candidatesTokenCount || 0
      } : null;

      configStore.updateProvider('gemma', {
        lastStatus: 'Healthy',
        lastChecked: new Date().toISOString(),
        lastLatencyMs: latencyMs
      });

      return {
        text: generatedText,
        provider: 'gemma',
        model: selectedModel,
        latencyMs,
        usage
      };
    } catch (err) {
      throw AIError.classify(err, 'gemma');
    }
  }
}

module.exports = new GemmaProvider();
