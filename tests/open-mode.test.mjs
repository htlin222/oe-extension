import assert from "node:assert/strict";

const ACTIVE_TAB_STORAGE_KEY = "oeOpenInActiveTab";
const OPEN_MODE_STORAGE_KEY = "oeOpenMode";
const OPEN_MODES = ["tab-bg", "tab-active", "side-pane"];
const DEFAULT_OPEN_MODE = "tab-bg";

function resolveOpenMode(items) {
  const mode = items[OPEN_MODE_STORAGE_KEY];
  if (OPEN_MODES.includes(mode)) {
    return mode;
  }

  return items[ACTIVE_TAB_STORAGE_KEY] === true ? "tab-active" : DEFAULT_OPEN_MODE;
}

// Explicit modes win.
assert.equal(resolveOpenMode({ [OPEN_MODE_STORAGE_KEY]: "tab-bg" }), "tab-bg");
assert.equal(resolveOpenMode({ [OPEN_MODE_STORAGE_KEY]: "tab-active" }), "tab-active");
assert.equal(resolveOpenMode({ [OPEN_MODE_STORAGE_KEY]: "side-pane" }), "side-pane");

// Unknown / missing mode migrates from the legacy boolean.
assert.equal(resolveOpenMode({ [ACTIVE_TAB_STORAGE_KEY]: true }), "tab-active");
assert.equal(resolveOpenMode({ [ACTIVE_TAB_STORAGE_KEY]: false }), "tab-bg");
assert.equal(resolveOpenMode({}), "tab-bg");
assert.equal(resolveOpenMode({ [OPEN_MODE_STORAGE_KEY]: "bogus", [ACTIVE_TAB_STORAGE_KEY]: true }), "tab-active");

// Dispatch decision: frameable engines (OpenEvidence, UpToDate) use the pane in
// side-pane mode; non-frameable (Google) falls back to a focused tab. Otherwise
// only "tab-bg" stays in the background.
function decideOpen(mode, frameable) {
  if (mode === "side-pane" && frameable) {
    return { pane: true, active: false };
  }
  return { pane: false, active: mode !== "tab-bg" };
}

// OpenEvidence / UpToDate (frameable)
assert.deepEqual(decideOpen("tab-bg", true), { pane: false, active: false });
assert.deepEqual(decideOpen("tab-active", true), { pane: false, active: true });
assert.deepEqual(decideOpen("side-pane", true), { pane: true, active: false });

// Google (not frameable) — side pane falls back to a focused tab
assert.deepEqual(decideOpen("tab-bg", false), { pane: false, active: false });
assert.deepEqual(decideOpen("tab-active", false), { pane: false, active: true });
assert.deepEqual(decideOpen("side-pane", false), { pane: false, active: true });
