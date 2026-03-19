(() => {
  const LOG_PREFIX = "[WaniKani Radical Color]";
  const SETTINGS_KEY = "radicalHeaderStyleSettings";
  const LEGACY_COLOR_KEY = "radicalHeaderColor";
  const TARGET_SELECTOR = ".character-header--radical";
  const TARGET_PATH_PREFIX = "/subject-lessons/";
  const VALID_MODES = new Set(["solid", "gradient"]);
  const VALID_VARIATIONS = new Set(["linear", "radial", "conic"]);

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

  function logWarn(message, details) {
    if (details === undefined) {
      console.warn(`${LOG_PREFIX} ${message}`);
      return;
    }
    console.warn(`${LOG_PREFIX} ${message}`, details);
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
      const rawGradient = rawSettings.gradient;
      if (VALID_VARIATIONS.has(rawGradient.variation)) {
        nextSettings.gradient.variation = rawGradient.variation;
      } else {
        nextSettings.gradient.variation = defaults.gradient.variation;
      }

      nextSettings.gradient.direction = normalizeDirection(
        rawGradient.direction,
        nextSettings.gradient.direction
      );
      nextSettings.gradient.startColor = normalizeHexColor(
        rawGradient.startColor,
        nextSettings.gradient.startColor
      );
      nextSettings.gradient.endColor = normalizeHexColor(
        rawGradient.endColor,
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
    const solidColor = settings.solidColor;
    if (settings.mode === "solid") {
      return {
        background: solidColor,
        backgroundColor: solidColor,
        backgroundImage: "none"
      };
    }

    const variation = settings.gradient.variation;
    const direction = normalizeDirection(settings.gradient.direction, 90);
    const startColor = settings.gradient.startColor;
    const endColor = settings.gradient.endColor;

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

  function isTargetPage() {
    return window.location.pathname.startsWith(TARGET_PATH_PREFIX);
  }

  async function getConfiguredSettings() {
    const stored = await chrome.storage.sync.get([SETTINGS_KEY, LEGACY_COLOR_KEY]);
    const settings = sanitizeSettings(stored[SETTINGS_KEY], stored[LEGACY_COLOR_KEY]);

    logInfo("Loaded settings from storage", {
      storedSettings: stored[SETTINGS_KEY],
      legacyColor: stored[LEGACY_COLOR_KEY],
      normalizedSettings: settings
    });

    return settings;
  }

  function applyBackgroundToElements(settings) {
    const elements = document.querySelectorAll(TARGET_SELECTOR);
    logInfo("Elements lookup result", {
      selector: TARGET_SELECTOR,
      count: elements.length
    });

    if (elements.length === 0) {
      logWarn("No target elements found for selector.");
      return;
    }

    const style = buildBackgroundStyle(settings);
    elements.forEach((element) => {
      element.style.setProperty("background", style.background, "important");
      element.style.setProperty("background-color", style.backgroundColor, "important");
      element.style.setProperty("background-image", style.backgroundImage, "important");
    });

    logInfo("Applied background style to elements", {
      count: elements.length,
      mode: settings.mode,
      variation: settings.gradient.variation,
      direction: settings.gradient.direction,
      style
    });
  }

  let currentSettings = createDefaultSettings();

  async function refreshSettingsAndApply() {
    try {
      currentSettings = await getConfiguredSettings();
      applyBackgroundToElements(currentSettings);
    } catch (error) {
      logWarn("Failed to load or apply background settings", error);
    }
  }

  function observeDomChanges() {
    const observer = new MutationObserver((mutationList) => {
      let shouldReapply = false;

      for (const mutation of mutationList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldReapply = true;
          break;
        }
      }

      if (!shouldReapply) {
        return;
      }

      logInfo("DOM mutation detected, reapplying background style.");
      applyBackgroundToElements(currentSettings);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    logInfo("MutationObserver is active.");
  }

  function observeStorageChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") {
        return;
      }
      if (!changes[SETTINGS_KEY] && !changes[LEGACY_COLOR_KEY]) {
        return;
      }

      logInfo("Storage change detected, refreshing settings.", {
        changedKeys: Object.keys(changes)
      });
      refreshSettingsAndApply();
    });

    logInfo("Storage change listener is active.");
  }

  async function init() {
    logInfo("Content script loaded.", { url: window.location.href });

    if (!isTargetPage()) {
      logWarn("Current page is not a target WaniKani lessons page.");
      return;
    }

    logInfo("Target page confirmed. Initializing background styling logic.");
    await refreshSettingsAndApply();
    observeDomChanges();
    observeStorageChanges();
  }

  init();
})();
