# better-wanikani

Chrome extension that customizes the color of `.character-header--radical` on WaniKani lesson pages.

## Files

- `manifest.json` - extension configuration (Manifest V3)
- `content.js` - applies the configured color on WaniKani lessons pages
- `popup.html` / `popup.js` - popup UI for color configuration

## Load extension locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.

## Usage

1. Open a WaniKani lesson page, for example:
   `https://www.wanikani.com/subject-lessons/4509644722880337842/1`
2. Click the extension icon.
3. Choose a color and click **Save**.
4. The extension updates `.character-header--radical` color on the page.

## Diagnostics logs

Open DevTools Console on the WaniKani page and look for:

- `[WaniKani Radical Color] ...` from content script
- `[WaniKani Radical Color Popup] ...` from popup script
