const STORAGE_KEY = "oeWhitelist";
const ACTIVE_TAB_STORAGE_KEY = "oeOpenInActiveTab";
const CUSTOM_PROMPTS_STORAGE_KEY = "oeCustomPrompts";
const THEME_STORAGE_KEY = "oeTheme";
const GROQ_API_KEY_STORAGE_KEY = "oeGroqApiKey";
const GROQ_VALIDATED_STORAGE_KEY = "oeGroqApiKeyValidated";
const DEFAULT_WHITELIST = [
  "https://ankiuser.net/study",
  "https://www.openevidence.com/*",
  "http://uptodate.com/*",
  "nejm.org/*",
  "file:///*"
];
const DEFAULT_OPEN_IN_ACTIVE_TAB = false;
const DEFAULT_THEME = "system";

const form = document.querySelector("#options-form");
const textarea = document.querySelector("#whitelist");
const openActiveCheckbox = document.querySelector("#open-active");
const themeSelect = document.querySelector("#theme");
const groqApiKeyInput = document.querySelector("#groq-api-key");
const editGroqKeyButton = document.querySelector("#edit-groq-key");
const saveGroqKeyButton = document.querySelector("#save-groq-key");
const clearGroqKeyButton = document.querySelector("#clear-groq-key");
const customPromptsContainer = document.querySelector("#custom-prompts");
const addCustomPromptButton = document.querySelector("#add-custom-prompt");
const groqStatus = document.querySelector("#groq-status");
const resetButton = document.querySelector("#reset");
const status = document.querySelector("#status");

function createLucideIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "options-lucide-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const paths = {
    edit: [
      '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>',
      '<path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/>'
    ],
    plus: ['<path d="M5 12h14"/>', '<path d="M12 5v14"/>'],
    save: [
      '<path d="M15.2 3a2 2 0 0 1 1.4.6l2.8 2.8A2 2 0 0 1 20 7.8V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>',
      '<path d="M17 21v-8H7v8"/>',
      '<path d="M7 3v5h8"/>'
    ],
    trash: [
      '<path d="M3 6h18"/>',
      '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
      '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
    ],
    x: ['<path d="M18 6 6 18"/>', '<path d="m6 6 12 12"/>']
  };

  svg.innerHTML = paths[name]?.join("") || paths.plus.join("");
  return svg;
}

function setButtonIcon(button, iconName) {
  if (!button || button.dataset.iconApplied === "true") {
    return;
  }

  const label = document.createElement("span");
  label.textContent = button.textContent;
  button.textContent = "";
  button.append(createLucideIcon(iconName), label);
  button.dataset.iconApplied = "true";
}

function parseWhitelist(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function setStatus(message) {
  status.textContent = message;
  window.setTimeout(() => {
    status.textContent = "";
  }, 2500);
}

function setGroqStatus(message, state = "") {
  groqStatus.textContent = message;
  groqStatus.dataset.state = state;
}

function setGroqKeyEditing(isEditing) {
  groqApiKeyInput.readOnly = !isEditing;
  saveGroqKeyButton.disabled = !isEditing;
  editGroqKeyButton.disabled = isEditing;

  if (isEditing) {
    groqApiKeyInput.focus();
    groqApiKeyInput.select();
  }
}

function normalizeTheme(value) {
  return ["system", "light", "dark"].includes(value) ? value : DEFAULT_THEME;
}

function applyOptionsTheme(value) {
  const theme = normalizeTheme(value);
  const resolvedTheme =
    theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : theme;
  document.documentElement.dataset.theme = resolvedTheme === "dark" ? "dark" : "light";
}

function normalizeCustomPrompts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      name: typeof item?.name === "string" ? item.name.trim() : "",
      prompt: typeof item?.prompt === "string" ? item.prompt.trim() : ""
    }))
    .filter((item) => item.name && item.prompt)
    .slice(0, 6);
}

function createCustomPromptRow(item = { name: "", prompt: "" }) {
  const row = document.createElement("div");
  row.className = "custom-prompt-row";

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Button name";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "custom-prompt-row__name";
  nameInput.autocomplete = "off";
  nameInput.spellcheck = false;
  nameInput.value = item.name;

  const promptLabel = document.createElement("label");
  promptLabel.textContent = "Prompt";

  const promptInput = document.createElement("textarea");
  promptInput.className = "custom-prompt-row__prompt";
  promptInput.rows = 4;
  promptInput.spellcheck = false;
  promptInput.value = item.prompt;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  setButtonIcon(removeButton, "trash");
  removeButton.addEventListener("click", () => {
    row.remove();
  });

  row.append(nameLabel, nameInput, promptLabel, promptInput, removeButton);
  customPromptsContainer.appendChild(row);
}

function getCustomPromptRows() {
  return normalizeCustomPrompts(
    Array.from(customPromptsContainer.querySelectorAll(".custom-prompt-row")).map((row) => ({
      name: row.querySelector(".custom-prompt-row__name")?.value || "",
      prompt: row.querySelector(".custom-prompt-row__prompt")?.value || ""
    }))
  );
}

