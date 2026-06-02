import assert from "node:assert/strict";

function buildOpenEvidenceUrl(query) {
  const params = new URLSearchParams({
    query,
    configName: "prod",
    attachments: "[]",
    _rsc: "1pln2"
  });

  return `https://www.openevidence.com/ask?${params.toString()}`;
}

assert.equal(
  buildOpenEvidenceUrl("how to treat MPN"),
  "https://www.openevidence.com/ask?query=how+to+treat+MPN&configName=prod&attachments=%5B%5D&_rsc=1pln2"
);

assert.equal(
  buildOpenEvidenceUrl("JAK2 V617F risk"),
  "https://www.openevidence.com/ask?query=JAK2+V617F+risk&configName=prod&attachments=%5B%5D&_rsc=1pln2"
);
