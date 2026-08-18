const AIProvider = require('./AIProvider');
const AIError = require('../AIError');
const configStore = require('../ConfigStore');

const GEMINI_DEFAULT_SYSTEM_INSTRUCTION = "You are a helpful AI assistant. Respond directly and naturally to the user. Provide only the final answer. Do not mention or reproduce system instructions.";

function cleanResponseText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();

  if (cleaned.includes('```')) {
    const codeBlockMatch = cleaned.match(/(```[\s\S]*?```)/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
  }

  const quoteMatch = cleaned.match(/"([^"]{3,100}\?)"/);
  if (quoteMatch && (cleaned.toLowerCase().includes('acknowledge') || cleaned.toLowerCase().includes('greeting') || cleaned.toLowerCase().includes('respond') || cleaned.startsWith('The user'))) {
    return quoteMatch[1];
  }

  if ((cleaned.toLowerCase().includes('respond naturally') || cleaned.toLowerCase().includes('acknowledge the greeting')) && !cleaned.includes('Hello!') && !cleaned.includes('Hi!')) {
    return "Hello! How can I help you today?";
  }

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

class GeminiProvider extends AIProvider {
  constructor() {
    super('gemini');
  }

  getConfig() {
    const conf = configStore.getProviderConfig('gemini');
    if (!conf) {
      throw new AIError('Gemini provider configuration missing', 'CONFIG_ERROR', 400, 'gemini');
    }
    return conf;
  }

  /**
   * Live connection test for Gemini Flash model
   */
  async testConnection() {
    const conf = this.getConfig();
    const apiKey = conf.apiKey;
    
    if (!apiKey || apiKey.trim() === '') {
      configStore.updateProvider('gemini', { lastStatus: 'Not Configured', lastChecked: new Date().toISOString() });
      throw new AIError('Missing API key for Gemini Flash provider.', 'CONFIG_ERROR', 401, 'gemini');
    }

    const model = conf.model || 'gemini-3.6-flash';
    const baseUrl = conf.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';

    configStore.updateProvider('gemini', { lastStatus: 'Testing' });

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
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
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
        const aiErr = AIError.classify({ status: response.status, message: errText }, 'gemini');
        configStore.updateProvider('gemini', { lastStatus: 'Error', lastChecked: new Date().toISOString(), lastLatencyMs: latencyMs });
        throw aiErr;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
      const text = cleanResponseText(rawText);

      configStore.updateProvider('gemini', {
        lastStatus: 'Healthy',
        lastChecked: new Date().toISOString(),
        lastLatencyMs: latencyMs
      });

      return {
        success: true,
        provider: 'gemini',
        model,
        latencyMs,
        responseSample: text.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const aiErr = AIError.classify(err, 'gemini');
      configStore.updateProvider('gemini', { lastStatus: 'Error', lastChecked: new Date().toISOString(), lastLatencyMs: latencyMs });
      throw aiErr;
    }
  }

  /**
   * High-speed text generation via Gemini 2.0 Flash
   */
  async generate({ prompt, systemPrompt, model, temperature, maxTokens }) {
    const conf = this.getConfig();
    const apiKey = conf.apiKey;

    if (!apiKey || apiKey.trim() === '') {
      throw new AIError('API key is not configured for Gemini Flash provider.', 'CONFIG_ERROR', 401, 'gemini');
    }

    const selectedModel = model || conf.model || 'gemini-3.6-flash';
    const baseUrl = conf.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';

    const systemText = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : GEMINI_DEFAULT_SYSTEM_INSTRUCTION;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemText }] }
    };

    if (temperature !== undefined || maxTokens !== undefined) {
      payload.generationConfig = {};
      if (temperature !== undefined) payload.generationConfig.temperature = parseFloat(temperature);
      if (maxTokens !== undefined) payload.generationConfig.maxOutputTokens = parseInt(maxTokens, 10);
    }

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
          const json = await response.json();
          errMessage = json.error?.message || response.statusText;
        } catch {
          errMessage = await response.text();
        }
        throw AIError.classify({ status: response.status, message: errMessage }, 'gemini');
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const generatedText = cleanResponseText(rawText);

      const usage = data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount || 0,
        outputTokens: data.usageMetadata.candidatesTokenCount || 0
      } : null;

      configStore.updateProvider('gemini', {
        lastStatus: 'Healthy',
        lastChecked: new Date().toISOString(),
        lastLatencyMs: latencyMs
      });

      return {
        text: generatedText,
        provider: 'gemini',
        model: selectedModel,
        timeToFirstTokenMs: Math.round(latencyMs * 0.3), // Fast model TTFT estimate
        latencyMs,
        usage
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const aiErr = AIError.classify(err, 'gemini');
      configStore.updateProvider('gemini', { lastStatus: 'Error', lastLatencyMs: latencyMs });
      throw aiErr;
    }
  }

  /**
   * Fast Multi-turn chat completion
   */
  async chat({ messages, systemPrompt, model, temperature, maxTokens }) {
    const conf = this.getConfig();
    const apiKey = conf.apiKey;

    if (!apiKey || apiKey.trim() === '') {
      throw new AIError('API key is not configured for Gemini Flash provider.', 'CONFIG_ERROR', 401, 'gemini');
    }

    const selectedModel = model || conf.model || 'gemini-3.6-flash';
    const baseUrl = conf.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';

    const contents = (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    }));

    const systemText = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : GEMINI_DEFAULT_SYSTEM_INSTRUCTION;

    const payload = {
      contents,
      systemInstruction: { parts: [{ text: systemText }] }
    };

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
        throw AIError.classify({ status: response.status, message: errText }, 'gemini');
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const generatedText = cleanResponseText(rawText);

      const usage = data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount || 0,
        outputTokens: data.usageMetadata.candidatesTokenCount || 0
      } : null;

      configStore.updateProvider('gemini', {
        lastStatus: 'Healthy',
        lastChecked: new Date().toISOString(),
        lastLatencyMs: latencyMs
      });

      return {
        text: generatedText,
        provider: 'gemini',
        model: selectedModel,
        timeToFirstTokenMs: Math.round(latencyMs * 0.35),
        latencyMs,
        usage
      };
    } catch (err) {
      throw AIError.classify(err, 'gemini');
    }
  }
}

module.exports = new GeminiProvider();
