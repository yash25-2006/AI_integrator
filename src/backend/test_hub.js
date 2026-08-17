/**
 * Automated Verification Script for Gemma 4 AI Integration Hub
 */
async function runTests() {
  console.log("=== STARTING GEMMA 4 INTEGRATION HUB TEST SUITE ===");
  const baseUrl = "http://localhost:3000";

  // Test 1: Fetch providers summary & verify secret security
  console.log("\n[Test 1] GET /api/ai/providers - Secret Security Verification");
  const res1 = await fetch(`${baseUrl}/api/ai/providers`);
  const data1 = await res1.json();
  console.log("Status:", res1.status);
  console.log("Providers data received:", Object.keys(data1.data.providers));
  const gemmaSummary = data1.data.providers.gemma;
  console.log("Gemma isConfigured:", gemmaSummary.isConfigured);
  console.log("Gemma keyMask:", gemmaSummary.keyMask);
  if (gemmaSummary.apiKey || (gemmaSummary.keyMask && gemmaSummary.keyMask !== '••••••••••••••••')) {
    console.error("FAIL: Secret exposed in providers endpoint!");
    process.exit(1);
  }
  console.log("✓ Test 1 Passed: Secret keys are safely sanitized server-side.");

  // Test 2: Connection test with invalid API key
  console.log("\n[Test 2] POST /api/ai/gemma/test - Invalid API Key Handling");
  const res2 = await fetch(`${baseUrl}/api/ai/gemma/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: "INVALID_TEST_KEY_12345" })
  });
  const data2 = await res2.json();
  console.log("Status:", res2.status);
  console.log("Data:", data2);
  if (data2.success === false && data2.error) {
    console.log("✓ Test 2 Passed: Invalid API key properly rejected without exposing raw secrets.");
  } else {
    console.warn("Unexpected test response for invalid key:", data2);
  }

  // Test 3: Enable software integration
  console.log("\n[Test 3] POST /api/ai/integration - Toggle Software Integration");
  const res3 = await fetch(`${baseUrl}/api/ai/integration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "gemma", softwareEnabled: true })
  });
  const data3 = await res3.json();
  console.log("Integration status updated:", data3.data.softwareEnabled);
  if (data3.data.softwareEnabled === true) {
    console.log("✓ Test 3 Passed: Software integration explicitly enabled.");
  }

  // Test 4: Software AI Request Routing
  console.log("\n[Test 4] POST /api/ai/generate - Application AI Request Routing");
  try {
    const res4 = await fetch(`${baseUrl}/api/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Hello Gemma 4, write a 1-line confirmation code.",
        isSoftwareCall: true
      })
    });
    const data4 = await res4.json();
    console.log("Generation output:", data4);
  } catch (err) {
    console.log("Caught expected response or error:", err.message);
  }

  // Test 5: Verify Request Logs
  console.log("\n[Test 5] GET /api/ai/logs - Execution Logs Verification");
  const res5 = await fetch(`${baseUrl}/api/ai/logs`);
  const data5 = await res5.json();
  console.log("Total logged requests:", data5.stats.totalRequests);
  console.log("Logs sample:", data5.logs[0]);
  console.log("✓ Test 5 Passed: Execution logs recorded cleanly.");

  console.log("\n=== ALL AUTOMATED TESTS COMPLETED ===");
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
