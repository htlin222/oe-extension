import assert from "node:assert/strict";

const HISTORY_LIMIT = 200;
const DEFAULT_HISTORY_ENABLED = true;

// Mirrors background.js buildHistoryEntry: keeps required fields and only
// attaches optional transform fields when present.
function buildHistoryEntry(entry, id, timestamp) {
  const normalized = {
    id,
    timestamp,
    url: typeof entry.url === "string" ? entry.url : "",
    finalText: typeof entry.finalText === "string" ? entry.finalText : "",
    source: typeof entry.source === "string" ? entry.source : "selection"
  };

  if (typeof entry.original === "string" && entry.original) {
    normalized.original = entry.original;
  }
  if (typeof entry.promptName === "string" && entry.promptName) {
    normalized.promptName = entry.promptName;
  }
  if (typeof entry.promptInstruction === "string" && entry.promptInstruction) {
    normalized.promptInstruction = entry.promptInstruction;
  }
  if (typeof entry.transformed === "string" && entry.transformed) {
    normalized.transformed = entry.transformed;
  }

  return normalized;
}

// Mirrors background.js recordHistory: gated by enabled flag, newest first, capped.
function recordHistory(existing, entry, { enabled = DEFAULT_HISTORY_ENABLED } = {}) {
  if (enabled === false) {
    return existing;
  }
  return [entry, ...existing].slice(0, HISTORY_LIMIT);
}

// Mirrors options.js deleteHistoryEntry filter.
function deleteHistoryEntry(history, id) {
  return history.filter((item) => item.id !== id);
}

// Prepend keeps newest first.
{
  const a = buildHistoryEntry({ finalText: "first", source: "selection" }, "1", 1);
  const b = buildHistoryEntry({ finalText: "second", source: "selection" }, "2", 2);
  let list = recordHistory([], a);
  list = recordHistory(list, b);
  assert.equal(list[0].id, "2");
  assert.equal(list[1].id, "1");
}

// Cap at 200 drops the oldest.
{
  let list = [];
  for (let i = 0; i < 250; i += 1) {
    const entry = buildHistoryEntry({ finalText: `q${i}`, source: "selection" }, String(i), i);
    list = recordHistory(list, entry);
  }
  assert.equal(list.length, HISTORY_LIMIT);
  assert.equal(list[0].id, "249");
  assert.equal(list[list.length - 1].id, "50");
}

// Disabled recording leaves the list unchanged.
{
  const existing = [buildHistoryEntry({ finalText: "keep", source: "selection" }, "1", 1)];
  const entry = buildHistoryEntry({ finalText: "drop", source: "selection" }, "2", 2);
  const next = recordHistory(existing, entry, { enabled: false });
  assert.equal(next, existing);
  assert.equal(next.length, 1);
}

// Transform entry carries original / promptName / promptInstruction / transformed.
{
  const entry = buildHistoryEntry(
    {
      finalText: "edited final",
      source: "pico",
      original: "raw selection",
      promptName: "PICO",
      promptInstruction: "Rewrite as EBM question",
      transformed: "model output"
    },
    "1",
    1
  );
  assert.equal(entry.source, "pico");
  assert.equal(entry.original, "raw selection");
  assert.equal(entry.promptName, "PICO");
  assert.equal(entry.promptInstruction, "Rewrite as EBM question");
  assert.equal(entry.transformed, "model output");
  assert.equal(entry.finalText, "edited final");
}

// Plain selection send omits transform fields.
{
  const entry = buildHistoryEntry({ finalText: "plain query", source: "selection" }, "1", 1);
  assert.equal("original" in entry, false);
  assert.equal("promptName" in entry, false);
  assert.equal("promptInstruction" in entry, false);
  assert.equal("transformed" in entry, false);
}

// Delete-by-id removes the right entry.
{
  const history = [
    buildHistoryEntry({ finalText: "a" }, "a", 3),
    buildHistoryEntry({ finalText: "b" }, "b", 2),
    buildHistoryEntry({ finalText: "c" }, "c", 1)
  ];
  const next = deleteHistoryEntry(history, "b");
  assert.equal(next.length, 2);
  assert.deepEqual(
    next.map((item) => item.id),
    ["a", "c"]
  );
}

console.log("history.test.mjs passed");
