async function testResponseQuality() {
  console.log("=== TESTING GEMMA 4 RESPONSE QUALITY ===");
  const baseUrl = "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "give me sql query for classes and div",
        provider: "gemma"
      })
    });

    const data = await res.json();
    console.log("Response Status:", res.status);
    if (data.success) {
      console.log("\n--- GENERATED TEXT OUTPUT ---");
      console.log(data.data.text);
      console.log("-----------------------------\n");
      const hasMetaText = data.data.text.includes("* User wants") || data.data.text.includes("* Scenario A:") || data.data.text.includes("* Problem:");
      console.log("Has meta-reasoning text?", hasMetaText ? "YES (FAIL)" : "NO (PASS)");
    } else {
      console.log("Error (expected if API key quota exceeded):", data.error);
    }
  } catch (err) {
    console.error("Test error:", err);
  }
}

testResponseQuality();
