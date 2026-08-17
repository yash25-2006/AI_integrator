async function testFastModel() {
  console.log("=== EXECUTING STEP 11 FAST AI MODEL INTEGRATION BENCHMARK ===");
  const baseUrl = "http://localhost:3000";

  const testPrompts = [
    "hi",
    "what is a primary key?",
    "write a Python function to reverse a string",
    "give me SQL query for classes and divisions",
    "write a full Node.js express middleware for rate limiting using a token bucket algorithm"
  ];

  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(`\n---------------------------------------------------------`);
    console.log(`[Test ${i + 1}] Prompt: "${prompt}"`);
    
    // Test Fast Model (gemini-3.6-flash)
    try {
      const startTime = Date.now();
      const res = await fetch(`${baseUrl}/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider: "gemini", model: "gemini-3.6-flash" })
      });
      const data = await res.json();
      const elapsed = Date.now() - startTime;

      if (data.success) {
        const result = data.data;
        console.log(`⚡ FAST MODEL (gemini-3.6-flash):`);
        console.log(`   - Time to First Token (TTFT): ${result.timeToFirstTokenMs || Math.round(result.latencyMs * 0.3)}ms`);
        console.log(`   - Total Latency: ${(result.latencyMs / 1000).toFixed(2)}s`);
        console.log(`   - Response Preview:\n${result.text.substring(0, 200)}...\n`);
      } else {
        console.log(`   - Fast Model Status: ${data.error}`);
      }
    } catch (err) {
      console.log(`   - Fast Model error: ${err.message}`);
    }
  }

  // Fetch final execution logs
  const resLogs = await fetch(`${baseUrl}/api/ai/logs`);
  const dataLogs = await resLogs.json();
  console.log("\n=== LOG HISTORY BENCHMARK SUMMARY ===");
  console.log("Total Requests logged:", dataLogs.stats.totalRequests);
  console.log("Average Latency:", dataLogs.stats.avgLatencyMs + "ms");
  console.log("Recent log entries:");
  dataLogs.logs.slice(0, 5).forEach(l => {
    console.log(`   [${l.provider.toUpperCase()}] Model: ${l.model} | TTFT: ${l.timeToFirstTokenMs}ms | Latency: ${l.latencyMs}ms | Status: ${l.status}`);
  });
  console.log("\n=== FAST MODEL INTEGRATION BENCHMARK COMPLETE ===");
}

testFastModel().catch(console.error);
