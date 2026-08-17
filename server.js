const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const configStore = require('./src/backend/ConfigStore');
const aiRouter = require('./src/backend/AIRouter');
const logger = require('./src/backend/Logger');
const AIError = require('./src/backend/AIError');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'src/frontend');

// Helper to parse JSON request bodies
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) { // 10MB safety limit
        reject(new AIError('Payload too large', 'REQUEST_ERROR', 413, 'server'));
      }
    });
    req.on('end', () => {
      if (!body || body.trim() === '') return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new AIError('Invalid JSON body', 'REQUEST_ERROR', 400, 'server'));
      }
    });
    req.on('error', err => reject(err));
  });
}

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper to send static files
function serveStaticFile(req, res, reqPath) {
  let filePath = path.join(PUBLIC_DIR, reqPath === '/' ? 'index.html' : reqPath);

  // Security check against directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('500 Server Error');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const reqPath = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // --- REST API ROUTES ---
  if (reqPath.startsWith('/api/')) {
    try {
      // 1. GET /api/ai/providers - Get sanitized provider summary
      if (method === 'GET' && reqPath === '/api/ai/providers') {
        const summary = configStore.getSanitizedSummary();
        return sendJson(res, 200, {
          success: true,
          data: summary
        });
      }

      // 2. GET /api/ai/status - Central AI status overview
      if (method === 'GET' && reqPath === '/api/ai/status') {
        const summary = configStore.getSanitizedSummary();
        const activeProviders = Object.values(summary.providers).filter(p => p.enabled && p.isConfigured);
        const softwareActiveProviders = Object.values(summary.providers).filter(p => p.enabled && p.isConfigured && p.softwareEnabled);

        return sendJson(res, 200, {
          success: true,
          status: {
            configuredCount: activeProviders.length,
            softwareIntegrationCount: softwareActiveProviders.length,
            primaryProvider: softwareActiveProviders.find(p => p.priority === 1)?.name || 'None',
            providers: summary.providers
          }
        });
      }

      // 3. POST /api/ai/gemma/test OR POST /api/ai/test - Real live connection test
      if (method === 'POST' && (reqPath === '/api/ai/gemma/test' || reqPath === '/api/ai/test')) {
        const body = await parseJsonBody(req);
        const providerName = body.provider || (reqPath.includes('gemma') ? 'gemma' : 'gemma');
        
        // Optional transient key update if submitted during test
        if (body.apiKey && typeof body.apiKey === 'string') {
          configStore.setApiKey(providerName, body.apiKey.trim());
        }
        if (body.model) {
          configStore.updateProvider(providerName, { model: body.model });
        }
        if (body.baseUrl) {
          configStore.updateProvider(providerName, { baseUrl: body.baseUrl });
        }

        const result = await aiRouter.testProvider(providerName);
        return sendJson(res, 200, {
          success: true,
          message: `Connection to ${providerName.toUpperCase()} successful`,
          data: result
        });
      }

      // 4. POST /api/ai/config - Securely update provider settings or API key
      if (method === 'POST' && reqPath === '/api/ai/config') {
        const body = await parseJsonBody(req);
        const providerName = body.provider || 'gemma';

        if (body.apiKey !== undefined) {
          configStore.setApiKey(providerName, body.apiKey.trim());
        }

        const updates = {};
        if (body.model) updates.model = body.model;
        if (body.baseUrl) updates.baseUrl = body.baseUrl;
        if (body.priority !== undefined) updates.priority = parseInt(body.priority, 10);
        if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);

        configStore.updateProvider(providerName, updates);

        return sendJson(res, 200, {
          success: true,
          message: `Provider '${providerName}' configuration updated.`,
          data: configStore.getSanitizedSummary().providers[providerName]
        });
      }

      // 5. POST /api/ai/integration - Toggle software integration enablement
      if (method === 'POST' && reqPath === '/api/ai/integration') {
        const body = await parseJsonBody(req);
        const providerName = body.provider || 'gemma';
        const softwareEnabled = Boolean(body.softwareEnabled);

        configStore.updateProvider(providerName, { softwareEnabled });

        return sendJson(res, 200, {
          success: true,
          message: `Software integration for ${providerName.toUpperCase()} ${softwareEnabled ? 'ENABLED' : 'DISABLED'}.`,
          data: configStore.getSanitizedSummary().providers[providerName]
        });
      }

      // 6. POST /api/ai/generate - Generic text completion route
      if (method === 'POST' && reqPath === '/api/ai/generate') {
        const body = await parseJsonBody(req);
        const result = await aiRouter.generate({
          prompt: body.prompt,
          systemPrompt: body.systemPrompt,
          provider: body.provider,
          model: body.model,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          isSoftwareCall: Boolean(body.isSoftwareCall)
        });

        return sendJson(res, 200, {
          success: true,
          data: result
        });
      }

      // 7. POST /api/ai/chat - Multi-turn chat completion route
      if (method === 'POST' && reqPath === '/api/ai/chat') {
        const body = await parseJsonBody(req);
        const result = await aiRouter.chat({
          messages: body.messages,
          systemPrompt: body.systemPrompt,
          provider: body.provider,
          model: body.model,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          isSoftwareCall: Boolean(body.isSoftwareCall)
        });

        return sendJson(res, 200, {
          success: true,
          data: result
        });
      }

      // 8. GET /api/ai/logs - Fetch request history logs
      if (method === 'GET' && reqPath === '/api/ai/logs') {
        const limit = parseInt(parsedUrl.query.limit || '50', 10);
        return sendJson(res, 200, {
          success: true,
          logs: logger.getLogs(limit),
          stats: logger.getStats()
        });
      }

      // Unmatched API Route
      return sendJson(res, 404, {
        success: false,
        error: `Endpoint '${reqPath}' not found.`
      });

    } catch (err) {
      console.error(`[API Error] ${method} ${reqPath}:`, err.message);
      const statusCode = err.statusCode || 500;
      return sendJson(res, statusCode, {
        success: false,
        error: err.message || 'Internal server error',
        errorType: err.type || 'SERVER_ERROR',
        provider: err.provider || 'system'
      });
    }
  }

  // Serve static files for frontend SPA
  serveStaticFile(req, res, reqPath);
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 GEMMA 4 AI INTEGRATION HUB SERVER ONLINE`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Provider Target: Gemma 4 (gemma-4-26b-a4b-it / gemma-4-31b-it)`);
  console.log(`======================================================\n`);
});
