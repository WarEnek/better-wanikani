(() => {
  const LOG_PREFIX = "[WaniKani Radical Color]";
  const SETTINGS_KEY = "radicalHeaderStyleSettings";
  const LEGACY_COLOR_KEY = "radicalHeaderColor";
  const TARGET_SELECTOR = ".character-header--radical";
  const VALID_MODES = new Set(["solid", "gradient"]);
  const VALID_VARIATIONS = new Set(["linear", "radial", "conic"]);
  const TARGET_TEXT_SELECTOR = ".character-header__meaning";
  const APPLY_RETRY_DELAY_MS = 80;
  const RADICAL_DEFAULT_SOLID_COLOR = "#00aaff";
  const RADICAL_DEFAULT_GRADIENT_START = "#00aaff";
  const RADICAL_DEFAULT_GRADIENT_END = "#0093dd";
  const RADICAL_ORIGINAL_BACKGROUND_COLOR = "rgb(0, 170, 255)";
  const RADICAL_ORIGINAL_GRADIENT_IMAGE =
    "linear-gradient(rgb(0, 170, 255), rgb(0, 147, 221))";
  const RADICAL_ORIGINAL_TEXT_SHADOW = "rgb(0, 147, 221) 2px 2px 0px";

  let pendingApplyRaf = 0;
  let pendingApplyTimeout = 0;
  let lastScheduledReason = "initial";

  function createDefaultSettings() {
    return {
      enabled: true,
      presetId: "custom",
      mode: "gradient",
      solidColor: RADICAL_DEFAULT_SOLID_COLOR,
      gradient: {
        variation: "linear",
        direction: 180,
        startColor: RADICAL_DEFAULT_GRADIENT_START,
        endColor: RADICAL_DEFAULT_GRADIENT_END,
        textShadow: RADICAL_ORIGINAL_TEXT_SHADOW
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

    if (typeof rawSettings.enabled === "boolean") {
      nextSettings.enabled = rawSettings.enabled;
    }

    if (typeof rawSettings.presetId === "string" && rawSettings.presetId.length > 0) {
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
        backgroundImage: "none",
        textShadow: "none"
      };
    }

    const variation = settings.gradient.variation;
    const direction = normalizeDirection(settings.gradient.direction, 90);
    const startColor = settings.gradient.startColor;
    const endColor = settings.gradient.endColor;
    const useOriginalRadicalGradient =
      variation === "linear" &&
      direction === 180 &&
      startColor === RADICAL_DEFAULT_GRADIENT_START &&
      endColor === RADICAL_DEFAULT_GRADIENT_END;

    let backgroundImage = "none";
    if (variation === "linear") {
      if (useOriginalRadicalGradient) {
        backgroundImage = RADICAL_ORIGINAL_GRADIENT_IMAGE;
      } else {
        backgroundImage = `linear-gradient(${direction}deg, ${startColor}, ${endColor})`;
      }
    } else if (variation === "radial") {
      const radialPosition = angleToRadialPosition(direction);
      backgroundImage = `radial-gradient(circle at ${radialPosition}, ${startColor}, ${endColor})`;
    } else if (variation === "conic") {
      backgroundImage = `conic-gradient(from ${direction}deg, ${startColor}, ${endColor}, ${startColor})`;
    }

    return {
      background: backgroundImage,
      backgroundColor: useOriginalRadicalGradient
        ? RADICAL_ORIGINAL_BACKGROUND_COLOR
        : startColor,
      backgroundImage,
      textShadow: RADICAL_ORIGINAL_TEXT_SHADOW
    };
  }

  function getTargetElements() {
    return Array.from(document.querySelectorAll(TARGET_SELECTOR));
  }

  function clearBackgroundStyles(elements) {
    for (const element of elements) {
      element.style.removeProperty("background");
      element.style.removeProperty("background-color");
      element.style.removeProperty("background-image");
      element.style.removeProperty("text-shadow");

      const meaningElement = element.querySelector(TARGET_TEXT_SELECTOR);
      if (meaningElement) {
        meaningElement.style.removeProperty("text-shadow");
      }
    }
  }

  function logTargetComputedStyles(elements, stage) {
    const first = elements[0];
    if (!first) {
      return;
    }
    const firstMeaningElement = first.querySelector(TARGET_TEXT_SELECTOR);
    const firstMeaningTextShadow = firstMeaningElement
      ? firstMeaningElement.style.textShadow
      : "";
    const computedFirstMeaningTextShadow = firstMeaningElement
      ? getComputedStyle(firstMeaningElement).textShadow
      : "not-found";

    logInfo("Target style snapshot", {
      stage,
      className: first.className,
      inline: {
        background: first.style.background,
        backgroundColor: first.style.backgroundColor,
        backgroundImage: first.style.backgroundImage,
        textShadow: first.style.textShadow,
        meaningTextShadow: firstMeaningTextShadow
      },
      computed: {
        textShadow: getComputedStyle(first).textShadow,
        backgroundImage: getComputedStyle(first).backgroundImage,
        meaningTextShadow: computedFirstMeaningTextShadow
      }
    });
  }

  function applyMeaningTextShadowOverride(element, shouldSuppressMeaningShadow) {
    const meaningElement = element.querySelector(TARGET_TEXT_SELECTOR);
    if (!meaningElement) {
      return;
    }

    if (shouldSuppressMeaningShadow) {
      meaningElement.style.setProperty("text-shadow", "none", "important");
      return;
    }

    meaningElement.style.removeProperty("text-shadow");
  }

  function scheduleReapply(reason) {
    lastScheduledReason = reason || "unspecified";

    if (document.visibilityState === "hidden") {
      return;
    }

    if (!pendingApplyRaf) {
      pendingApplyRaf = requestAnimationFrame(() => {
        pendingApplyRaf = 0;
        logInfo("Applying style in animation frame.", {
          reason: lastScheduledReason
        });
        applyBackgroundToElements(currentSettings);
      });
    }

    if (pendingApplyTimeout) {
      clearTimeout(pendingApplyTimeout);
    }
    pendingApplyTimeout = setTimeout(() => {
      pendingApplyTimeout = 0;
      logInfo("Applying style in delayed fallback.", {
        reason: lastScheduledReason,
        delayMs: APPLY_RETRY_DELAY_MS
      });
      applyBackgroundToElements(currentSettings);
    }, APPLY_RETRY_DELAY_MS);
  }

  function mutationContainsTargetNode(mutationList) {
    for (const mutation of mutationList) {
      if (mutation.type === "childList") {
        if (mutation.addedNodes.length === 0) {
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }
          if (node.matches && node.matches(TARGET_SELECTOR)) {
            return true;
          }
          if (node.querySelector && node.querySelector(TARGET_SELECTOR)) {
            return true;
          }
        }
        continue;
      }

      if (mutation.type === "attributes") {
        const targetNode = mutation.target;
        if (
          targetNode &&
          targetNode.nodeType === Node.ELEMENT_NODE &&
          targetNode.matches &&
          targetNode.matches(TARGET_SELECTOR)
        ) {
          return true;
        }
      }
    }
    return false;
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
    const elements = getTargetElements();
    logInfo("Elements lookup result", {
      selector: TARGET_SELECTOR,
      count: elements.length,
      enabled: settings.enabled
    });

    if (elements.length === 0) {
      logInfo("No target elements found yet.");
      return;
    }

    if (!settings.enabled) {
      clearBackgroundStyles(elements);
      logInfo("Extension disabled, removed custom background styles.", {
        count: elements.length
      });
      return;
    }

    const style = buildBackgroundStyle(settings);
    const shouldSuppressMeaningShadow = style.textShadow !== "none";
    logTargetComputedStyles(elements, "before");
    for (const element of elements) {
      element.style.setProperty("background", style.background, "important");
      element.style.setProperty("background-color", style.backgroundColor, "important");
      element.style.setProperty("background-image", style.backgroundImage, "important");
      element.style.setProperty("text-shadow", style.textShadow, "important");
      applyMeaningTextShadowOverride(element, shouldSuppressMeaningShadow);
    }
    logTargetComputedStyles(elements, "after");

    logInfo("Applied background style to elements", {
      count: elements.length,
      enabled: settings.enabled,
      presetId: settings.presetId,
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
      const hasTargetInMutation = mutationContainsTargetNode(mutationList);
      if (!hasTargetInMutation) {
        return;
      }

      logInfo("Target mutation detected, scheduling background reapply.");
      scheduleReapply("mutation observer");
    });

    observer.observe(document.body, {
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style"],
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
    logInfo("WaniKani page detected. Initializing background styling logic.");
    await refreshSettingsAndApply();
    scheduleReapply("initial delayed stabilization");
    observeDomChanges();
    observeStorageChanges();
  }

  init();
})();
