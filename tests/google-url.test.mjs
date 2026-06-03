import assert from "node:assert/strict";

function buildGoogleUrl(query) {
  const params = new URLSearchParams({ q: query, sourceid: "chrome", ie: "UTF-8" });
  return `https://www.google.com/search?${params.toString()}`;
}

assert.equal(
  buildGoogleUrl("KRAS mutation in pancreatic cancer"),
  "https://www.google.com/search?q=KRAS+mutation+in+pancreatic+cancer&sourceid=chrome&ie=UTF-8"
);

assert.equal(
  buildGoogleUrl("JAK2 V617F risk"),
  "https://www.google.com/search?q=JAK2+V617F+risk&sourceid=chrome&ie=UTF-8"
);

console.log("google-url.test.mjs passed");
