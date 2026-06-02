import assert from "node:assert/strict";

function normalizeCustomPrompts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      name: typeof item?.name === "string" ? item.name.trim() : "",
      prompt: typeof item?.prompt === "string" ? item.prompt.trim() : ""
    }))
    .filter((item) => item.name && item.prompt)
    .slice(0, 6);
}

function buildJsonTransformMessages(userPrompt, selection) {
  return [
    {
      role: "system",
      content:
        'Apply the user prompt to the selected text. Return valid JSON only with exactly one key: "question". The value must contain only the transformed output, with no explanation, no markdown, no label echo, and no extra keys.'
    },
    {
      role: "user",
      content: `User prompt:
${userPrompt.trim()}

Selected text:
${selection}

Export as JSON:
{"question":"$output"}`
    }
  ];
}

assert.deepEqual(normalizeCustomPrompts([{ name: " Summary ", prompt: " Summarize " }, { name: "", prompt: "x" }]), [
  { name: "Summary", prompt: "Summarize" }
]);
assert.equal(normalizeCustomPrompts(new Array(8).fill({ name: "A", prompt: "B" })).length, 6);
const messages = buildJsonTransformMessages("Explain clinically", "MPN treatment");
assert.equal(messages.length, 2);
assert.match(messages[0].content, /no label echo/);
assert.match(messages[1].content, /User prompt:\nExplain clinically/);
assert.match(messages[1].content, /Selected text:\nMPN treatment/);
assert.match(messages[1].content, /Export as JSON/);
