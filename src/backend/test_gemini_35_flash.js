async function testGemini35Flash() {
  console.log("=== EXECUTING GEMINI 3.5 FLASH MODEL VALIDATION ===");
  const baseUrl = "http://localhost:3000";

  // 1. Check Gemini Provider Config
  console.log("\n[Step 1] Fetching Provider Status...");
  const res1 = await fetch(`${baseUrl}/api/ai/providers`);
  const data1 = await res1.json();
  console.log("Gemini Model configured:", data1.data.providers.gemini.model);
  console.log("Gemini Configured:", data1.data.providers.gemini.isConfigured);

  // 2. Test Gemini Generation ("hello")
  console.log("\n[Step 2] Testing Gemini 3.5 Flash Generation ('hello')...");
  try {
    const res2 = await fetch(`${baseUrl}/api/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "hello",
        provider: "gemini",
        model: "gemini-3.5-flash"
      })
    });
    const data2 = await res2.json();
    console.log("Response Success:", data2.success);
    if (data2.success) {
      console.log("Provider:", data2.data.provider);
      console.log("Model:", data2.data.model);
      console.log("Response text:", data2.data.text);
      console.log("Latency:", data2.data.latencyMs + "ms");
      console.log("✓ Gemini 3.5 Flash test PASSED!");
    } else {
      console.log("Gemini status message:", data2.error);
    }
  } catch (err) {
    console.error("Test error:", err.message);
  }

  console.log("\n=== GEMINI 3.5 FLASH VALIDATION COMPLETE ===");
}

testGemini35Flash().catch(console.error);
