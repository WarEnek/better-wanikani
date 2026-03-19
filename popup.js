const LOG_PREFIX = "[WaniKani Radical Color Popup]";
const SETTINGS_KEY = "radicalHeaderStyleSettings";
const LEGACY_COLOR_KEY = "radicalHeaderColor";
const VALID_MODES = new Set(["solid", "gradient"]);
const VALID_VARIATIONS = new Set(["linear", "radial", "conic"]);

const modeInputs = document.querySelectorAll('input[name="mode"]');
const solidSection = document.getElementById("solidSection");
const gradientSection = document.getElementById("gradientSection");
const solidColorPicker = document.getElementById("solidColorPicker");
const solidColorHex = document.getElementById("solidColorHex");
const gradientVariation = document.getElementById("gradientVariation");
const directionRange = document.getElementById("directionRange");
const directionNumber = document.getElementById("directionNumber");
const gradientStartPicker = document.getElementById("gradientStartPicker");
const gradientStartHex = document.getElementById("gradientStartHex");
const gradientEndPicker = document.getElementById("gradientEndPicker");
const gradientEndHex = document.getElementById("gradientEndHex");
const preview = document.getElementById("preview");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

let lastSavedSettings = createDefaultSettings();

function createDefaultSettings() {
  return {
    mode: "solid",
    solidColor: "#ff5b5b",
    gradient: {
      variation: "linear",
      direction: 90,
      startColor: "#ff5b5b",
      endColor: "#ffa1cf"
    }
  };
}

function logInfo(message, details) {
  if (details === undefined) {
    console.info(`${LOG_PREFIX} ${message}`);
    return;
  }
  console.info(`${LOG_PREFIX} ${message}`, details);
}

function setStatus(message, isError) {
  statusEl.textContent = message;
  if (isError) {
    statusEl.style.color = "#ef4444";
    return;
  }
  statusEl.style.color = "#22c55e";
}

