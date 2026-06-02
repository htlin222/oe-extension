import assert from "node:assert/strict";

function buildUpToDateUrl(query) {
  const params = new URLSearchParams({ search: query });
  return `https://www.uptodate.com/contents/search?${params.toString()}`;
}

assert.equal(
  buildUpToDateUrl("KRAS mutation in pancreatic cancer"),
  "https://www.uptodate.com/contents/search?search=KRAS+mutation+in+pancreatic+cancer"
);

assert.equal(
  buildUpToDateUrl("JAK2 V617F risk"),
  "https://www.uptodate.com/contents/search?search=JAK2+V617F+risk"
);

console.log("uptodate-url.test.mjs passed");
