import assert from "node:assert/strict";

const DEFAULT_THEME = "system";

function normalizeTheme(value) {
  return ["system", "light", "dark"].includes(value) ? value : DEFAULT_THEME;
}

assert.equal(normalizeTheme("system"), "system");
assert.equal(normalizeTheme("light"), "light");
assert.equal(normalizeTheme("dark"), "dark");
assert.equal(normalizeTheme("sepia"), "system");
assert.equal(normalizeTheme(undefined), "system");
