function cleanResponseText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();

  // If text contains a markdown code block
  if (cleaned.includes('```')) {
    const codeBlockMatch = cleaned.match(/(```[\s\S]*?```)/);
    if (codeBlockMatch) {
      const parts = cleaned.split(/(```[\s\S]*?```)/);
      let resultParts = [];
      for (let i = 0; i < parts.length; i++) {
        let part = parts[i].trim();
        if (!part) continue;
        if (part.startsWith('```')) {
          resultParts.push(part);
        } else {
          let filteredLines = part.split('\n').filter(line => {
            const t = line.trim();
            return !(t.startsWith('*') || t.startsWith('-') || t.startsWith('The user') || t.startsWith('Present the code') || t.startsWith('Slicing'));
          });
          if (filteredLines.length > 0) {
            resultParts.push(filteredLines.join('\n').trim());
          }
        }
      }
      return resultParts.join('\n\n').trim();
    }
  }

  // Handle explicit Direct Answer or Definition headers in raw thoughts
  if (cleaned.includes('*Direct Answer:*') || cleaned.includes('*Refining for clarity:*') || cleaned.includes('Definition:')) {
    const directMatch = cleaned.match(/\*(?:Direct Answer|Refining for clarity|Definition):\*\s*([^\n]+)/i) ||
                        cleaned.match(/Definition:\s*([^\n]+)/i);
    if (directMatch) {
      return directMatch[1].trim();
    }
  }

  // Handle quoted direct greeting
  const quoteMatch = cleaned.match(/"([^"]{3,80}\?)"/);
  if (quoteMatch && (cleaned.startsWith('The user') || cleaned.includes('*   Acknowledge') || cleaned.includes('- Greet'))) {
    return quoteMatch[1];
  }

  // Filter out internal reasoning bullet lines
  const lines = cleaned.split('\n');
  const filteredLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('*') || 
        trimmed.startsWith('- Greet') || 
        trimmed.startsWith('- Offer') || 
        trimmed.startsWith('The user said') || 
        trimmed.startsWith('The user is initiating') || 
        trimmed.startsWith('The user wants') || 
        trimmed.startsWith('(Providing a') || 
        trimmed.startsWith('Plan:') || 
        trimmed.startsWith('Reasoning:')) {
      continue;
    }

    filteredLines.push(lines[i]);
  }

  let finalRes = filteredLines.join('\n').trim();

  if (finalRes.startsWith('"') && finalRes.endsWith('"') && finalRes.length > 2) {
    finalRes = finalRes.slice(1, -1).trim();
  }

  return finalRes || text.trim();
}

const raw1 = `The user is initiating a conversation.

    *   Respond directly and naturally.
    *   Provide only the final answer (no meta-commentary).
    *   Do not mention system instructions.
"Hello! How can I help you today?" or "Hi there! How can I assist you?"`;

const raw2 = `The user is initiating a conversation.
Respond directly and naturally to the user. Provide only the final answer.

- Greet the user back.
- Offer assistance.
"Hello! How can I help you today?"`;

const raw3 = `*   Question: "what is a primary key?"
    *   Context: Database management systems (SQL, relational databases).
    *   Goal: Provide a direct, natural, and final answer.

    *   Definition: A unique identifier for each record (row) in a database table.
    *   Key properties:
        1.  Uniqueness: No two rows can have the same primary key value.
        2.  Non-nullability: It cannot be NULL (every record must have a value).
        3.  Immutability (ideally): Once assigned, it shouldn't change.
    *   Purpose: Ensures data integrity and allows for efficient searching and relationships (foreign keys) between tables.

    *   *Draft 1:* A primary key is a field in a database table that uniquely identifies each record. It must be unique and cannot be empty. It is used to connect tables.
    *   *Refining for clarity:* A primary key is a specific column (or set of columns) in a relational database table that uniquely identifies every single row within that table.

    *   Must be unique (no duplicates).
    *   Cannot contain NULL values (must have data).
    *   Only one primary key per table.

    *   *Direct Answer:* A primary key is a unique identifier for a record in a database table.
    *   *Explanation:* It ensures that every row can be specifically identified and prevents duplicate entries.
    *   *Constraints:* It must contain unique values and cannot contain NULL values.
    *   *Example:* In a "Students" table, an \`StudentID\` would be the primary key.

(Providing a concise, accurate summary).`;

const raw4 = `*   Slicing: \`s[::-1]\` (most idiomatic/fastest).
    *   \`reversed()\` function + \`join()\`: \`''.join(reversed(s))\`.
    *   Looping (manual): Building a new string.

The slicing method is the most "Pythonic" and efficient.

\`\`\`python
def reverse_string(s):
    return s[::-1]
\`\`\`

Present the code clearly.`;

console.log("=== REFINED CLEANING RESULTS ===");
console.log("Test 1 Result:", cleanResponseText(raw1));
console.log("-----------------------------------------");
console.log("Test 2 Result:", cleanResponseText(raw2));
console.log("-----------------------------------------");
console.log("Test 3 Result:", cleanResponseText(raw3));
console.log("-----------------------------------------");
console.log("Test 4 Result:", cleanResponseText(raw4));
