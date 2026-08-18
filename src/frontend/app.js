/**
 * Gemma 4 AI Integration Hub - Frontend Application State & Router
 */
document.addEventListener('DOMContentLoaded', () => {
  const state = {
    activeTab: 'overview',
    providers: {},
    logs: [],
    stats: {},
    keyIsMasked: true
  };

  // --- DOM ELEMENTS ---
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');

  // Status Badges & Dots
  const sidebarStatusDot = document.getElementById('sidebar-status-dot');
  const sidebarStatusText = document.getElementById('sidebar-status-text');
  const topStatusBadge = document.getElementById('top-status-badge');
  const topStatusDot = document.getElementById('top-status-dot');
  const topStatusText = document.getElementById('top-status-text');
  const topModelBadge = document.getElementById('top-model-badge');

  // Overview Tab Elements
  const overviewModelId = document.getElementById('overview-model-id');
  const overviewHealthStatus = document.getElementById('overview-health-status');
  const overviewIntegrationStatus = document.getElementById('overview-integration-status');
  const overviewLatency = document.getElementById('overview-latency');
  const overviewModelSelect = document.getElementById('overview-model-select');

  // Connection Tab Elements
  const connApiKey = document.getElementById('conn-api-key');
  const connBaseUrl = document.getElementById('conn-base-url');
  const connDefaultModel = document.getElementById('conn-default-model');
  const btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
  const btnTestConnection = document.getElementById('btn-test-connection');
  const btnSaveConfig = document.getElementById('btn-save-config');
  const connKeyStatusText = document.getElementById('conn-key-status-text');
  const connectionTestResult = document.getElementById('connection-test-result');
  const testResultTitle = document.getElementById('test-result-title');
  const testResultBody = document.getElementById('test-result-body');

  // Integration Tab Elements
  const integrationActiveBadge = document.getElementById('integration-active-badge');
  const btnToggleSoftwareIntegration = document.getElementById('btn-toggle-software-integration');
  const integrationToggleSubtext = document.getElementById('integration-toggle-subtext');
  const integrationPrioritySelect = document.getElementById('integration-priority-select');

  // Playground Elements
  const pgModelSelect = document.getElementById('pg-model-select');
  const pgSystemPrompt = document.getElementById('pg-system-prompt');
  const pgTemperature = document.getElementById('pg-temperature');
  const pgTempVal = document.getElementById('pg-temp-val');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const btnSendChat = document.getElementById('btn-send-chat');
  const btnClearChat = document.getElementById('btn-clear-chat');
  const pgLatencyPill = document.getElementById('pg-latency-pill');
  const pgTokensPill = document.getElementById('pg-tokens-pill');

  // Tool Elements
  const toolCodeInput = document.getElementById('tool-code-input');
  const btnRunCodeTool = document.getElementById('btn-run-code-tool');
  const toolCodeOutput = document.getElementById('tool-code-output');
  const toolCodeText = document.getElementById('tool-code-text');

  const toolDocInput = document.getElementById('tool-doc-input');
  const btnRunDocTool = document.getElementById('btn-run-doc-tool');
  const toolDocOutput = document.getElementById('tool-doc-output');
  const toolDocText = document.getElementById('tool-doc-text');

  // Logs Elements
  const btnRefreshLogs = document.getElementById('btn-refresh-logs');
  const logsTbody = document.getElementById('logs-tbody');
  const statTotalReq = document.getElementById('stat-total-req');
  const statSuccessRate = document.getElementById('stat-success-rate');
  const statAvgLatency = document.getElementById('stat-avg-latency');

  // Quick Action Buttons
  const btnQuickTest = document.getElementById('btn-quick-test');
  const btnQuickEnable = document.getElementById('btn-quick-enable');

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- NAVIGATION TAB ROUTER ---
  function switchTab(tabId) {
    state.activeTab = tabId;

    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Update Header Title
    const titleMap = {
      'overview': 'Gemma 4 Overview',
      'playground': 'Gemma 4 Playground',
      'connection': 'Provider Connection & Credentials',
      'integration': 'Connect Gemma 4 to Existing Software',
      'logs': 'Real-Time Execution Logs',
      'software-tools': 'Built-in Application AI Tools'
    };
    if (pageTitle) pageTitle.textContent = titleMap[tabId] || 'Gemma 4 Hub';

    if (tabId === 'logs') fetchLogs();
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      window.location.hash = tabId;
      switchTab(tabId);
    });
  });

  // Handle direct hash navigation
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    if (document.getElementById(`tab-${hash}`)) {
      switchTab(hash);
    }
  }

  // --- API DATA FETCHING ---
  async function fetchProviders() {
    try {
      const res = await fetch('/api/ai/providers');
      const data = await res.json();
      if (data.success) {
        state.providers = data.data.providers || {};
        updateUI();
      }
    } catch (err) {
      console.error('Failed to fetch provider status:', err);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch('/api/ai/logs');
      const data = await res.json();
      if (data.success) {
        state.logs = data.logs || [];
        state.stats = data.stats || {};
        renderLogs();
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }

  // --- UI RENDER & UPDATE ---
  function updateUI() {
    const gemma = state.providers.gemma || {};
    const status = gemma.lastStatus || 'Not Configured';
    const isConfigured = gemma.isConfigured;
    const softwareEnabled = gemma.softwareEnabled;
    const model = gemma.model || 'gemma-4-26b-a4b-it';
    const latency = gemma.lastLatencyMs ? `${(gemma.lastLatencyMs / 1000).toFixed(2)}s` : '--';

    // 1. Sidebar & Header Badges
    const statusDotClass = status === 'Healthy' ? 'online' : (status === 'Testing' ? 'testing' : (status === 'Error' ? 'error' : 'offline'));
    
    if (sidebarStatusDot) sidebarStatusDot.className = `status-indicator-dot ${statusDotClass}`;
    if (sidebarStatusText) sidebarStatusText.textContent = status;

    if (topStatusDot) topStatusDot.className = `status-indicator-dot ${statusDotClass}`;
    if (topStatusText) topStatusText.textContent = status;
    if (topModelBadge) topModelBadge.textContent = model;

    // 2. Overview Card
    if (overviewModelId) overviewModelId.textContent = model;
    if (overviewHealthStatus) overviewHealthStatus.textContent = `● ${status}`;
    if (overviewIntegrationStatus) {
      overviewIntegrationStatus.textContent = softwareEnabled ? 'Active (Primary)' : 'Disabled';
      overviewIntegrationStatus.style.color = softwareEnabled ? '#10b981' : '#9ca3af';
    }
    if (overviewLatency) overviewLatency.textContent = latency;
    if (overviewModelSelect) overviewModelSelect.value = model;

    // 3. Connection Tab
    const isEditingApiKey = (document.activeElement === connApiKey) || !state.keyIsMasked;
    const isEditingBaseUrl = (document.activeElement === connBaseUrl);
    
    if (connBaseUrl && gemma.baseUrl && !isEditingBaseUrl) {
      connBaseUrl.value = gemma.baseUrl;
    }
    if (connDefaultModel && model && document.activeElement !== connDefaultModel) {
      connDefaultModel.value = model;
    }
    if (connApiKey && !isEditingApiKey) {
      if (isConfigured) {
        connApiKey.value = '••••••••••••••••';
        connApiKey.type = 'password';
        if (connKeyStatusText) connKeyStatusText.textContent = 'Status: Configured (Key stored server-side).';
      } else {
        connApiKey.value = '';
        if (connKeyStatusText) connKeyStatusText.textContent = 'Status: Not Configured.';
      }
    }

    // 4. Integration Tab
    if (integrationActiveBadge) {
      integrationActiveBadge.textContent = `Status: ${softwareEnabled ? 'Active' : 'Disabled'}`;
      integrationActiveBadge.className = softwareEnabled ? 'badge badge-accent' : 'badge';
    }
    if (btnToggleSoftwareIntegration) {
      btnToggleSoftwareIntegration.textContent = softwareEnabled ? 'Disable for Software' : 'Enable Gemma for Software';
      btnToggleSoftwareIntegration.className = softwareEnabled ? 'btn btn-secondary' : 'btn btn-primary';
    }
    if (integrationToggleSubtext) {
      integrationToggleSubtext.textContent = softwareEnabled
        ? 'Active: All application AI requests automatically route through Gemma 4.'
        : 'Disabled: Existing features will not call Gemma 4 until enabled.';
    }
    if (integrationPrioritySelect && gemma.priority) {
      integrationPrioritySelect.value = String(gemma.priority);
    }
  }

  // --- CONNECTION FORM HANDLERS ---
  if (btnToggleKeyVisibility) {
    btnToggleKeyVisibility.addEventListener('click', () => {
      if (connApiKey.value === '••••••••••••••••') {
        connApiKey.value = '';
        state.keyIsMasked = false;
      }
      connApiKey.type = connApiKey.type === 'password' ? 'text' : 'password';
      btnToggleKeyVisibility.textContent = connApiKey.type === 'password' ? 'Show' : 'Hide';
    });
  }

  // Live Test Connection Handler
  async function runConnectionTest() {
    const rawKey = connApiKey.value.trim();
    const model = connDefaultModel.value;
    const baseUrl = connBaseUrl.value.trim();

    if (btnTestConnection) btnTestConnection.disabled = true;
    if (sidebarStatusText) sidebarStatusText.textContent = 'Testing...';
    if (sidebarStatusDot) sidebarStatusDot.className = 'status-indicator-dot testing';

    if (connectionTestResult) {
      connectionTestResult.classList.remove('hidden', 'success', 'error');
      testResultTitle.textContent = 'Testing connection...';
      testResultBody.textContent = 'Sending test request to Gemma API endpoint...';
    }

    try {
      const payload = { provider: 'gemma', model, baseUrl };
      if (rawKey && rawKey !== '••••••••••••••••') {
        payload.apiKey = rawKey;
      }

      const res = await fetch('/api/ai/gemma/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        const result = data.data;
        if (connectionTestResult) {
          connectionTestResult.classList.add('success');
          testResultTitle.textContent = '✓ Connection Successful';
          testResultBody.innerHTML = `
            <div><strong>Provider:</strong> Gemma</div>
            <div><strong>Model:</strong> ${result.model}</div>
            <div><strong>Latency:</strong> ${(result.latencyMs / 1000).toFixed(2)}s</div>
            <div><strong>Response Sample:</strong> "${result.responseSample}"</div>
          `;
        }
        showToast('Gemma 4 connection test successful!');
      } else {
        if (connectionTestResult) {
          connectionTestResult.classList.add('error');
          testResultTitle.textContent = '✕ Connection Failed';
          testResultBody.innerHTML = `<div><strong>Reason:</strong> ${data.error}</div>`;
        }
        showToast('Connection failed: ' + data.error, 'error');
      }
    } catch (err) {
      if (connectionTestResult) {
        connectionTestResult.classList.add('error');
        testResultTitle.textContent = '✕ Connection Error';
        testResultBody.textContent = err.message;
      }
      showToast('Network error during connection test', 'error');
    } finally {
      if (btnTestConnection) btnTestConnection.disabled = false;
      await fetchProviders();
    }
  }

  if (btnTestConnection) btnTestConnection.addEventListener('click', runConnectionTest);
  if (btnQuickTest) btnQuickTest.addEventListener('click', () => {
    switchTab('connection');
    runConnectionTest();
  });

  // Save Configuration Handler
  if (btnSaveConfig) {
    btnSaveConfig.addEventListener('click', async () => {
      const rawKey = connApiKey.value.trim();
      const model = connDefaultModel.value;
      const baseUrl = connBaseUrl.value.trim();

      const payload = { provider: 'gemma', model, baseUrl };
      if (rawKey && rawKey !== '••••••••••••••••') {
        payload.apiKey = rawKey;
      }

      try {
        const res = await fetch('/api/ai/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast('Gemma 4 configuration saved securely.');
          state.keyIsMasked = true;
          await fetchProviders();
        } else {
          showToast('Failed to save config: ' + data.error, 'error');
        }
      } catch (err) {
        showToast('Error saving configuration.', 'error');
      }
    });
  }

  // --- SOFTWARE INTEGRATION TOGGLE ---
  async function toggleSoftwareIntegration() {
    const gemma = state.providers.gemma || {};
    const nextState = !gemma.softwareEnabled;

    try {
      const res = await fetch('/api/ai/integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemma', softwareEnabled: nextState })
      });

      const data = await res.json();
      if (data.success) {
        showToast(nextState ? 'Gemma 4 enabled for application software.' : 'Gemma 4 software integration disabled.');
        await fetchProviders();
      } else {
        showToast(data.error || 'Failed to toggle integration', 'error');
      }
    } catch (err) {
      showToast('Error toggling software integration.', 'error');
    }
  }

  if (btnToggleSoftwareIntegration) btnToggleSoftwareIntegration.addEventListener('click', toggleSoftwareIntegration);
  if (btnQuickEnable) btnQuickEnable.addEventListener('click', () => {
    switchTab('integration');
    toggleSoftwareIntegration();
  });

  if (integrationPrioritySelect) {
    integrationPrioritySelect.addEventListener('change', async () => {
      const priority = parseInt(integrationPrioritySelect.value, 10);
      await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemma', priority })
      });
      showToast(`Gemma 4 priority updated to ${priority}`);
      await fetchProviders();
    });
  }

  if (overviewModelSelect) {
    overviewModelSelect.addEventListener('change', async () => {
      const model = overviewModelSelect.value;
      await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemma', model })
      });
      showToast(`Selected model set to ${model}`);
      await fetchProviders();
    });
  }

  // --- PLAYGROUND CHAT INTERACTION ---
  if (pgTemperature && pgTempVal) {
    pgTemperature.addEventListener('input', () => {
      pgTempVal.textContent = pgTemperature.value;
    });
  }

  async function sendChatMessage() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    const systemPrompt = pgSystemPrompt.value.trim();
    const model = pgModelSelect.value;
    const temperature = parseFloat(pgTemperature.value);

    // Append User Message to UI
    appendChatMessage('user', prompt);
    chatInput.value = '';
    btnSendChat.disabled = true;

    const targetProvider = model.includes('gemini') ? 'gemini' : 'gemma';
    const loadingMsgEl = appendChatMessage('assistant', `${model.includes('gemini') ? 'Gemini 2.0 Flash' : 'Gemma 4'} is thinking...`);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetProvider,
          model,
          prompt,
          systemPrompt,
          temperature
        })
      });

      const data = await res.json();

      if (data.success) {
        const result = data.data;
        loadingMsgEl.querySelector('.message-content').textContent = result.text || '(No response text)';
        
        const ttftMs = result.timeToFirstTokenMs || Math.round(result.latencyMs * 0.3);
        if (pgLatencyPill) pgLatencyPill.textContent = `TTFT: ${ttftMs}ms | Total: ${(result.latencyMs / 1000).toFixed(2)}s`;
        if (pgTokensPill && result.usage) {
          pgTokensPill.textContent = `Tokens: In ${result.usage.inputTokens} / Out ${result.usage.outputTokens}`;
        }
      } else {
        loadingMsgEl.querySelector('.message-content').innerHTML = `
          <span style="color: #f43f5e;"><strong>Error (${targetProvider.toUpperCase()}):</strong> ${data.error}</span>
        `;
      }
    } catch (err) {
      loadingMsgEl.querySelector('.message-content').innerHTML = `
        <span style="color: #f43f5e;"><strong>Network Error:</strong> Could not connect to backend server.</span>
      `;
    } finally {
      btnSendChat.disabled = false;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function appendChatMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}`;
    msgDiv.innerHTML = `
      <div class="message-avatar">${role === 'user' ? 'YOU' : 'GEMMA'}</div>
      <div class="message-content"></div>
    `;
    msgDiv.querySelector('.message-content').textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgDiv;
  }

  if (btnSendChat) btnSendChat.addEventListener('click', sendChatMessage);
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  if (btnClearChat) {
    btnClearChat.addEventListener('click', () => {
      chatMessages.innerHTML = `
        <div class="chat-message system-welcome">
          <div class="message-avatar">AI</div>
          <div class="message-content">
            <p><strong>Gemma 4 Playground Ready</strong></p>
            <p>Conversation reset. Enter a new prompt to continue testing.</p>
          </div>
        </div>
      `;
    });
  }

  // --- APPLICATION AI TOOLS DEMO ---
  // Tool 1: AI Code Refactoring Assistant
  if (btnRunCodeTool) {
    btnRunCodeTool.addEventListener('click', async () => {
      const code = toolCodeInput.value.trim();
      if (!code) {
        showToast('Please enter code snippet to refactor.', 'error');
        return;
      }

      btnRunCodeTool.disabled = true;
      btnRunCodeTool.textContent = 'Executing via AI Router...';
      toolCodeOutput.classList.remove('hidden');
      toolCodeText.textContent = 'Routing request to central AI provider...';

      try {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Refactor and optimize the following code snippet. Provide the improved code and a brief bullet list of optimizations:\n\n\`\`\`javascript\n${code}\n\`\`\``,
            systemPrompt: 'You are an expert software performance engineer. Provide clean, modern refactored code.',
            isSoftwareCall: true
          })
        });

        const data = await res.json();
        if (data.success) {
          toolCodeText.textContent = data.data.text;
          showToast(`Code refactoring complete via ${data.data.provider.toUpperCase()} (${data.data.model})`);
        } else {
          toolCodeText.textContent = `Error: ${data.error}`;
          showToast(data.error, 'error');
        }
      } catch (err) {
        toolCodeText.textContent = 'Failed to execute tool call.';
      } finally {
        btnRunCodeTool.disabled = false;
        btnRunCodeTool.textContent = 'Refactor & Optimize Code';
      }
    });
  }

  // Tool 2: Smart Document Summarizer
  if (btnRunDocTool) {
    btnRunDocTool.addEventListener('click', async () => {
      const text = toolDocInput.value.trim();
      if (!text) {
        showToast('Please paste document text to summarize.', 'error');
        return;
      }

      btnRunDocTool.disabled = true;
      btnRunDocTool.textContent = 'Summarizing via AI Router...';
      toolDocOutput.classList.remove('hidden');
      toolDocText.textContent = 'Routing summary request to Gemma 4 provider...';

      try {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Summarize the following text into 3 executive bullet points and key takeaways:\n\n${text}`,
            systemPrompt: 'You are a professional executive editor.',
            isSoftwareCall: true
          })
        });

        const data = await res.json();
        if (data.success) {
          toolDocText.textContent = data.data.text;
          showToast(`Summary generated via ${data.data.provider.toUpperCase()}`);
        } else {
          toolDocText.textContent = `Error: ${data.error}`;
          showToast(data.error, 'error');
        }
      } catch (err) {
        toolDocText.textContent = 'Failed to generate summary.';
      } finally {
        btnRunDocTool.disabled = false;
        btnRunDocTool.textContent = 'Summarize Document';
      }
    });
  }

  // --- LOGS TABLE RENDER ---
  function renderLogs() {
    if (statTotalReq) statTotalReq.textContent = state.stats.totalRequests || 0;
    if (statSuccessRate) statSuccessRate.textContent = state.stats.successRate || '100%';
    if (statAvgLatency) statAvgLatency.textContent = (state.stats.avgLatencyMs || 0) + 'ms';

    if (!logsTbody) return;

    if (!state.logs || state.logs.length === 0) {
      logsTbody.innerHTML = `<tr><td colspan="7" class="text-center" style="text-align:center; padding:24px;">No execution logs recorded yet.</td></tr>`;
      return;
    }

    logsTbody.innerHTML = state.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const statusClass = log.status === 'SUCCESS' ? 'color:#10b981' : (log.status === 'FALLBACK' ? 'color:#f59e0b' : 'color:#f43f5e');
      const tokensStr = log.tokens ? `${log.tokens.inputTokens || 0} / ${log.tokens.outputTokens || 0}` : '--';
      const latencyStr = log.latencyMs ? `${(log.latencyMs / 1000).toFixed(2)}s` : '--';

      return `
        <tr>
          <td style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted);">${time}</td>
          <td><strong style="text-transform:uppercase;">${log.provider}</strong></td>
          <td style="font-family:var(--font-mono); color:#38bdf8;">${log.model}</td>
          <td><strong style="${statusClass}">${log.status}</strong></td>
          <td>${latencyStr}</td>
          <td>${tokensStr}</td>
          <td style="color:var(--text-muted); font-size:0.8rem;">${escapeHtml(log.promptPreview)}</td>
        </tr>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  if (btnRefreshLogs) btnRefreshLogs.addEventListener('click', fetchLogs);

  // Initial Boot Fetch & Periodic Polling
  fetchProviders();
  setInterval(fetchProviders, 15000);
});
