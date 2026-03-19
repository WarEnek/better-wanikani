(() => {
  const LOG_PREFIX = "[WaniKani Radical Color]";
  const STORAGE_KEY = "radicalHeaderColor";
  const DEFAULT_COLOR = "#ff5b5b";
  const TARGET_SELECTOR = ".character-header--radical";
  const TARGET_PATH_PREFIX = "/subject-lessons/";

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

  function isTargetPage() {
    return window.location.pathname.startsWith(TARGET_PATH_PREFIX);
  }

  async function getConfiguredColor() {
    const stored = await chrome.storage.sync.get(STORAGE_KEY);
    const configuredColor = stored[STORAGE_KEY];
    const colorToUse = configuredColor || DEFAULT_COLOR;

    logInfo("Loaded color from storage", {
      configuredColor,
      colorToUse
    });

    return colorToUse;
  }

  function applyColorToElements(color) {
    const elements = document.querySelectorAll(TARGET_SELECTOR);
    logInfo("Elements lookup result", {
      selector: TARGET_SELECTOR,
      count: elements.length
    });

    if (elements.length === 0) {
      logWarn("No target elements found for selector.");
      return;
    }

    elements.forEach((element) => {
      element.style.setProperty("color", color, "important");
    });

    logInfo("Applied color to elements", { color, count: elements.length });
  }

  let currentColor = DEFAULT_COLOR;

  async function refreshColorAndApply() {
    try {
      currentColor = await getConfiguredColor();
      applyColorToElements(currentColor);
    } catch (error) {
      logWarn("Failed to load or apply color", error);
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

      logInfo("DOM mutation detected, reapplying color.");
      applyColorToElements(currentColor);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    logInfo("MutationObserver is active.");
  }

  function observeStorageChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes[STORAGE_KEY]) {
        return;
      }

      const nextColor = changes[STORAGE_KEY].newValue || DEFAULT_COLOR;
      currentColor = nextColor;
      logInfo("Storage change detected, applying new color.", { nextColor });
      applyColorToElements(nextColor);
    });

    logInfo("Storage change listener is active.");
  }

  async function init() {
    logInfo("Content script loaded.", { url: window.location.href });

    if (!isTargetPage()) {
      logWarn("Current page is not a target WaniKani lessons page.");
      return;
    }

    logInfo("Target page confirmed. Initializing color logic.");
    await refreshColorAndApply();
    observeDomChanges();
    observeStorageChanges();
  }

  init();
})();
