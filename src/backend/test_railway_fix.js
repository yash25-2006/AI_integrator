async function testRailwayFix() {
  console.log("=== EXECUTING RAILWAY DEPLOYMENT FIX TEST SUITE ===");
  const baseUrl = "http://localhost:3000";

  // 1. Verify provider summary & diagnostic metadata
  console.log("\n[Test 1] GET /api/ai/providers - Diagnostics Verification");
  const res1 = await fetch(`${baseUrl}/api/ai/providers`);
  const data1 = await res1.json();
  console.log("Environment:", data1.data.environment);
  console.log("Gemma Configured:", data1.data.providers.gemma.isConfigured);
  console.log("Gemma API Key Configured:", data1.data.providers.gemma.apiKeyConfigured);
  console.log("Gemma API Key Length:", data1.data.providers.gemma.apiKeyLength);
  console.log("Gemma Key Mask:", data1.data.providers.gemma.keyMask);

  if (data1.data.providers.gemma.apiKey || data1.data.providers.gemma.keyMask !== '••••••••••••••••') {
    console.error("FAIL: Raw key exposed in summary!");
    process.exit(1);
  }
  console.log("✓ Test 1 Passed: Diagnostic info is safe and secrets remain sanitized.");

  // 2. Perform live connection test
  console.log("\n[Test 2] POST /api/ai/gemma/test - Connection Test");
  const res2 = await fetch(`${baseUrl}/api/ai/gemma/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const data2 = await res2.json();
  console.log("Test Status Code:", res2.status);
  console.log("Test Response:", data2);
  if (data2.success) {
    console.log("✓ Test 2 Passed: Real live Gemma connection test successful!");
  }

  // 3. Test prompt generation
  console.log("\n[Test 3] POST /api/ai/generate - Prompt Generation Test");
  const res3 = await fetch(`${baseUrl}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "hello", provider: "gemma" })
  });
  const data3 = await res3.json();
  console.log("Generation output:", data3);
  if (data3.success) {
    console.log("✓ Test 3 Passed: Prompt generation successful!");
  }

  console.log("\n=== RAILWAY FIX VERIFICATION COMPLETE ===");
}

testRailwayFix().catch(console.error);
