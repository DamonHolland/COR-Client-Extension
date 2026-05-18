# Call of Roma Client Fixes

Unpacked Chrome extension that fixes a few Call of Roma client-side UI bugs.

## What It Patches

### Rectorate Sprite

The original world-map `Castle4Ani` is constructed with the `field.castle3` resource key, so tier-4 cities can still draw the tier-3 sprite even when the map data correctly says `expandLevel = 3`. This extension injects a page-context patch that makes final-expansion map castles use `field.castle4`.

- `expandLevel = 3` uses `field.castle4`
- lower expansion levels keep the original client behavior

### Arena/Intelligence Reminder Cleanup

The original client clears expired countdown labels but can leave stale returning-hero and expired arena entries in the arrays that power the Intelligence window and its reminder bubbles. This extension prunes those expired client-side entries before the reminder counts and army-action lists render.

- returned heroes no longer remain as expired entries in the Army Action list
- expired arena battle entries no longer keep the Intelligence reminder count alive

### Campaign Hero City Selection

When opening the attack/campaign hero picker from the world map immediately after switching cities, the original client can rebuild the free-hero list from the previous current city. This extension remembers the last city selected through the world-map city controls and forces campaign mode to use that city when building the hero list.

- attacking from the world map uses the newly selected city's free heroes
- the campaign city dropdown is kept in sync with the corrected source city

## Install Unpacked

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the extension folder, meaning the folder that contains `manifest.json`, `content.js`, and `page-patch.js`.
5. Reload the Call of Roma game tab.