async function loadOptions() {
  const items = await chrome.storage.sync.get({
    [STORAGE_KEY]: DEFAULT_WHITELIST,
    [ACTIVE_TAB_STORAGE_KEY]: DEFAULT_OPEN_IN_ACTIVE_TAB,
    [CUSTOM_PROMPTS_STORAGE_KEY]: [],
    [THEME_STORAGE_KEY]: DEFAULT_THEME
  });
  const whitelist = Array.isArray(items[STORAGE_KEY]) ? items[STORAGE_KEY] : DEFAULT_WHITELIST;
  textarea.value = whitelist.join("\n");
  openActiveCheckbox.checked = items[ACTIVE_TAB_STORAGE_KEY] === true;
  themeSelect.value = normalizeTheme(items[THEME_STORAGE_KEY]);
  applyOptionsTheme(themeSelect.value);
  customPromptsContainer.textContent = "";
  normalizeCustomPrompts(items[CUSTOM_PROMPTS_STORAGE_KEY]).forEach(createCustomPromptRow);

  const localItems = await chrome.storage.local.get({
    [GROQ_API_KEY_STORAGE_KEY]: "",
    [GROQ_VALIDATED_STORAGE_KEY]: false
  });
  groqApiKeyInput.value = localItems[GROQ_API_KEY_STORAGE_KEY] || "";
  const hasValidatedKey = localItems[GROQ_VALIDATED_STORAGE_KEY] === true && Boolean(groqApiKeyInput.value);
  setGroqStatus(hasValidatedKey ? "Groq API key validated." : "No validated Groq API key.", hasValidatedKey ? "success" : "");
  setGroqKeyEditing(!groqApiKeyInput.value);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const whitelist = parseWhitelist(textarea.value);
  const customPrompts = getCustomPromptRows();

  await chrome.storage.sync.set({
    [STORAGE_KEY]: whitelist.length > 0 ? whitelist : DEFAULT_WHITELIST,
    [ACTIVE_TAB_STORAGE_KEY]: openActiveCheckbox.checked,
    [CUSTOM_PROMPTS_STORAGE_KEY]: customPrompts,
    [THEME_STORAGE_KEY]: normalizeTheme(themeSelect.value)
  });
  textarea.value = (whitelist.length > 0 ? whitelist : DEFAULT_WHITELIST).join("\n");
  setStatus("Saved.");
});

resetButton.addEventListener("click", async () => {
  await chrome.storage.sync.set({
    [STORAGE_KEY]: DEFAULT_WHITELIST,
    [ACTIVE_TAB_STORAGE_KEY]: DEFAULT_OPEN_IN_ACTIVE_TAB,
    [CUSTOM_PROMPTS_STORAGE_KEY]: [],
    [THEME_STORAGE_KEY]: DEFAULT_THEME
  });
  textarea.value = DEFAULT_WHITELIST.join("\n");
  openActiveCheckbox.checked = DEFAULT_OPEN_IN_ACTIVE_TAB;
  themeSelect.value = DEFAULT_THEME;
  applyOptionsTheme(DEFAULT_THEME);
  customPromptsContainer.textContent = "";
  setStatus("Reset.");
});

addCustomPromptButton.addEventListener("click", () => {
  if (customPromptsContainer.querySelectorAll(".custom-prompt-row").length >= 6) {
    setStatus("Custom prompt limit is 6.");
    return;
  }

  createCustomPromptRow();
});

editGroqKeyButton.addEventListener("click", () => {
  setGroqKeyEditing(true);
});

saveGroqKeyButton.addEventListener("click", () => {
  const apiKey = groqApiKeyInput.value.trim();
  setGroqStatus("Validating Groq API key...");
  saveGroqKeyButton.disabled = true;

  chrome.runtime.sendMessage({ type: "OE_VALIDATE_GROQ_KEY", apiKey }, (response) => {
    if (!response?.ok) {
      saveGroqKeyButton.disabled = false;
      setGroqStatus(response?.error || "Groq API key validation failed.", "error");
      return;
    }

    setGroqStatus("Groq API key validated and saved locally.", "success");
    setGroqKeyEditing(false);
  });
});

clearGroqKeyButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OE_CLEAR_GROQ_KEY" }, (response) => {
    if (!response?.ok) {
      setGroqStatus(response?.error || "Unable to clear Groq API key.");
      return;
    }

    groqApiKeyInput.value = "";
    setGroqStatus("Groq API key cleared.");
    setGroqKeyEditing(true);
  });
});

themeSelect.addEventListener("change", () => {
  applyOptionsTheme(themeSelect.value);
});

window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (themeSelect.value === "system") {
    applyOptionsTheme("system");
  }
});

loadOptions();

setButtonIcon(editGroqKeyButton, "edit");
setButtonIcon(saveGroqKeyButton, "save");
setButtonIcon(clearGroqKeyButton, "trash");
setButtonIcon(addCustomPromptButton, "plus");
setButtonIcon(form.querySelector('button[type="submit"]'), "save");
setButtonIcon(resetButton, "x");
