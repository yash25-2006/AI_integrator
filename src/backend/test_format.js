const configStore = require('./ConfigStore');

async function testFormats() {
  const conf = configStore.getProviderConfig('gemma');
  const apiKey = conf.apiKey;
  const model = conf.model || 'gemma-4-26b-a4b-it';
  const baseUrl = conf.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
  const url = `${baseUrl.replace(/\/$/, '')}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  console.log("=== TESTING GEMMA FORMAT OPTIONS ===");

  // Option A: Standard user text without systemInstruction
  console.log("\n--- Option A: Plain user contents (No systemInstruction) ---");
  const resA = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "hi" }] }]
    })
  });
  const dataA = await resA.json();
  console.log(dataA.candidates?.[0]?.content?.parts?.[0]?.text);

  // Option B: Minimal systemInstruction
  console.log("\n--- Option B: System instruction in payload ---");
  const resB = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "You are a helpful AI assistant. Answer directly." }] },
      contents: [{ role: "user", parts: [{ text: "hi" }] }]
    })
  });
  const dataB = await resB.json();
  console.log(dataB.candidates?.[0]?.content?.parts?.[0]?.text);
}

testFormats().catch(console.error);
