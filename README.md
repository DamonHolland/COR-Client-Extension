# Call of Roma Client Fixes

Unpacked Chrome extension that fixes a few Call of Roma client-side UI bugs.

## What It Patches

### Rectorate Sprite

The original world-map `Castle4Ani` is constructed with the `field.castle3` resource key, so tier-4 cities can still draw the tier-3 sprite even when the map data correctly says `expandLevel = 3`. This extension injects a page-context patch that makes final-expansion map castles use `field.castle4`.

- `expandLevel = 3` uses `field.castle4`
- lower expansion levels keep the original client behavior

### World Map Tile Click Debugger

This debug build logs world-map tile information to the browser console when a tile is clicked. It does not change map behavior, tile creation, visuals, attacks, building, or server requests.

- logs the clicked coordinate and `idField`
- logs cached server `mapStr` level for the coordinate when available
- logs raw static terrain type/family and transposed terrain type/family
- logs castle bit, cached tile state before and after the original click handler, and basic map container state

### Server Wild Clearing Functional Fix

Some coordinates are visually terrain but vanilla treats them as buildable clearings because the static terrain tile is flat. When the server viewport data says a coordinate has a nonzero wild level but vanilla has no tile object, this extension creates a minimal functional wild tile so the coordinate opens as field info instead of New City.

- only applies when vanilla returns `null` for the tile and server `mapStr` level is greater than zero
- does not attempt final wild family mapping or overlay visuals
- existing wilds, cities, NPCs, battle fields, and normal clearings are left alone

### Arena/Intelligence Reminder Cleanup

The original client clears expired countdown labels but can leave stale returning-hero and expired arena entries in the arrays that power the Intelligence window and its reminder bubbles. This extension prunes those expired client-side entries before the reminder counts and army-action lists render.

- returned heroes no longer remain as expired entries in the Army Action list
- expired arena battle entries no longer keep the Intelligence reminder count alive

### Campaign Hero City Selection

When opening the attack/campaign hero picker from the world map immediately after switching cities, the original client can rebuild the free-hero list from the previous current city. This extension remembers the last city selected through the world-map city controls and forces campaign mode to use that city when building the hero list.

- attacking from the world map uses the newly selected city's free heroes
- the campaign city dropdown is kept in sync with the corrected source city

### Hero Troop Capacity Display

The server rejects troop transfers that exactly fill a hero's displayed Faculty value. This extension treats the server-compatible capacity as one lower when hero Faculty is calculated, so the visible value and troop-transfer limits match the server's rule.

- hero Faculty/capacity displays one less than the original client calculation
- troop transfer limits use the same adjusted value shown in the UI

### Completed Quest Popup Suppression

The original client shows a flashing completed-quest animation whenever rewards are available. This extension keeps that popup and its invisible click target hidden, while leaving quest completion state and the normal Task window available.

- completed quests no longer display the flashing map popup
- quest data, task counts, and reward claiming remain unchanged

### Quest Count Refresh On Launch

The original client can leave the completed-quest bubble at zero until the Task window is opened or a later timer fires. This extension asks the game for the completed quest count after the main toolbar initializes.

- completed-quest count refreshes shortly after login
- the normal quest refresh events and Task window behavior remain unchanged

### News Bar Defaults Closed

The original client opens the rolling news bar by default after login. This extension initializes it in the collapsed position while keeping the normal show/hide buttons available.

- the news bar starts closed
- the player can still reopen it manually

### Recharge Sidebar Defaults Closed

The original client expands the animated "Get Gold" recharge panel in the main toolbar. This extension keeps that toolbar panel collapsed by default.

- the recharge sidebar starts closed
- other recharge entry points, such as coin/recharge buttons, remain unchanged

### External Recharge Ad Removed

The outer page can inject a large `div#left.left` recharge/navigation ad beside the game. This extension removes that DOM sidebar and keeps watching briefly for it if the page inserts it after startup.

- external recharge ad sidebar is removed from the page
- in-game recharge buttons are not changed

## Install Unpacked

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the extension folder, meaning the folder that contains `manifest.json`, `content.js`, and `page-patch.js`.
5. Reload the Call of Roma game tab.
