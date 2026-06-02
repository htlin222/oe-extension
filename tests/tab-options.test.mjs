import assert from "node:assert/strict";

function buildTabOptions(url, active, senderTabIndex) {
  const tabOptions = { url, active };

  if (Number.isInteger(senderTabIndex)) {
    tabOptions.index = senderTabIndex + 1;
  }

  return tabOptions;
}

function buildTabOptionsFromSourceTab(url, active, sourceTab) {
  const tabOptions = { url, active };

  if (Number.isInteger(sourceTab?.index)) {
    tabOptions.index = sourceTab.index + 1;
  }

  return tabOptions;
}

assert.deepEqual(buildTabOptions("https://example.com", false, 3), {
  url: "https://example.com",
  active: false,
  index: 4
});

assert.deepEqual(buildTabOptions("https://example.com", true, undefined), {
  url: "https://example.com",
  active: true
});

assert.deepEqual(buildTabOptionsFromSourceTab("https://example.com", false, { index: 8 }), {
  url: "https://example.com",
  active: false,
  index: 9
});
