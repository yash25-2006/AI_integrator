async function testStep7() {
  console.log("=== EXECUTING STEP 7 MANDATORY PROMPT TESTS ===");
  const baseUrl = "http://localhost:3000";

  const testPrompts = [
    "hi",
    "hello",
    "what is a primary key?",
    "write a Python function to reverse a string"
  ];

  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(`\n[Test ${i + 1}] User: "${prompt}"`);
    try {
      const res = await fetch(`${baseUrl}/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider: "gemma" })
      });
      const data = await res.json();
      if (data.success) {
        console.log(`Gemma Response:\n${data.data.text}`);
      } else {
        console.log(`Status Error (${res.status}): ${data.error}`);
      }
    } catch (err) {
      console.log(`Request error: ${err.message}`);
    }
  }

  console.log("\n=== STEP 7 TESTS EXECUTED ===");
}

testStep7();
