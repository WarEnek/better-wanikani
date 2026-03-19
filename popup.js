const LOG_PREFIX = "[WaniKani Radical Color Popup]";
const SETTINGS_KEY = "radicalHeaderStyleSettings";
const LEGACY_COLOR_KEY = "radicalHeaderColor";
const VALID_MODES = new Set(["solid", "gradient"]);
const VALID_VARIATIONS = new Set(["linear", "radial", "conic"]);
const CUSTOM_PRESET_ID = "custom";

const PRESETS = [
  {
    id: "default-solid",
    name: "Default Solid",
    style: {
      mode: "solid",
      solidColor: "#ff5b5b"
    }
  },
  {
    id: "mint-solid",
    name: "Mint Solid",
    style: {
      mode: "solid",
      solidColor: "#14b8a6"
    }
  },
  {
    id: "sunset-linear",
    name: "Sunset Linear",
    style: {
      mode: "gradient",
      gradient: {
        variation: "linear",
        direction: 125,
        startColor: "#ff5f6d",
        endColor: "#ffc371"
      }
    }
  },
  {
    id: "ocean-linear",
    name: "Ocean Linear",
    style: {
      mode: "gradient",
      gradient: {
        variation: "linear",
        direction: 140,
        startColor: "#2193b0",
        endColor: "#6dd5ed"
      }
    }
  },
  {
    id: "violet-radial",
    name: "Violet Radial",
    style: {
      mode: "gradient",
      gradient: {
        variation: "radial",
        direction: 45,
        startColor: "#8e2de2",
        endColor: "#4a00e0"
      }
    }
  },
  {
    id: "neon-conic",
    name: "Neon Conic",
    style: {
      mode: "gradient",
      gradient: {
        variation: "conic",
        direction: 90,
        startColor: "#f72585",
        endColor: "#4cc9f0"
      }
    }
  }
];

const PRESET_ID_SET = new Set([CUSTOM_PRESET_ID]);
for (const preset of PRESETS) {
  PRESET_ID_SET.add(preset.id);
}

