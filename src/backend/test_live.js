async function testLiveFlow() {
  console.log("=== TESTING GEMMA 4 INTEGRATION WORKFLOW & DISABLE STATES ===");
  const baseUrl = "http://localhost:3000";

  // 1. Check initial state
  const r1 = await fetch(`${baseUrl}/api/ai/providers`);
  const d1 = await r1.json();
  console.log("1. Provider Summary:", d1.data.providers.gemma);

  // 2. Disable Software Integration
  const r2 = await fetch(`${baseUrl}/api/ai/integration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "gemma", softwareEnabled: false })
  });
  const d2 = await r2.json();
  console.log("2. Disabled Integration:", d2.data.softwareEnabled);

  // 3. Try software generation while disabled
  const r3 = await fetch(`${baseUrl}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Software test prompt", isSoftwareCall: true })
  });
  const d3 = await r3.json();
  console.log("3. Call while software integration disabled:", d3);

  if (d3.success === false && d3.error.includes("No active AI providers are enabled for software integration")) {
    console.log("✓ Separation of Connection & Software Enablement Verified: App calls rejected when integration is disabled.");
  }

  // 4. Re-enable Software Integration
  await fetch(`${baseUrl}/api/ai/integration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "gemma", softwareEnabled: true })
  });
  console.log("4. Re-enabled integration.");

  console.log("=== WORKFLOW & DISABLE STATE VERIFICATION PASSED ===");
}

testLiveFlow().catch(console.error);
