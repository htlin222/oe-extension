const DEFAULT_WHITELIST = [
  "https://ankiuser.net/study",
  "https://www.openevidence.com/*",
  "http://uptodate.com/*",
  "nejm.org/*",
  "file:///*"
];
const STORAGE_KEY = "oeWhitelist";
const ACTIVE_TAB_STORAGE_KEY = "oeOpenInActiveTab";
const DEFAULT_OPEN_IN_ACTIVE_TAB = false;
const GROQ_API_KEY_STORAGE_KEY = "oeGroqApiKey";
const GROQ_VALIDATED_STORAGE_KEY = "oeGroqApiKeyValidated";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 30000;
const ASK_CONTEXT_MENU_ID = "oe-ask-selection";
const PICO_INSTRUCTION = `Rewrite my recall question as an EBM foreground question. Shift "what/which" to "what's the evidence for/why." Impose PICO (population, intervention/exposure, comparator, outcome) and pick the right question type (therapy/diagnosis/prognosis). Require cited evidence, guideline comparison, and clinical implications--not just definitions.

Export as JSON:
{"question":"$output"}`;

function buildOpenEvidenceUrl(query) {
  const params = new URLSearchParams({
    query,
    configName: "prod",
    attachments: "[]",
    _rsc: "1pln2"
  });

  return `https://www.openevidence.com/ask?${params.toString()}`;
}

function buildTabOptions(url, active, sourceTab) {
  const tabOptions = { url, active };

  if (Number.isInteger(sourceTab?.index)) {
    tabOptions.index = sourceTab.index + 1;
  }

  return tabOptions;
}

function openOpenEvidenceQuery(query, sourceTab, sendResponse) {
  const nextQuery = typeof query === "string" ? query.trim() : "";
  if (!nextQuery) {
    sendResponse?.({ ok: false, error: "Empty query" });
    return;
  }

  chrome.storage.sync.get({ [ACTIVE_TAB_STORAGE_KEY]: DEFAULT_OPEN_IN_ACTIVE_TAB }, (items) => {
    const active = items[ACTIVE_TAB_STORAGE_KEY] === true;
    const tabOptions = buildTabOptions(buildOpenEvidenceUrl(nextQuery), active, sourceTab);

    chrome.tabs
      .create(tabOptions)
      .then(() => sendResponse?.({ ok: true }))
      .catch((error) => sendResponse?.({ ok: false, error: error.message }));
  });
}

async function callGroq(apiKey, messages, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
  const body = {
    model: GROQ_MODEL,
    messages: typeof messages === "string" ? [{ role: "user", content: messages }] : messages,
    temperature: 0.2
  };

  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `Groq request failed with HTTP ${response.status}`;
      throw new Error(message);
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Groq returned an empty response");
    }

    return content;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Groq request timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractPicoQuestion(content) {
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) {
    throw new Error("Groq returned an empty response");
  }

  try {
    const parsed = JSON.parse(trimmed);
    const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
    if (question) {
      return question;
    }
  } catch (_error) {
    const match = trimmed.match(/"question"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (match) {
      const parsed = JSON.parse(`{"question":"${match[1]}"}`);
      const question = parsed.question.trim();
      if (question) {
        return question;
      }
    }
  }

  return trimmed;
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

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get([STORAGE_KEY, ACTIVE_TAB_STORAGE_KEY]);
  const defaults = {};

  if (!stored[STORAGE_KEY]) {
    defaults[STORAGE_KEY] = DEFAULT_WHITELIST;
  }

  if (typeof stored[ACTIVE_TAB_STORAGE_KEY] !== "boolean") {
    defaults[ACTIVE_TAB_STORAGE_KEY] = DEFAULT_OPEN_IN_ACTIVE_TAB;
  }

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.sync.set(defaults);
  }

  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: ASK_CONTEXT_MENU_ID,
    title: "Ask OpenEvidence",
    contexts: ["selection"]
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OE_OPEN_QUERY") {
    openOpenEvidenceQuery(message.query, sender.tab, sendResponse);
    return true;
  }

  if (message?.type === "OE_VALIDATE_GROQ_KEY") {
    const apiKey = typeof message.apiKey === "string" ? message.apiKey.trim() : "";
    if (!apiKey) {
      sendResponse({ ok: false, error: "API key is required" });
      return false;
    }

    callGroq(apiKey, "Reply with exactly: ok")
      .then(async () => {
        await chrome.storage.local.set({
          [GROQ_API_KEY_STORAGE_KEY]: apiKey,
          [GROQ_VALIDATED_STORAGE_KEY]: true
        });
        sendResponse({ ok: true });
      })
      .catch(async (error) => {
        await chrome.storage.local.set({ [GROQ_VALIDATED_STORAGE_KEY]: false });
        sendResponse({ ok: false, error: error.message });
      });

    return true;
  }

  if (message?.type === "OE_CLEAR_GROQ_KEY") {
    chrome.storage.local
      .remove([GROQ_API_KEY_STORAGE_KEY, GROQ_VALIDATED_STORAGE_KEY])
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true;
  }

  if (message?.type === "OE_GENERATE_PICO") {
    const selection = typeof message.selection === "string" ? message.selection.trim() : "";
    if (!selection) {
      sendResponse({ ok: false, error: "Selection is required" });
      return false;
    }

    chrome.storage.local.get(
      {
        [GROQ_API_KEY_STORAGE_KEY]: "",
        [GROQ_VALIDATED_STORAGE_KEY]: false
      },
      (items) => {
        const apiKey = items[GROQ_API_KEY_STORAGE_KEY];
        const validated = items[GROQ_VALIDATED_STORAGE_KEY] === true;

        if (!apiKey || !validated) {
          sendResponse({ ok: false, error: "Validate a Groq API key in extension options first" });
          return;
        }

        const prompt = `${PICO_INSTRUCTION}\n\n+++user selection+++\n${selection}`;
        callGroq(apiKey, prompt, { jsonMode: true })
          .then((content) => sendResponse({ ok: true, content: extractPicoQuestion(content) }))
          .catch((error) => sendResponse({ ok: false, error: error.message }));
      }
    );

    return true;
  }

  if (message?.type === "OE_GENERATE_CUSTOM_PROMPT") {
    const selection = typeof message.selection === "string" ? message.selection.trim() : "";
    const prompt = typeof message.prompt === "string" ? message.prompt.trim() : "";
    if (!selection || !prompt) {
      sendResponse({ ok: false, error: "Selection and prompt are required" });
      return false;
    }

    chrome.storage.local.get(
      {
        [GROQ_API_KEY_STORAGE_KEY]: "",
        [GROQ_VALIDATED_STORAGE_KEY]: false
      },
      (items) => {
        const apiKey = items[GROQ_API_KEY_STORAGE_KEY];
        const validated = items[GROQ_VALIDATED_STORAGE_KEY] === true;

        if (!apiKey || !validated) {
          sendResponse({ ok: false, error: "Validate a Groq API key in extension options first" });
          return;
        }

        callGroq(apiKey, buildJsonTransformMessages(prompt, selection), { jsonMode: true })
          .then((content) => sendResponse({ ok: true, content: extractPicoQuestion(content) }))
          .catch((error) => sendResponse({ ok: false, error: error.message }));
      }
    );

    return true;
  }

  return false;
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== ASK_CONTEXT_MENU_ID) {
    return;
  }

  openOpenEvidenceQuery(info.selectionText, tab);
});