const modeInputs = document.querySelectorAll('input[name="mode"]');
const enabledToggle = document.getElementById("enabledToggle");
const presetSelect = document.getElementById("presetSelect");
const applyPresetBtn = document.getElementById("applyPresetBtn");
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
    enabled: true,
    presetId: CUSTOM_PRESET_ID,
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

  if (typeof rawSettings.enabled === "boolean") {
    nextSettings.enabled = rawSettings.enabled;
  }

  if (typeof rawSettings.presetId === "string" && PRESET_ID_SET.has(rawSettings.presetId)) {
    nextSettings.presetId = rawSettings.presetId;
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

function getPresetById(presetId) {
  for (const preset of PRESETS) {
    if (preset.id === presetId) {
      return preset;
    }
  }
  return null;
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

function areStyleSettingsEqual(first, second) {
  if (first.mode !== second.mode) {
    return false;
  }
  if (first.solidColor !== second.solidColor) {
    return false;
  }
  if (first.gradient.variation !== second.gradient.variation) {
    return false;
  }
  if (first.gradient.direction !== second.gradient.direction) {
    return false;
  }
  if (first.gradient.startColor !== second.gradient.startColor) {
    return false;
  }
  if (first.gradient.endColor !== second.gradient.endColor) {
    return false;
  }
  return true;
}

function buildPresetSettings(presetId, preserveEnabled) {
  const defaults = createDefaultSettings();
  const preset = getPresetById(presetId);
  if (!preset) {
    defaults.enabled = preserveEnabled;
    return defaults;
  }

  const merged = createDefaultSettings();
  merged.enabled = preserveEnabled;
  merged.presetId = preset.id;
  merged.mode = preset.style.mode;

  if (preset.style.solidColor) {
    merged.solidColor = preset.style.solidColor;
  }

  if (preset.style.gradient) {
    merged.gradient.variation = preset.style.gradient.variation;
    merged.gradient.direction = preset.style.gradient.direction;
    merged.gradient.startColor = preset.style.gradient.startColor;
    merged.gradient.endColor = preset.style.gradient.endColor;
  }

  return sanitizeSettings(merged, null);
}

function resolvePresetIdForSettings(settings) {
  if (PRESET_ID_SET.has(settings.presetId) && settings.presetId !== CUSTOM_PRESET_ID) {
    return settings.presetId;
  }

  for (const preset of PRESETS) {
    const presetSettings = buildPresetSettings(preset.id, settings.enabled);
    if (areStyleSettingsEqual(settings, presetSettings)) {
      return preset.id;
    }
  }
  return CUSTOM_PRESET_ID;
}

function populatePresetSelect() {
  presetSelect.innerHTML = "";

  const customOption = document.createElement("option");
  customOption.value = CUSTOM_PRESET_ID;
  customOption.textContent = "Custom";
  presetSelect.appendChild(customOption);

  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    presetSelect.appendChild(option);
  }
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

function markPresetCustom() {
  if (presetSelect.value === CUSTOM_PRESET_ID) {
    return;
  }
  presetSelect.value = CUSTOM_PRESET_ID;
  logInfo("Switched preset to custom due to manual edit.");
}

function renderSettings(settings) {
  enabledToggle.checked = settings.enabled;
  setMode(settings.mode);
  solidColorPicker.value = settings.solidColor;
  solidColorHex.value = settings.solidColor;
  gradientVariation.value = settings.gradient.variation;
  syncDirectionInputs(settings.gradient.direction);
  gradientStartPicker.value = settings.gradient.startColor;
  gradientStartHex.value = settings.gradient.startColor;
  gradientEndPicker.value = settings.gradient.endColor;
  gradientEndHex.value = settings.gradient.endColor;

  const resolvedPresetId = resolvePresetIdForSettings(settings);
  presetSelect.value = resolvedPresetId;
  updatePreview();
}

function readSettingsFromForm(strictValidation) {
  const mode = getSelectedMode();
  const nextSettings = createDefaultSettings();
  nextSettings.enabled = enabledToggle.checked;
  nextSettings.presetId = presetSelect.value;

  if (!PRESET_ID_SET.has(nextSettings.presetId)) {
    nextSettings.presetId = CUSTOM_PRESET_ID;
  }

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

  if (!settings.enabled) {
    preview.style.background = "repeating-linear-gradient(135deg, #475569 0 8px, #334155 8px 16px)";
    preview.style.backgroundColor = "#334155";
    preview.style.backgroundImage =
      "repeating-linear-gradient(135deg, #475569 0 8px, #334155 8px 16px)";
    preview.textContent = "Extension disabled";
    return;
  }

  const style = buildBackgroundStyle(settings);
  preview.style.background = style.background;
  preview.style.backgroundColor = style.backgroundColor;
  preview.style.backgroundImage = style.backgroundImage;
  preview.textContent = "Live preview";
}

function bindColorPair(pickerElement, textElement) {
  pickerElement.addEventListener("input", () => {
    textElement.value = pickerElement.value.toLowerCase();
    markPresetCustom();
    updatePreview();
  });

  textElement.addEventListener("input", () => {
    const candidate = textElement.value.trim();
    if (isValidHexColor(candidate)) {
      pickerElement.value = candidate.toLowerCase();
    }
    markPresetCustom();
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
    normalizedSettings.presetId = resolvePresetIdForSettings(normalizedSettings);
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
    markPresetCustom();
    updatePreview();
  });
}

enabledToggle.addEventListener("change", () => {
  logInfo("Enable toggle changed.", { enabled: enabledToggle.checked });
  updatePreview();
});

presetSelect.addEventListener("change", () => {
  if (presetSelect.value === CUSTOM_PRESET_ID) {
    setStatus("Custom mode selected.", false);
    return;
  }
  setStatus("Preset selected. Click Apply.", false);
});

applyPresetBtn.addEventListener("click", () => {
  const selectedPresetId = presetSelect.value;
  if (selectedPresetId === CUSTOM_PRESET_ID) {
    setStatus("Select a preset before applying.", true);
    return;
  }

  const nextSettings = buildPresetSettings(selectedPresetId, enabledToggle.checked);
  nextSettings.presetId = selectedPresetId;
  renderSettings(nextSettings);
  setStatus("Preset applied to form. Click Save.", false);
  logInfo("Preset applied", { presetId: selectedPresetId, nextSettings });
});

gradientVariation.addEventListener("change", () => {
  markPresetCustom();
  updatePreview();
});

directionRange.addEventListener("input", () => {
  syncDirectionInputs(directionRange.value);
  markPresetCustom();
  updatePreview();
});

directionNumber.addEventListener("input", () => {
  syncDirectionInputs(directionNumber.value);
  markPresetCustom();
  updatePreview();
});

bindColorPair(solidColorPicker, solidColorHex);
bindColorPair(gradientStartPicker, gradientStartHex);
bindColorPair(gradientEndPicker, gradientEndHex);

saveBtn.addEventListener("click", async () => {
  try {
    const settingsToSave = readSettingsFromForm(true);
    await saveSettings(settingsToSave);
    settingsToSave.presetId = resolvePresetIdForSettings(settingsToSave);
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

populatePresetSelect();
loadSettings();
