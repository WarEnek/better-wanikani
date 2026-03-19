const LOG_PREFIX = "[WaniKani Radical Color Popup]";
const STORAGE_KEY = "radicalHeaderColor";
const DEFAULT_COLOR = "#ff5b5b";

const colorPicker = document.getElementById("colorPicker");
const hexInput = document.getElementById("hexInput");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

function logInfo(message, details) {
  if (details === undefined) {
    console.info(`${LOG_PREFIX} ${message}`);
    return;
  }
  console.info(`${LOG_PREFIX} ${message}`, details);
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b71c1c" : "#2e7d32";
}

function isValidHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function updateInputs(color) {
  colorPicker.value = color;
  hexInput.value = color;
}

async function loadStoredColor() {
  try {
    const stored = await chrome.storage.sync.get(STORAGE_KEY);
    const color = stored[STORAGE_KEY] || DEFAULT_COLOR;
    updateInputs(color);
    logInfo("Loaded color from storage", { color });
  } catch (error) {
    setStatus("Failed to load saved color.", true);
    logInfo("Load color failed", error);
  }
}

async function saveColor(color) {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: color });
    setStatus("Color saved.");
    logInfo("Saved color to storage", { color });
  } catch (error) {
    setStatus("Failed to save color.", true);
    logInfo("Save color failed", error);
  }
}

saveBtn.addEventListener("click", async () => {
  const inputColor = hexInput.value.trim();
  if (!isValidHexColor(inputColor)) {
    setStatus("Invalid color. Use #RRGGBB.", true);
    return;
  }

  const normalizedColor = inputColor.toLowerCase();
  updateInputs(normalizedColor);
  await saveColor(normalizedColor);
});

resetBtn.addEventListener("click", async () => {
  updateInputs(DEFAULT_COLOR);
  await saveColor(DEFAULT_COLOR);
});

colorPicker.addEventListener("input", () => {
  hexInput.value = colorPicker.value.toLowerCase();
});

hexInput.addEventListener("input", () => {
  const value = hexInput.value.trim();
  if (isValidHexColor(value)) {
    colorPicker.value = value.toLowerCase();
  }
});

loadStoredColor();
