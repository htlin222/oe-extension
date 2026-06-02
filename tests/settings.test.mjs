import assert from "node:assert/strict";

const DEFAULT_OPEN_IN_ACTIVE_TAB = false;

function shouldOpenActive(value) {
  return value === true;
}

assert.equal(DEFAULT_OPEN_IN_ACTIVE_TAB, false);
assert.equal(shouldOpenActive(false), false);
assert.equal(shouldOpenActive(undefined), false);
assert.equal(shouldOpenActive(true), true);
