class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 200;
  }

  /**
   * Log an AI request execution
   * @param {Object} entry
   */
  logRequest({ provider, model, status, latencyMs, timeToFirstTokenMs, tokens, errorCategory, promptPreview }) {
    const entry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      provider: provider || 'unknown',
      model: model || 'unknown',
      status: status || 'SUCCESS', // 'SUCCESS' | 'ERROR' | 'FALLBACK'
      timeToFirstTokenMs: timeToFirstTokenMs || (latencyMs ? Math.round(latencyMs * 0.3) : 0),
      latencyMs: latencyMs || 0,
      tokens: tokens || null,
      errorCategory: errorCategory || null,
      promptPreview: promptPreview ? (promptPreview.substring(0, 60) + (promptPreview.length > 60 ? '...' : '')) : ''
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    return entry;
  }

  getLogs(limit = 50) {
    return this.logs.slice(0, limit);
  }

  getStats() {
    const total = this.logs.length;
    if (total === 0) {
      return { totalRequests: 0, successCount: 0, errorCount: 0, avgLatencyMs: 0, successRate: '100%' };
    }
    const successCount = this.logs.filter(l => l.status === 'SUCCESS').length;
    const errorCount = total - successCount;
    const sumLatency = this.logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0);
    const avgLatencyMs = Math.round(sumLatency / total);
    const successRate = Math.round((successCount / total) * 100) + '%';

    return {
      totalRequests: total,
      successCount,
      errorCount,
      avgLatencyMs,
      successRate
    };
  }

  clear() {
    this.logs = [];
  }
}

module.exports = new Logger();