function isValidHexColor(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeHexColor(value, fallback) {
  if (!isValidHexColor(value)) {
    return fallback;
  }
  return value.toLowerCase();
}

function normalizeDirection(value, fallback) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  let normalized = Math.round(numericValue) % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

function sanitizeSettings(rawSettings, legacyColor) {
  const defaults = createDefaultSettings();
  const nextSettings = createDefaultSettings();

  if (isValidHexColor(legacyColor)) {
    nextSettings.solidColor = legacyColor.toLowerCase();
    nextSettings.gradient.startColor = legacyColor.toLowerCase();
  }

  if (!rawSettings || typeof rawSettings !== "object") {
    return nextSettings;
  }

  if (VALID_MODES.has(rawSettings.mode)) {
    nextSettings.mode = rawSettings.mode;
  }

  nextSettings.solidColor = normalizeHexColor(
    rawSettings.solidColor,
    nextSettings.solidColor
  );

  if (rawSettings.gradient && typeof rawSettings.gradient === "object") {
    if (VALID_VARIATIONS.has(rawSettings.gradient.variation)) {
      nextSettings.gradient.variation = rawSettings.gradient.variation;
    } else {
      nextSettings.gradient.variation = defaults.gradient.variation;
    }

    nextSettings.gradient.direction = normalizeDirection(
      rawSettings.gradient.direction,
      nextSettings.gradient.direction
    );
    nextSettings.gradient.startColor = normalizeHexColor(
      rawSettings.gradient.startColor,
      nextSettings.gradient.startColor
    );
    nextSettings.gradient.endColor = normalizeHexColor(
      rawSettings.gradient.endColor,
      nextSettings.gradient.endColor
    );
  }

  return nextSettings;
}

function angleToRadialPosition(angle) {
  const normalized = normalizeDirection(angle, 90);
  if (normalized >= 338 || normalized < 23) {
    return "top";
  }
  if (normalized >= 23 && normalized < 68) {
    return "top right";
  }
  if (normalized >= 68 && normalized < 113) {
    return "right";
  }
  if (normalized >= 113 && normalized < 158) {
    return "bottom right";
  }
  if (normalized >= 158 && normalized < 203) {
    return "bottom";
  }
  if (normalized >= 203 && normalized < 248) {
    return "bottom left";
  }
  if (normalized >= 248 && normalized < 293) {
    return "left";
  }
  return "top left";
}

function buildBackgroundStyle(settings) {
  if (settings.mode === "solid") {
    return {
      background: settings.solidColor,
      backgroundColor: settings.solidColor,
      backgroundImage: "none"
    };
  }

  const direction = normalizeDirection(settings.gradient.direction, 90);
  const startColor = settings.gradient.startColor;
  const endColor = settings.gradient.endColor;
  const variation = settings.gradient.variation;
  let backgroundImage = "none";

  if (variation === "linear") {
    backgroundImage = `linear-gradient(${direction}deg, ${startColor}, ${endColor})`;
  } else if (variation === "radial") {
    const radialPosition = angleToRadialPosition(direction);
    backgroundImage = `radial-gradient(circle at ${radialPosition}, ${startColor}, ${endColor})`;
  } else if (variation === "conic") {
    backgroundImage = `conic-gradient(from ${direction}deg, ${startColor}, ${endColor}, ${startColor})`;
  }

  return {
    background: backgroundImage,
    backgroundColor: startColor,
    backgroundImage
  };
}

function getSelectedMode() {
  for (const input of modeInputs) {
    if (input.checked) {
      return input.value;
    }
  }
  return "solid";
}

function setMode(mode) {
  for (const input of modeInputs) {
    input.checked = input.value === mode;
  }
  const gradientEnabled = mode === "gradient";
  solidSection.classList.toggle("hidden", gradientEnabled);
  gradientSection.classList.toggle("hidden", !gradientEnabled);
}

function syncDirectionInputs(value) {
  const normalized = normalizeDirection(value, 90);
  directionRange.value = String(normalized);
  directionNumber.value = String(normalized);
}

function renderSettings(settings) {
  setMode(settings.mode);
  solidColorPicker.value = settings.solidColor;
  solidColorHex.value = settings.solidColor;
  gradientVariation.value = settings.gradient.variation;
  syncDirectionInputs(settings.gradient.direction);
  gradientStartPicker.value = settings.gradient.startColor;
  gradientStartHex.value = settings.gradient.startColor;
  gradientEndPicker.value = settings.gradient.endColor;
  gradientEndHex.value = settings.gradient.endColor;
  updatePreview();
}

function readSettingsFromForm(strictValidation) {
  const mode = getSelectedMode();
  const nextSettings = createDefaultSettings();

  if (VALID_MODES.has(mode)) {
    nextSettings.mode = mode;
  }

  const solidColorCandidate = solidColorHex.value.trim();
  if (!isValidHexColor(solidColorCandidate) && strictValidation) {
    throw new Error("Solid color must be in #RRGGBB format.");
  }
  nextSettings.solidColor = normalizeHexColor(
    solidColorCandidate,
    lastSavedSettings.solidColor
  );

  const variationCandidate = gradientVariation.value;
  if (VALID_VARIATIONS.has(variationCandidate)) {
    nextSettings.gradient.variation = variationCandidate;
  } else {
    nextSettings.gradient.variation = lastSavedSettings.gradient.variation;
  }

  const directionCandidate = directionNumber.value;
  nextSettings.gradient.direction = normalizeDirection(
    directionCandidate,
    lastSavedSettings.gradient.direction
  );

  const gradientStartCandidate = gradientStartHex.value.trim();
  if (!isValidHexColor(gradientStartCandidate) && strictValidation) {
    throw new Error("Gradient start color must be in #RRGGBB format.");
  }
  nextSettings.gradient.startColor = normalizeHexColor(
    gradientStartCandidate,
    lastSavedSettings.gradient.startColor
  );

  const gradientEndCandidate = gradientEndHex.value.trim();
  if (!isValidHexColor(gradientEndCandidate) && strictValidation) {
    throw new Error("Gradient end color must be in #RRGGBB format.");
  }
  nextSettings.gradient.endColor = normalizeHexColor(
    gradientEndCandidate,
    lastSavedSettings.gradient.endColor
  );

  return nextSettings;
}

function updatePreview() {
  const settings = readSettingsFromForm(false);
  const style = buildBackgroundStyle(settings);
  preview.style.background = style.background;
  preview.style.backgroundColor = style.backgroundColor;
  preview.style.backgroundImage = style.backgroundImage;
}

function bindColorPair(pickerElement, textElement) {
  pickerElement.addEventListener("input", () => {
    textElement.value = pickerElement.value.toLowerCase();
    updatePreview();
  });

  textElement.addEventListener("input", () => {
    const candidate = textElement.value.trim();
    if (isValidHexColor(candidate)) {
      pickerElement.value = candidate.toLowerCase();
    }
    updatePreview();
  });
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  await chrome.storage.sync.remove(LEGACY_COLOR_KEY);
}

async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get([SETTINGS_KEY, LEGACY_COLOR_KEY]);
    const normalizedSettings = sanitizeSettings(
      stored[SETTINGS_KEY],
      stored[LEGACY_COLOR_KEY]
    );
    lastSavedSettings = normalizedSettings;
    renderSettings(normalizedSettings);
    logInfo("Loaded style settings from storage", {
      storedSettings: stored[SETTINGS_KEY],
      legacyColor: stored[LEGACY_COLOR_KEY],
      normalizedSettings
    });
  } catch (error) {
    setStatus("Failed to load settings.", true);
    logInfo("Load settings failed", error);
  }
}

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    setMode(getSelectedMode());
    updatePreview();
  });
}

gradientVariation.addEventListener("change", () => {
  updatePreview();
});

directionRange.addEventListener("input", () => {
  syncDirectionInputs(directionRange.value);
  updatePreview();
});

directionNumber.addEventListener("input", () => {
  syncDirectionInputs(directionNumber.value);
  updatePreview();
});

bindColorPair(solidColorPicker, solidColorHex);
bindColorPair(gradientStartPicker, gradientStartHex);
bindColorPair(gradientEndPicker, gradientEndHex);

saveBtn.addEventListener("click", async () => {
  try {
    const settingsToSave = readSettingsFromForm(true);
    await saveSettings(settingsToSave);
    lastSavedSettings = settingsToSave;
    renderSettings(settingsToSave);
    setStatus("Style saved.", false);
    logInfo("Saved settings", settingsToSave);
  } catch (error) {
    setStatus(error.message || "Failed to save settings.", true);
    logInfo("Save settings failed", error);
  }
});

resetBtn.addEventListener("click", async () => {
  try {
    const defaultSettings = createDefaultSettings();
    await saveSettings(defaultSettings);
    lastSavedSettings = defaultSettings;
    renderSettings(defaultSettings);
    setStatus("Settings reset to default.", false);
    logInfo("Settings reset to default.");
  } catch (error) {
    setStatus("Failed to reset settings.", true);
    logInfo("Reset settings failed", error);
  }
});

loadSettings();
