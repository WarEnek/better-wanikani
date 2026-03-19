# better-wanikani

Chrome extension that customizes the background style of `.character-header--radical` on WaniKani lesson pages.

## Files

- `manifest.json` - extension configuration (Manifest V3)
- `content.js` - applies configured solid or gradient background styles
- `popup.html` / `popup.js` - styled popup UI for background customization

## Load extension locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.

## Usage

1. Open a WaniKani lesson page, for example:
   `https://www.wanikani.com/subject-lessons/4509644722880337842/1`
2. Click the extension icon.
3. Choose mode:
   - **Solid** for one background color
   - **Gradient** for gradient variation, direction, and colors
4. Click **Save**.
5. The extension updates `.character-header--radical` background style on the page.

## Diagnostics logs

Open DevTools Console on the WaniKani page and look for:

- `[WaniKani Radical Color] ...` from content script
- `[WaniKani Radical Color Popup] ...` from popup script
