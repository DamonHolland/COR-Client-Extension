# Call of Roma Rectorate Sprite Fix

Unpacked Chrome extension that fixes the Call of Roma world-map city sprite selection for the final Rectorate expansion.

## What It Patches

The original world-map `Castle4Ani` is constructed with the `field.castle3` resource key, so tier-4 cities can still draw the tier-3 sprite even when the map data correctly says `expandLevel = 3`. This extension injects a page-context patch that makes final-expansion map castles use `field.castle4`.

- `expandLevel = 3` uses `field.castle4`
- lower expansion levels keep the original client behavior

## Install Unpacked

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the extension folder, meaning the folder that contains `manifest.json`, `content.js`, and `page-patch.js`.
5. Reload the Call of Roma game tab.
