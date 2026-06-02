import assert from "node:assert/strict";

function normalizeUrlPattern(pattern) {
  return pattern.trim().replace(/\/+$/, "");
}

function patternMatchesValue(pattern, value) {
  if (pattern.includes("*")) {
    const escaped = pattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}`).test(value);
  }

  return value === pattern || value.startsWith(`${pattern}/`) || value.startsWith(`${pattern}?`);
}

function isWhitelisted(url, patterns) {
  return patterns.some((pattern) => {
    const normalized = normalizeUrlPattern(pattern);
    if (!normalized) {
      return false;
    }

    if (/^[a-z][a-z\d+.-]*:\/\//i.test(normalized)) {
      return patternMatchesValue(normalized, url);
    }

    const pageUrl = new URL(url);
    const hostPath = `${pageUrl.hostname}${pageUrl.pathname}${pageUrl.search}${pageUrl.hash}`;
    const bareHostPath = hostPath.replace(/^www\./, "");

    return patternMatchesValue(normalized, hostPath) || patternMatchesValue(normalized, bareHostPath);
  });
}

const defaults = [
  "https://ankiuser.net/study",
  "https://www.openevidence.com/*",
  "http://uptodate.com/*",
  "nejm.org/*",
  "file:///*"
];

assert.equal(isWhitelisted("https://ankiuser.net/study/deck/1", defaults), true);
assert.equal(isWhitelisted("https://www.openevidence.com/ask?query=mpn", defaults), true);
assert.equal(isWhitelisted("http://uptodate.com/contents/mpn", defaults), true);
assert.equal(isWhitelisted("https://nejm.org/doi/full/10.1056/example", defaults), true);
assert.equal(isWhitelisted("https://www.nejm.org/doi/full/10.1056/example", defaults), true);
assert.equal(isWhitelisted("file:///Users/htlin/Documents/example.pdf", defaults), true);
assert.equal(isWhitelisted("https://example.com/doi/full/10.1056/example", defaults), false);
