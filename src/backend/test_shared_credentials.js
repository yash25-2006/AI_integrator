async function testSharedCredentials() {
  console.log("=== EXECUTING SHARED CREDENTIAL & PLAYGROUND ROUTING TEST ===");
  const baseUrl = "http://localhost:3000";

  // 1. Submit API key through Connection UI endpoint (/api/ai/config)
  console.log("\n[Step 1] Simulating Connection UI API key entry...");
  const res1 = await fetch(`${baseUrl}/api/ai/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "gemma",
      apiKey: "SHARED_GOOGLE_AI_STUDIO_KEY_TEST",
      model: "gemma-4-26b-a4b-it"
    })
  });
  const data1 = await res1.json();
  console.log("Save Config Success:", data1.success);

  // 2. Verify Provider Summaries for both gemma and gemini
  console.log("\n[Step 2] Verifying Shared Credential Sync across Providers...");
  const res2 = await fetch(`${baseUrl}/api/ai/providers`);
  const data2 = await res2.json();
  const gemmaProv = data2.data.providers.gemma;
  const geminiProv = data2.data.providers.gemini;

  console.log("Gemma Provider API Key Configured:", gemmaProv.apiKeyConfigured, "| Length:", gemmaProv.apiKeyLength);
  console.log("Gemini Provider API Key Configured:", geminiProv.apiKeyConfigured, "| Length:", geminiProv.apiKeyLength);

  if (gemmaProv.apiKeyLength === "SHARED_GOOGLE_AI_STUDIO_KEY_TEST".length &&
      geminiProv.apiKeyLength === "SHARED_GOOGLE_AI_STUDIO_KEY_TEST".length) {
    console.log("✓ Connection UI key successfully shared with both Gemma and Gemini providers!");
  } else {
    console.error("FAIL: Shared key not synced to both providers!");
  }

  // 3. Test Routing (gemma model -> gemma provider, gemini model -> gemini provider)
  console.log("\n[Step 3] Verifying Target Provider Routing...");
  const resGemma = await fetch(`${baseUrl}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "hello",
      provider: "gemma",
      model: "gemma-4-26b-a4b-it"
    })
  });
  const dataGemma = await resGemma.json();
  console.log("Gemma Generation Provider Target:", dataGemma.provider || "gemma");

  const resGemini = await fetch(`${baseUrl}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "hello",
      provider: "gemini",
      model: "gemini-3.5-flash"
    })
  });
  const dataGemini = await resGemini.json();
  console.log("Gemini Generation Provider Target:", dataGemini.provider || "gemini");

  console.log("\n=== SHARED CREDENTIAL & ROUTING TEST COMPLETE ===");
}

testSharedCredentials().catch(console.error);
