async function testUIAndKeyFlow() {
  console.log("=== EXECUTING LOCALHOST END-TO-END VALIDATION ===");
  const baseUrl = "http://localhost:3000";

  // 1. Verify GET /api/ai/providers
  console.log("\n[Step 1] Fetching Provider Summary...");
  const res1 = await fetch(`${baseUrl}/api/ai/providers`);
  const data1 = await res1.json();
  console.log("Providers Status:", data1.data.providers.gemma.lastStatus);
  console.log("Gemma Configured:", data1.data.providers.gemma.isConfigured);

  // 2. Submit Key via Connection UI Endpoint (/api/ai/config)
  console.log("\n[Step 2] Simulating Connection UI Key Submission...");
  const res2 = await fetch(`${baseUrl}/api/ai/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "gemma",
      apiKey: "TEST_UI_KEY_SIMULATION",
      model: "gemma-4-26b-a4b-it"
    })
  });
  const data2 = await res2.json();
  console.log("Config Save Success:", data2.success);

  // 3. Verify Key Priority (UI Key should be stored & effective)
  const res3 = await fetch(`${baseUrl}/api/ai/providers`);
  const data3 = await res3.json();
  console.log("Updated Gemma API Key Configured:", data3.data.providers.gemma.apiKeyConfigured);
  console.log("Updated Gemma API Key Length:", data3.data.providers.gemma.apiKeyLength);
  if (data3.data.providers.gemma.apiKeyLength === "TEST_UI_KEY_SIMULATION".length) {
    console.log("✓ UI-saved API key successfully prioritized!");
  }

  console.log("\n=== LOCALHOST END-TO-END VALIDATION COMPLETE ===");
}

testUIAndKeyFlow().catch(console.error);
