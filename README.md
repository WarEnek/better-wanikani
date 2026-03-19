# better-wanikani

Chrome extension that customizes the background style of `.character-header--radical` across all WaniKani pages.

## Files

- `manifest.json` - extension configuration (Manifest V3)
- `content.js` - applies configured solid or gradient background styles
- `popup.html` / `popup.js` - styled popup UI with presets and enable/disable toggle

## Load extension locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.

## Usage

1. Open any WaniKani page:
   `https://www.wanikani.com/`
2. Click the extension icon.
3. Use **Extension enabled** toggle to enable or disable styling.
4. Optionally choose a preset and click **Apply**.
5. Choose mode:
   - **Solid** for one background color
   - **Gradient** for gradient variation, direction, and colors
6. Click **Save**.
7. The extension updates `.character-header--radical` background style on matching elements site-wide.

## Diagnostics logs

Open DevTools Console on the WaniKani page and look for:

- `[WaniKani Radical Color] ...` from content script
- `[WaniKani Radical Color Popup] ...` from popup script
