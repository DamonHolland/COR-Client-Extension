(function patchCallOfRomaClientBugs() {
  const PATCH_FLAG = "__callOfRomaRectorateSpriteFixApplied";
  const POLL_INTERVAL_MS = 100;

  if (window[PATCH_FLAG]) {
    return;
  }

  window[PATCH_FLAG] = {
    arenaCleanup: false,
    cityHeroSelection: false,
    citySprites: false,
    externalRechargeAd: false,
    heroTroopCapacity: false,
    lastSelectedCityId: null,
    newsPopup: false,
    questCountRefresh: false,
    questPopup: false,
    serverWildClearingFix: false,
    autoBuild: false,
    autoJob: false,
    autoFreeBuildingSpeed: false,
    blessingPopupSuppressed: false,
    dummyLoad: false,
    heroGearBatch: false,
    startupMute: false,
    webglRecovery: false
  };

  const serverWildLevels = Object.create(null);
  const AFK_MODE_STYLE_ID = "cor-afk-mode-style";
  const AFK_CONTROLS_ID = "cor-afk-controls";
  const AUTO_BUILD_ROW_ID = "cor-auto-build-row";
  const AUTO_BUILD_MODE_BUTTON_ID = "cor-auto-build-mode-btn";
  const AUTO_BUILD_TOGGLE_BUTTON_ID = "cor-auto-build-toggle-btn";
  const AUTO_JOB_ROW_ID = "cor-auto-job-row";
  const AUTO_JOB_MODE_BUTTON_ID = "cor-auto-job-mode-btn";
  const AUTO_JOB_TOGGLE_BUTTON_ID = "cor-auto-job-toggle-btn";
  const DUMMY_PANEL_ID = "cor-dummy-panel";
  const DUMMY_COUNT_INPUT_ID = "cor-dummy-count";
  const DUMMY_LOAD_BUTTON_ID = "cor-dummy-load-btn";
  const HERO_GEAR_PANEL_ID = "cor-hero-gear-panel";
  const HERO_GEAR_UNEQUIP_ALL_BUTTON_ID = "cor-hero-gear-unequip-all-btn";
  const HERO_GEAR_BEST_EQUIP_BUTTON_ID = "cor-hero-gear-best-equip-btn";
  const HERO_GEAR_SOCKET_STEP_DELAY_MS = 120;
  const HERO_OUTFIT_SLOT_MAX = 9;
  const DUMMY_MELEE_ARMY_POSITIONS = [0, 1, 2];
  const DUMMY_RANGED_ARMY_POSITIONS = [3, 4, 5];
  const AUTO_BUILD_INTERVAL_MS = 2500;
  const AUTO_JOB_INTERVAL_MS = 2500;
  const AUTO_BUILD_RETRY_MS = 1200;
  const AUTO_JOB_RETRY_MS = 1200;
  const AUTO_BUILD_SELECT_MODES = ["cottage", "any"];
  const AUTO_JOB_SELECT_MODES = ["husbandry", "forestry", "gemology", "extractive", "lowest"];
  const AUTO_BUILD_MODE_CONFIG = {
    cottage: { label: "Cottage", title: "Auto-Build: upgrade lowest cottage in each city" },
    any: { label: "Any", title: "Auto-Build: upgrade lowest building (barracks excluded)" }
  };
  const AUTO_JOB_MODE_CONFIG = {
    husbandry: { label: "Farm", iconKey: "icon.food", resourceWorkerKey: "food", buildingTypeProp: "TYPE_FARM", workerTypeProp: "FARMER_WORKER_TYPE", title: "Husbandry: train farmers at farms" },
    forestry: { label: "Wood", iconKey: "icon.wood", resourceWorkerKey: "wood", buildingTypeProp: "TYPE_SAWMILL", workerTypeProp: "WOODCUTTER_WORKER_TYPE", title: "Forestry: train woodcutters at sawmills" },
    gemology: { label: "Stone", iconKey: "icon.stone", resourceWorkerKey: "stone", buildingTypeProp: "TYPE_QUARRY", workerTypeProp: "STONEMASON_WORKER_TYPE", title: "Gemology: train stonemasons at quarries" },
    extractive: { label: "Iron", iconKey: "icon.iron", resourceWorkerKey: "iron", buildingTypeProp: "TYPE_MINE_IRON", workerTypeProp: "MINER_WORKER_TYPE", title: "Extractive: train miners at iron mines" },
    lowest: { label: "Low", title: "Lowest jobs: train at whichever resource site has the fewest workers in each city" }
  };
  const AUTO_PRODUCTION_JOB_MODES = ["husbandry", "forestry", "gemology", "extractive"];
  const DUMMY_ASSIGN_STEP_DELAY_MS = 450;
  const DUMMY_ASSIGN_FAST_STEP_DELAY_MS = 120;
  const DUMMY_ASSIGN_RETRY_DELAY_MS = 300;
  const DUMMY_ASSIGN_MAX_ATTEMPTS = 15;
  const DUMMY_UNLOAD_SETTLE_MS = 350;
  const DUMMY_SOCKET_READY_TIMEOUT_MS = 20000;
  const DUMMY_SOCKET_POLL_MS = 80;
  const WEBGL_RECOVERY_BANNER_ID = "cor-webgl-recovery-banner";
  const WEBGL_RECOVERY_STYLE_ID = "cor-webgl-recovery-style";
  const WEBGL_RECOVERY_RELOAD_PROMPT_MS = 8000;
  const WEBGL_RECOVERY_AUTO_RELOAD_AFTER_RESTORE_MS = 1200;
  const AUTO_FREE_SPEED_DEBOUNCE_MS = 1500;
  const AUTO_FREE_SPEED_MAX_ATTEMPTS = 50;
  const AUTO_FREE_SPEED_RETRY_MS = 200;
  const AFK_SETTINGS_STORAGE_KEY = "cor-afk-settings-v1";
  const autoFreeSpeedInFlight = Object.create(null);
  let autoBuildMode = "cottage";
  let autoBuildEnabled = false;
  let autoBuildTimerId = null;
  let autoBuildGateReason = "";
  let autoJobMode = "husbandry";
  let autoJobEnabled = false;
  let autoJobTimerId = null;
  let autoJobGateReason = "";
  let afkSettingsRestored = false;
  let dummyLoadInProgress = false;
  let heroGearBatchInProgress = false;
  let webglContextLost = false;
  let webglRecoveryReloadPromptTimeoutId = null;
  let webglRecoveryAutoReloadTimeoutId = null;
  let webglRecoverySuspendedAutoBuild = false;
  let webglRecoverySuspendedAutoJob = false;

  function removeExternalRechargeAd() {
    let removed = false;
    const sidebar = document.getElementById("left");
    const sidebarToggle = document.querySelector(".cen");

    if (sidebar && sidebar.classList && sidebar.classList.contains("left")) {
      sidebar.remove();
      removed = true;
    }

    if (
      sidebarToggle
      && (
        sidebarToggle.querySelector("#cen1")
        || sidebarToggle.querySelector("#cen2")
      )
    ) {
      sidebarToggle.remove();
      removed = true;
    }

    return removed;
  }

  removeExternalRechargeAd();

  function getBuildingConstant() {
    return window.roma
      && window.roma.common
      && window.roma.common.constants
      && window.roma.common.constants.BuildingConstant;
  }

  function getBuffConstants() {
    return window.roma
      && window.roma.common
      && window.roma.common.constants
      && window.roma.common.constants.BuffConstants;
  }

  function getControllerFactoryInstance() {
    const ControllerFactory = window.ControllerFactory
      || (window.roma
        && window.roma.common
        && window.roma.common.action
        && window.roma.common.action.ControllerFactory);

    return ControllerFactory
      && typeof ControllerFactory.getInstance === "function"
      && ControllerFactory.getInstance();
  }

  function getCaesaryConfigInstance() {
    const CaesaryConfig = window.CaesaryConfig
      || (window.roma
        && window.roma.logic
        && window.roma.logic.CaesaryConfig);

    return CaesaryConfig && CaesaryConfig.instance
      ? CaesaryConfig.instance
      : null;
  }

  function getBuildingController() {
    const factory = getControllerFactoryInstance();

    if (!factory || typeof factory.getBuildingController !== "function") {
      return null;
    }

    return factory.getBuildingController() || null;
  }

  function getWorkerController() {
    const factory = getControllerFactoryInstance();

    if (!factory || typeof factory.getWorkerController !== "function") {
      return null;
    }

    return factory.getWorkerController() || null;
  }

  function getArmyController() {
    const factory = getControllerFactoryInstance();

    if (!factory || typeof factory.getArmyController !== "function") {
      return null;
    }

    return factory.getArmyController() || null;
  }

  function getEquipController() {
    const factory = getControllerFactoryInstance();

    if (!factory || typeof factory.getEquipController !== "function") {
      return null;
    }

    return factory.getEquipController() || null;
  }

  function getTroopForConstants() {
    return window.TroopForConstants
      || (window.roma
        && window.roma.common
        && window.roma.common.constants
        && window.roma.common.constants.TroopForConstants);
  }

  function applyStartupMuteSetting() {
    const config = getCaesaryConfigInstance();

    if (!config) {
      return false;
    }

    config.isPlaySound = false;
    window[PATCH_FLAG].startupMute = true;
    return true;
  }

  function getWorkerConstant() {
    return window.WorkerConstant
      || (window.roma
        && window.roma.common
        && window.roma.common.constants
        && window.roma.common.constants.WorkerConstant);
  }

  function getGameRuleHelper() {
    if (window.GameRuleHelper && window.GameRuleHelper.instance) {
      return window.GameRuleHelper.instance;
    }

    return (window.roma
      && window.roma.logic
      && window.roma.logic.rule
      && window.roma.logic.rule.GameRuleHelper
      && window.roma.logic.rule.GameRuleHelper.instance)
      || (window.roma
        && window.roma.common
        && window.roma.common.GameRuleHelper
        && window.roma.common.GameRuleHelper.instance);
  }

  function getProduceResourceDataClass() {
    return window.roma
      && window.roma.data
      && window.roma.data.ProduceResourceData;
  }

  function getRomaConstants() {
    return window.roma && window.roma.logic && window.roma.logic.RomaConstants;
  }

  function getImgManager() {
    return window.ImgManager
      || (window.roma
        && window.roma.resource
        && window.roma.resource.ImgManager);
  }

  function resolveGameIconUrl(iconKey) {
    if (!iconKey) {
      return null;
    }

    const ImgManager = getImgManager();

    if (!ImgManager || typeof ImgManager.clazz !== "function") {
      return null;
    }

    const clazz = ImgManager.clazz(iconKey);

    if (!clazz) {
      return null;
    }

    if (typeof clazz === "string" && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(clazz)) {
      return clazz;
    }

    const RES = window.RES;

    if (RES && typeof RES.getRes === "function") {
      const resource = RES.getRes(clazz);

      if (typeof resource === "string") {
        return resource;
      }

      if (resource && resource.url) {
        return resource.url;
      }

      if (resource && resource._bitmapData && resource._bitmapData.source) {
        return resource._bitmapData.source;
      }
    }

    return null;
  }

  function readResourceStock(resourceNode) {
    if (resourceNode == null) {
      return 0;
    }

    if (typeof resourceNode === "number") {
      return toInt(resourceNode);
    }

    if (resourceNode.curAmount != null) {
      return toInt(resourceNode.curAmount);
    }

    if (resourceNode.amount != null) {
      return toInt(resourceNode.amount);
    }

    return toInt(resourceNode);
  }

  function getCastleResourceAmount(castle, resType) {
    const RomaConstants = getRomaConstants();
    const resourceManager = castle && castle.resourceManager;

    if (!RomaConstants || !resourceManager) {
      return 0;
    }

    if (resType === RomaConstants.RES_TYPE_FOOD) {
      return readResourceStock(resourceManager.food);
    }

    if (resType === RomaConstants.RES_TYPE_WOOD) {
      return readResourceStock(resourceManager.wood);
    }

    if (resType === RomaConstants.RES_TYPE_STONE) {
      return readResourceStock(resourceManager.stone);
    }

    if (resType === RomaConstants.RES_TYPE_IRON) {
      return readResourceStock(resourceManager.iron);
    }

    if (resType === RomaConstants.RES_TYPE_GOLD) {
      return readResourceStock(resourceManager.golds || resourceManager.gold);
    }

    return 0;
  }

  function hasSufficientResourcesForChecks(resourceChecks, castle, multiplier) {
    const trainCount = Math.max(1, toInt(multiplier));

    if (!resourceChecks || !castle) {
      return true;
    }

    for (let index = 0; index < resourceChecks.length; index += 1) {
      const check = resourceChecks[index];

      if (!check) {
        continue;
      }

      const requiredPerUnit = toInt(check.reqNum);

      if (requiredPerUnit <= 0) {
        continue;
      }

      const available = getCastleResourceAmount(castle, toInt(check.type));

      if (available < requiredPerUnit * trainCount) {
        return false;
      }
    }

    return true;
  }

  function getUpgradeResourceChecks(ruleCheckResult) {
    const checks = [];

    if (!ruleCheckResult) {
      return checks;
    }

    if (ruleCheckResult.resConditionArray && ruleCheckResult.resConditionArray.length > 0) {
      for (let index = 0; index < ruleCheckResult.resConditionArray.length; index += 1) {
        if (ruleCheckResult.resConditionArray[index]) {
          checks.push(ruleCheckResult.resConditionArray[index]);
        }
      }

      return checks;
    }

    const directChecks = [
      ruleCheckResult.food,
      ruleCheckResult.wood,
      ruleCheckResult.stone,
      ruleCheckResult.iron,
      ruleCheckResult.golds
    ];

    for (let index = 0; index < directChecks.length; index += 1) {
      if (directChecks[index]) {
        checks.push(directChecks[index]);
      }
    }

    return checks;
  }

  function calcMaxAffordableCountFromRuleCheck(ruleCheckResult, castle) {
    if (!ruleCheckResult || !castle) {
      return 0;
    }

    const resourceChecks = getUpgradeResourceChecks(ruleCheckResult);
    let maxCount = Number.POSITIVE_INFINITY;
    let hasResourceCost = false;

    for (let index = 0; index < resourceChecks.length; index += 1) {
      const check = resourceChecks[index];

      if (!check) {
        continue;
      }

      const requiredPerUnit = toInt(check.reqNum);

      if (requiredPerUnit <= 0) {
        continue;
      }

      hasResourceCost = true;
      const available = getCastleResourceAmount(castle, toInt(check.type));
      maxCount = Math.min(maxCount, Math.floor(available / requiredPerUnit));
    }

    if (!hasResourceCost) {
      return 1;
    }

    if (!Number.isFinite(maxCount)) {
      return 0;
    }

    return Math.max(0, maxCount);
  }

  function getTargetCastleForBuilding(building, castle) {
    if (building && building.castle) {
      return building.castle;
    }

    return castle || null;
  }

  function getNextBuildingUpgradeRule(building) {
    const ruleHelper = getGameRuleHelper();

    if (!ruleHelper || typeof ruleHelper.getBuildingRule !== "function" || !building) {
      return null;
    }

    try {
      return ruleHelper.getBuildingRule(toInt(building.typeId), toInt(building.level) + 1);
    } catch (error) {
      return null;
    }
  }

  function castleCanAffordUpgradeRule(castle, upgradeRule) {
    const RomaConstants = getRomaConstants();

    if (!castle || !upgradeRule || !RomaConstants) {
      return false;
    }

    const costs = [
      [toInt(upgradeRule.costFood), RomaConstants.RES_TYPE_FOOD],
      [toInt(upgradeRule.costWood), RomaConstants.RES_TYPE_WOOD],
      [toInt(upgradeRule.costStone), RomaConstants.RES_TYPE_STONE],
      [toInt(upgradeRule.costIron), RomaConstants.RES_TYPE_IRON],
      [toInt(upgradeRule.costGold), RomaConstants.RES_TYPE_GOLD]
    ];

    for (let index = 0; index < costs.length; index += 1) {
      const required = costs[index][0];
      const resType = costs[index][1];

      if (required > 0 && getCastleResourceAmount(castle, resType) < required) {
        return false;
      }
    }

    return true;
  }

  function getGameContextEarly() {
    return window.GameContext
      || (window.roma
        && window.roma.logic
        && window.roma.logic.GameContext);
  }

  function isAfKModeGameFrame() {
    if (getGameContextEarly()) {
      return true;
    }

    return Boolean(document.querySelector(".egret-player"));
  }

  function isGameFrameReadyForAfKMode(gateReasonHolder) {
    if (!isAfKModeGameFrame()) {
      gateReasonHolder.reason = "wrong frame";
      return false;
    }

    if (!getGameContextEarly() || !getGameContextEarly().instance) {
      gateReasonHolder.reason = "loading client";
      return false;
    }

    const player = getPlayerObj();

    if (!player) {
      gateReasonHolder.reason = "waiting for login";
      return false;
    }

    if (!hasLoadedPlayerWorld(player)) {
      gateReasonHolder.reason = "loading cities";
      return false;
    }

    gateReasonHolder.reason = "";
    return true;
  }

  function cycleAutoMode(currentMode, modes) {
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % modes.length;

    return modes[nextIndex];
  }

  function canUseLocalStorage() {
    try {
      return typeof window.localStorage !== "undefined" && window.localStorage !== null;
    } catch (error) {
      return false;
    }
  }

  function loadAfKSettings() {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(AFK_SETTINGS_STORAGE_KEY);

      if (!raw) {
        return;
      }

      const settings = JSON.parse(raw);

      if (settings && AUTO_BUILD_SELECT_MODES.indexOf(settings.buildMode) >= 0) {
        autoBuildMode = settings.buildMode;
      }

      if (settings && AUTO_JOB_SELECT_MODES.indexOf(settings.jobMode) >= 0) {
        autoJobMode = settings.jobMode;
      }

      if (settings && typeof settings.buildEnabled === "boolean") {
        autoBuildEnabled = settings.buildEnabled;
      }

      if (settings && typeof settings.jobEnabled === "boolean") {
        autoJobEnabled = settings.jobEnabled;
      }
    } catch (error) {
      // ignore corrupt storage
    }
  }

  function saveAfKSettings() {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(AFK_SETTINGS_STORAGE_KEY, JSON.stringify({
        buildMode: autoBuildMode,
        buildEnabled: autoBuildEnabled,
        jobMode: autoJobMode,
        jobEnabled: autoJobEnabled
      }));
    } catch (error) {
      // ignore quota / privacy mode errors
    }
  }

  function restorePersistedAfKModesWhenReady() {
    if (afkSettingsRestored) {
      return;
    }

    if (!isAfKModeGameFrame()) {
      return;
    }

    const buildReady = !autoBuildEnabled || isGameFrameReadyForAutoBuild();
    const jobReady = !autoJobEnabled || isGameFrameReadyForAutoJob();

    if (!buildReady || !jobReady) {
      return;
    }

    afkSettingsRestored = true;

    updateAutoBuildModeButton();
    updateAutoBuildToggleButton();
    updateAutoJobModeButton();
    updateAutoJobToggleButton();

    if (autoBuildEnabled && autoBuildTimerId === null) {
      runAutoBuildTick();
      startAutoBuildTimer();
    }

    if (autoJobEnabled && autoJobTimerId === null) {
      runAutoJobTick();
      startAutoJobTimer();
    }
  }

  function clearAutoModeButtonContent(button) {
    while (button.firstChild) {
      button.removeChild(button.firstChild);
    }
  }

  function setAutoModeButtonLabel(button, labelText) {
    const label = document.createElement("span");
    label.className = "cor-auto-mode-label";
    label.textContent = labelText;
    button.appendChild(label);
  }

  function setAutoModeButtonIcon(button, iconKey) {
    const iconUrl = resolveGameIconUrl(iconKey);

    if (!iconUrl) {
      return;
    }

    const icon = document.createElement("img");
    icon.className = "cor-auto-mode-icon";
    icon.alt = "";
    icon.src = iconUrl;
    button.insertBefore(icon, button.firstChild);
  }

  function updateAutoToggleButton(buttonId, enabled, activeClass) {
    const button = document.getElementById(buttonId);

    if (!button) {
      return;
    }

    button.textContent = enabled ? "ON" : "OFF";
    button.title = enabled ? "Click to turn OFF" : "Click to turn ON";

    if (enabled) {
      button.classList.add(activeClass);
      button.setAttribute("aria-pressed", "true");
    } else {
      button.classList.remove(activeClass);
      button.setAttribute("aria-pressed", "false");
    }
  }

  function updateAutoBuildModeButton() {
    const button = document.getElementById(AUTO_BUILD_MODE_BUTTON_ID);

    if (!button) {
      return;
    }

    clearAutoModeButtonContent(button);

    const config = AUTO_BUILD_MODE_CONFIG[autoBuildMode] || AUTO_BUILD_MODE_CONFIG.cottage;

    setAutoModeButtonLabel(button, config.label);
    button.title = config.title + " (click to change mode)";
  }

  function updateAutoBuildToggleButton() {
    updateAutoToggleButton(
      AUTO_BUILD_TOGGLE_BUTTON_ID,
      autoBuildEnabled,
      "cor-auto-build-toggle-on"
    );

    const button = document.getElementById(AUTO_BUILD_TOGGLE_BUTTON_ID);

    if (!button) {
      return;
    }

    const modeConfig = AUTO_BUILD_MODE_CONFIG[autoBuildMode] || AUTO_BUILD_MODE_CONFIG.cottage;

    if (autoBuildEnabled) {
      button.title = modeConfig.title + " is ON (click to turn OFF)";
    } else {
      button.title = "Auto-Build is OFF — pick " + modeConfig.label + " mode, then click ON";
    }
  }

  function updateAutoJobModeButton() {
    const button = document.getElementById(AUTO_JOB_MODE_BUTTON_ID);

    if (!button) {
      return;
    }

    clearAutoModeButtonContent(button);

    const config = AUTO_JOB_MODE_CONFIG[autoJobMode] || AUTO_JOB_MODE_CONFIG.husbandry;

    if (config.iconKey) {
      setAutoModeButtonIcon(button, config.iconKey);
    }

    setAutoModeButtonLabel(button, config.label || autoJobMode);
    button.title = (config.title || "Auto-Job") + " (click to change mode)";
  }

  function updateAutoJobToggleButton() {
    updateAutoToggleButton(
      AUTO_JOB_TOGGLE_BUTTON_ID,
      autoJobEnabled,
      "cor-auto-job-toggle-on"
    );
  }

  function hasLoadedPlayerWorld(player) {
    if (!player || typeof player.getAllCastle !== "function") {
      return false;
    }

    const castles = player.getAllCastle();

    if (!castles) {
      return false;
    }

    if (Array.isArray(castles)) {
      return castles.length > 0;
    }

    if (typeof castles.length === "number") {
      return castles.length > 0;
    }

    for (const key in castles) {
      if (Object.prototype.hasOwnProperty.call(castles, key) && castles[key]) {
        return true;
      }
    }

    return false;
  }

  function getResponseDispatcher() {
    return window.roma
      && window.roma.common
      && window.roma.common.ResponseEvtDispatcher
      && window.roma.common.ResponseEvtDispatcher.getInstance
      && window.roma.common.ResponseEvtDispatcher.getInstance();
  }

  function isSocketBusy() {
    const dispatcher = getResponseDispatcher();
    return Boolean(dispatcher && dispatcher.sending);
  }

  function getConstructLimit(player) {
    const BuildingConstant = getBuildingConstant();
    const BuffConstants = getBuffConstants();

    if (!player || !BuildingConstant) {
      return 1;
    }

    const hasExtraBuilderBuff = player.buffManager
      && BuffConstants
      && typeof player.buffManager.getBuffById === "function"
      && player.buffManager.getBuffById(BuffConstants.PLAYER_INCREASE_CONSTRUCT_LIMIT);

    return hasExtraBuilderBuff
      ? BuildingConstant.AFTER_INCREASE_CONSTRUCT_LIMIT
      : BuildingConstant.NORMAL_CONSTRUCT_LIMIT;
  }

  function getCastleIdleBuilderCount(castle, constructLimit) {
    if (!castle || !castle.buildingManager) {
      return 0;
    }

    const busyCount = castle.buildingManager.getUnNormalBuilidngArr().length;
    return Math.max(0, constructLimit - busyCount);
  }

  function forEachCastle(player, callback) {
    if (!player || typeof player.getAllCastle !== "function" || typeof callback !== "function") {
      return;
    }

    const castles = player.getAllCastle();

    if (!castles) {
      return;
    }

    if (Array.isArray(castles)) {
      for (let index = 0; index < castles.length; index += 1) {
        if (castles[index]) {
          callback(castles[index], index);
        }
      }

      return;
    }

    if (typeof castles.length === "number") {
      for (let index = 0; index < castles.length; index += 1) {
        if (castles[index]) {
          callback(castles[index], index);
        }
      }

      return;
    }

    for (const key in castles) {
      if (Object.prototype.hasOwnProperty.call(castles, key) && castles[key]) {
        callback(castles[key], key);
      }
    }
  }

  function collectHouseBuildings(buildingManager) {
    const BuildingConstant = getBuildingConstant();
    const houseTypeId = BuildingConstant && BuildingConstant.TYPE_HOUSE_BUILDING;
    const houses = [];
    const seen = new Set();

    function addHouse(house) {
      if (!house || typeof house.isConstructing !== "function") {
        return;
      }

      const position = toInt(house.position);

      if (seen.has(position)) {
        return;
      }

      seen.add(position);
      houses.push(house);
    }

    if (!buildingManager || houseTypeId === undefined) {
      return houses;
    }

    const houseCollection = buildingManager.getMultipleBuildingArrayByType(houseTypeId);

    if (houseCollection) {
      if (Array.isArray(houseCollection)) {
        for (let index = 0; index < houseCollection.length; index += 1) {
          addHouse(houseCollection[index]);
        }
      } else if (typeof houseCollection.length === "number") {
        for (let index = 0; index < houseCollection.length; index += 1) {
          const house = typeof houseCollection.getItem === "function"
            ? houseCollection.getItem(index)
            : houseCollection[index];
          addHouse(house);
        }
      } else if (Array.isArray(houseCollection.source)) {
        for (let index = 0; index < houseCollection.source.length; index += 1) {
          addHouse(houseCollection.source[index]);
        }
      } else {
        for (const key in houseCollection) {
          if (Object.prototype.hasOwnProperty.call(houseCollection, key)) {
            addHouse(houseCollection[key]);
          }
        }
      }
    }

    const allBuilding = buildingManager.allBuilding;

    if (allBuilding && typeof allBuilding.length === "number") {
      for (let index = 0; index < allBuilding.length; index += 1) {
        const house = allBuilding[index];

        if (house && toInt(house.typeId) === houseTypeId) {
          addHouse(house);
        }
      }
    }

    return houses;
  }

  function canUpgradeBuilding(building, castle) {
    if (!building || typeof building.isConstructing !== "function" || building.isConstructing()) {
      return false;
    }

    const targetCastle = getTargetCastleForBuilding(building, castle);
    const BuildingConstant = getBuildingConstant();
    const level = toInt(building.level);

    if (BuildingConstant && level >= toInt(BuildingConstant.HIGHEST_LEVEL)) {
      return false;
    }

    const upgradeRule = getNextBuildingUpgradeRule(building);

    if (!upgradeRule) {
      return false;
    }

    return castleCanAffordUpgradeRule(targetCastle, upgradeRule);
  }

  function getHouseCityId(house, castle) {
    if (house && house.castle && house.castle.cityId != null) {
      return toInt(house.castle.cityId);
    }

    if (castle && castle.cityId != null) {
      return toInt(castle.cityId);
    }

    return null;
  }

  function requestBuildingUpgrade(building, castle) {
    const buildingController = getBuildingController();
    const cityId = getHouseCityId(building, castle);
    const position = building.position != null ? building.position : building.positionId;

    if (
      !buildingController
      || cityId == null
      || position == null
      || typeof buildingController.upgradeArchitecture !== "function"
    ) {
      return false;
    }

    buildingController.upgradeArchitecture(
      cityId,
      position,
      function autoBuildUpgradeCallback() {
        if (autoBuildEnabled) {
          window.setTimeout(runAutoBuildTick, AUTO_BUILD_RETRY_MS);
        }
      },
      true
    );

    return true;
  }

  function getBaseBuildingClass() {
    return window.roma
      && window.roma.logic
      && window.roma.logic.object
      && window.roma.logic.object.building
      && window.roma.logic.object.building.BaseBuilding;
  }

  function getEvtDispatcher() {
    return window.roma
      && window.roma.message
      && window.roma.message.EvtDispacther
      && window.roma.message.EvtDispacther.instance;
  }

  function getBuildingStatusChangeEventClass() {
    return window.roma
      && window.roma.message
      && window.roma.message.events
      && window.roma.message.events.BuildingStatusChangeEvent;
  }

  function getMultiLang() {
    return (window.roma && window.roma.util && window.roma.util.MultiLang)
      || window.MultiLang
      || null;
  }

  function resolveBuildingCityId(building, fallbackCityId) {
    if (building && building.castle && building.castle.cityId != null) {
      return toInt(building.castle.cityId);
    }

    if (fallbackCityId != null) {
      return toInt(fallbackCityId);
    }

    const player = getPlayerObj();

    if (player && typeof player.getCurCastleObj === "function") {
      const viewedCastle = player.getCurCastleObj();

      if (viewedCastle && viewedCastle.cityId != null) {
        return toInt(viewedCastle.cityId);
      }
    }

    return null;
  }

  function getBuildingAtPosition(castle, position) {
    const buildingManager = castle && castle.buildingManager;

    if (!buildingManager || position == null) {
      return null;
    }

    if (typeof buildingManager.getBuildingObjAtPosition === "function") {
      return buildingManager.getBuildingObjAtPosition(position);
    }

    return null;
  }

  function getAutoFreeSpeedKey(cityId, position) {
    if (cityId == null || position == null) {
      return null;
    }

    return String(toInt(cityId)) + ":" + String(toInt(position));
  }

  function isEligibleForFreeBuildingSpeed(building) {
    const BuildingConstant = getBuildingConstant();

    if (!building || !BuildingConstant) {
      return false;
    }

    if (toInt(building.status) !== toInt(BuildingConstant.STATUS_UPGRAD_ING)) {
      return false;
    }

    if (typeof building.getNextLevelBuildingRule !== "function") {
      return false;
    }

    const nextLevelRule = building.getNextLevelBuildingRule();

    if (!nextLevelRule) {
      return false;
    }

    const buildMinutes = Number(nextLevelRule.costTime) / 60;

    if (!Number.isFinite(buildMinutes)) {
      return false;
    }

    return buildMinutes <= toInt(BuildingConstant.FREE_SPEED_UP_MINS_TIME);
  }

  function tryAutoFreeBuildingSpeed(building, cityIdHint, attempt) {
    const tryAttempt = toInt(attempt);

    if (!building) {
      return;
    }

    const position = building.position != null ? building.position : building.positionId;
    const cityId = resolveBuildingCityId(building, cityIdHint);
    const speedKey = getAutoFreeSpeedKey(cityId, position);

    if (speedKey == null) {
      return;
    }

    const BuildingConstant = getBuildingConstant();
    const buildingController = getBuildingController();
    let liveBuilding = building;

    if (cityId != null && getPlayerObj() && typeof getPlayerObj().getCastleObjById === "function") {
      const castle = getPlayerObj().getCastleObjById(cityId);
      const buildingAtPosition = getBuildingAtPosition(castle, position);

      if (buildingAtPosition) {
        liveBuilding = buildingAtPosition;
      }
    }

    if (!BuildingConstant || !buildingController) {
      if (tryAttempt < AUTO_FREE_SPEED_MAX_ATTEMPTS) {
        window.setTimeout(function retryAutoFreeSpeedForController() {
          tryAutoFreeBuildingSpeed(building, cityIdHint, tryAttempt + 1);
        }, AUTO_FREE_SPEED_RETRY_MS);
      }

      return;
    }

    if (!isEligibleForFreeBuildingSpeed(liveBuilding)) {
      if (tryAttempt < AUTO_FREE_SPEED_MAX_ATTEMPTS) {
        window.setTimeout(function retryAutoFreeSpeedForStatus() {
          tryAutoFreeBuildingSpeed(building, cityIdHint, tryAttempt + 1);
        }, AUTO_FREE_SPEED_RETRY_MS);
      }

      return;
    }

    const now = Date.now();
    const lastAttemptAt = autoFreeSpeedInFlight[speedKey];

    if (lastAttemptAt && now - lastAttemptAt < AUTO_FREE_SPEED_DEBOUNCE_MS) {
      return;
    }

    autoFreeSpeedInFlight[speedKey] = now;

    buildingController.speedUpBuilding(
      cityId,
      position,
      BuildingConstant.FREE_BUILDING_SPEED_UP_ITEM,
      function onAutoFreeSpeedUpResponse(response) {
        if (response && typeof response.isSuccess === "function" && response.isSuccess()) {
          delete autoFreeSpeedInFlight[speedKey];
        }
      },
      false
    );
  }

  function scheduleAutoFreeBuildingSpeed(building, cityIdHint) {
    window.setTimeout(function runAutoFreeSpeedNow() {
      tryAutoFreeBuildingSpeed(building, cityIdHint, 0);
    }, 0);

    window.setTimeout(function runAutoFreeSpeedSoon() {
      tryAutoFreeBuildingSpeed(building, cityIdHint, 0);
    }, 300);
  }

  function patchBlessingPopupSuppression() {
    if (window[PATCH_FLAG].blessingPopupSuppressed) {
      return true;
    }

    const MyAlert = window.views
      && window.views.spreadUI
      && window.views.spreadUI.MyAlert;
    const MyAlert1 = window.views
      && window.views.spreadUI
      && window.views.spreadUI.beginnerGuide
      && window.views.spreadUI.beginnerGuide.MyAlert1;
    const MultiLang = getMultiLang();
    let blessingMessage = "public.free.speedUp";

    if (MultiLang && typeof MultiLang.msg === "function") {
      try {
        blessingMessage = MultiLang.msg("public.free.speedUp");
      } catch (error) {
        // ignore
      }
    }

    function isBlessingPopupMessage(message) {
      if (message == null) {
        return false;
      }

      return String(message) === String(blessingMessage);
    }

    if (MyAlert && typeof MyAlert.show === "function" && !MyAlert.__callOfRomaOriginalShow) {
      MyAlert.__callOfRomaOriginalShow = MyAlert.show;
      MyAlert.show = function showWithoutBlessingPopup(message) {
        if (isBlessingPopupMessage(message)) {
          return;
        }

        return MyAlert.__callOfRomaOriginalShow.apply(this, arguments);
      };
    }

    if (
      MyAlert1
      && MyAlert1.instance
      && typeof MyAlert1.instance.show === "function"
      && !MyAlert1.instance.__callOfRomaOriginalShow
    ) {
      MyAlert1.instance.__callOfRomaOriginalShow = MyAlert1.instance.show;
      MyAlert1.instance.show = function showWithoutBlessingPopup(message) {
        if (isBlessingPopupMessage(message)) {
          return;
        }

        return MyAlert1.instance.__callOfRomaOriginalShow.apply(this, arguments);
      };
    }

    window[PATCH_FLAG].blessingPopupSuppressed = true;
    return true;
  }

  function patchBuildingControllerAutoFreeSpeed() {
    const buildingController = getBuildingController();

    if (!buildingController || !buildingController.constructor || !buildingController.constructor.prototype) {
      return false;
    }

    const controllerPrototype = buildingController.constructor.prototype;

    if (controllerPrototype.__callOfRomaAutoFreeSpeedPatched) {
      return true;
    }

    function wrapArchitectureCallback(cityId, position, callback) {
      return function wrappedArchitectureCallback(response) {
        if (typeof callback === "function") {
          callback.apply(this, arguments);
        }

        if (response && typeof response.isSuccess === "function" && response.isSuccess()) {
          const player = getPlayerObj();

          if (player && typeof player.getCastleObjById === "function") {
            const castle = player.getCastleObjById(cityId);
            const building = getBuildingAtPosition(castle, position);

            if (building) {
              scheduleAutoFreeBuildingSpeed(building, cityId);
            }
          }
        }
      };
    }

    const originalUpgradeArchitecture = controllerPrototype.upgradeArchitecture;

    if (typeof originalUpgradeArchitecture === "function") {
      controllerPrototype.upgradeArchitecture = function upgradeArchitectureWithAutoFreeSpeed(
        cityId,
        position,
        callback
      ) {
        return originalUpgradeArchitecture.call(
          this,
          cityId,
          position,
          wrapArchitectureCallback(cityId, position, callback)
        );
      };
    }

    const originalConsNewBuilding = controllerPrototype.consNewBuilding;

    if (typeof originalConsNewBuilding === "function") {
      controllerPrototype.consNewBuilding = function consNewBuildingWithAutoFreeSpeed(
        cityId,
        position,
        buildingType,
        callback
      ) {
        return originalConsNewBuilding.call(
          this,
          cityId,
          position,
          buildingType,
          wrapArchitectureCallback(cityId, position, callback)
        );
      };
    }

    controllerPrototype.__callOfRomaAutoFreeSpeedPatched = true;
    return true;
  }

  function patchBaseBuildingAutoFreeSpeed() {
    const BaseBuilding = getBaseBuildingClass();

    if (!BaseBuilding || !BaseBuilding.prototype) {
      return false;
    }

    const buildingPrototype = BaseBuilding.prototype;

    if (buildingPrototype.__callOfRomaUpdateArchitectureBeanPatched) {
      return true;
    }

    const originalUpdateArchitectureBean = buildingPrototype.updateArchitectureBean;

    if (typeof originalUpdateArchitectureBean !== "function") {
      return false;
    }

    buildingPrototype.__callOfRomaUpdateArchitectureBeanPatched = true;
    buildingPrototype.updateArchitectureBean = function updateArchitectureBeanWithAutoFreeSpeed(bean) {
      const result = originalUpdateArchitectureBean.apply(this, arguments);
      scheduleAutoFreeBuildingSpeed(this);
      return result;
    };

    return true;
  }

  function patchBuildingStatusAutoFreeSpeedListener() {
    const EvtDispacther = getEvtDispatcher();
    const BuildingStatusChangeEvent = getBuildingStatusChangeEventClass();

    if (
      !EvtDispacther
      || typeof EvtDispacther.addEventListener !== "function"
      || !BuildingStatusChangeEvent
      || !BuildingStatusChangeEvent.EVENT_NAME
      || window[PATCH_FLAG].autoFreeBuildingSpeedListener
    ) {
      return Boolean(window[PATCH_FLAG].autoFreeBuildingSpeedListener);
    }

    EvtDispacther.addEventListener(
      BuildingStatusChangeEvent.EVENT_NAME,
      function onBuildingStatusChangeForAutoFreeSpeed(event) {
        const building = event && (event.buildingObj || event.data);

        if (building) {
          scheduleAutoFreeBuildingSpeed(building);
        }
      }
    );

    window[PATCH_FLAG].autoFreeBuildingSpeedListener = true;
    return true;
  }

  function patchAutoFreeBuildingSpeed() {
    if (window[PATCH_FLAG].autoFreeBuildingSpeed) {
      return true;
    }

    patchBlessingPopupSuppression();

    const controllerPatched = patchBuildingControllerAutoFreeSpeed();
    const buildingPatched = patchBaseBuildingAutoFreeSpeed();
    const listenerPatched = patchBuildingStatusAutoFreeSpeedListener();

    if (!controllerPatched && !buildingPatched) {
      return false;
    }

    window[PATCH_FLAG].autoFreeBuildingSpeed = true;
    return listenerPatched || controllerPatched || buildingPatched;
  }

  function isBarracksBuilding(building) {
    const BuildingConstant = getBuildingConstant();

    if (!building || !BuildingConstant || BuildingConstant.TYPE_BARRACKS == null) {
      return false;
    }

    return toInt(building.typeId) === toInt(BuildingConstant.TYPE_BARRACKS);
  }

  function collectCastleBuildings(buildingManager) {
    const buildings = [];

    if (!buildingManager) {
      return buildings;
    }

    const allBuilding = buildingManager.allBuilding;

    if (allBuilding && typeof allBuilding.length === "number") {
      for (let index = 0; index < allBuilding.length; index += 1) {
        if (allBuilding[index]) {
          buildings.push(allBuilding[index]);
        }
      }
    }

    if (buildingManager.townHall) {
      buildings.push(buildingManager.townHall);
    }

    if (buildingManager.wall) {
      buildings.push(buildingManager.wall);
    }

    return buildings;
  }

  function findLowestUpgradeableBuilding(castle, buildingFilter) {
    const buildingManager = castle && castle.buildingManager;

    if (!buildingManager) {
      return null;
    }

    const buildings = typeof buildingFilter === "function"
      ? buildingFilter(buildingManager)
      : collectCastleBuildings(buildingManager);
    let lowestBuilding = null;
    let lowestLevel = Number.POSITIVE_INFINITY;

    for (let index = 0; index < buildings.length; index += 1) {
      const building = buildings[index];

      if (typeof buildingFilter !== "function" && isBarracksBuilding(building)) {
        continue;
      }

      if (!canUpgradeBuilding(building, castle)) {
        continue;
      }

      const level = toInt(building.level);

      if (level < lowestLevel) {
        lowestLevel = level;
        lowestBuilding = building;
      }
    }

    return lowestBuilding;
  }

  function listAutoBuildCandidates() {
    const player = getPlayerObj();

    if (!player || !autoBuildEnabled) {
      return [];
    }

    const constructLimit = getConstructLimit(player);
    const candidates = [];

    forEachCastle(player, function collectBuildCandidate(castle) {
      if (!castle || getCastleIdleBuilderCount(castle, constructLimit) <= 0) {
        return;
      }

      let building = null;

      if (autoBuildMode === "cottage") {
        building = findLowestUpgradeableBuilding(castle, function cottageFilter(manager) {
          return collectHouseBuildings(manager);
        });
      } else if (autoBuildMode === "any") {
        building = findLowestUpgradeableBuilding(castle);
      }

      if (!building) {
        return;
      }

      candidates.push({
        castle: castle,
        building: building,
        cityId: getHouseCityId(building, castle),
        level: toInt(building.level)
      });
    });

    candidates.sort(function sortByLowestBuildingLevel(left, right) {
      return left.level - right.level;
    });

    return candidates;
  }

  function stopAutoBuildTimer() {
    if (autoBuildTimerId !== null) {
      window.clearInterval(autoBuildTimerId);
      autoBuildTimerId = null;
    }
  }

  function startAutoBuildTimer() {
    stopAutoBuildTimer();
    autoBuildTimerId = window.setInterval(runAutoBuildTick, AUTO_BUILD_INTERVAL_MS);
  }

  function runAutoBuildTick() {
    if (!autoBuildEnabled) {
      return;
    }

    if (!isGameFrameReadyForAutoBuild()) {
      return;
    }

    if (!getPlayerObj() || isSocketBusy()) {
      return;
    }

    const candidates = listAutoBuildCandidates();

    if (candidates.length === 0) {
      return;
    }

    requestBuildingUpgrade(candidates[0].building, candidates[0].castle);
  }

  function setAutoBuildMode(mode) {
    if (AUTO_BUILD_SELECT_MODES.indexOf(mode) < 0) {
      return;
    }

    autoBuildMode = mode;
    updateAutoBuildModeButton();

    if (autoBuildEnabled) {
      runAutoBuildTick();
    }

    saveAfKSettings();
  }

  function setAutoBuildEnabled(enabled) {
    autoBuildEnabled = Boolean(enabled);
    updateAutoBuildToggleButton();

    if (autoBuildEnabled) {
      runAutoBuildTick();
      startAutoBuildTimer();
    } else {
      stopAutoBuildTimer();
    }

    saveAfKSettings();
  }

  function toggleAutoBuildEnabled() {
    setAutoBuildEnabled(!autoBuildEnabled);
  }

  function cycleAutoBuildMode() {
    setAutoBuildMode(cycleAutoMode(autoBuildMode, AUTO_BUILD_SELECT_MODES));
  }

  function removeLegacyAutoModeButtons() {
    const legacyButtonIds = [
      "cor-cottage-mode-btn",
      "cor-farming-mode-btn",
      "cor-auto-build-btn",
      "cor-auto-job-btn"
    ];

    for (let index = 0; index < legacyButtonIds.length; index += 1) {
      const legacyButton = document.getElementById(legacyButtonIds[index]);

      if (legacyButton) {
        legacyButton.remove();
      }
    }
  }

  function ensureAfKControlsContainer() {
    if (!isAfKModeGameFrame()) {
      const strayControls = document.getElementById(AFK_CONTROLS_ID);

      if (strayControls) {
        strayControls.remove();
      }

      return null;
    }

    removeLegacyAutoModeButtons();
    ensureAfKModeStyles();

    let controls = document.getElementById(AFK_CONTROLS_ID);

    if (controls) {
      return controls;
    }

    controls = document.createElement("div");
    controls.id = AFK_CONTROLS_ID;

    const mountTarget = document.body || document.documentElement;

    if (mountTarget) {
      mountTarget.appendChild(controls);
    }

    return controls;
  }

  function ensureAfKModeStyles() {
    if (document.getElementById(AFK_MODE_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = AFK_MODE_STYLE_ID;
    style.textContent = [
      "#" + AFK_CONTROLS_ID + " {",
      "  position: fixed !important;",
      "  top: 8px !important;",
      "  left: 8px !important;",
      "  z-index: 2147483647 !important;",
      "  display: flex !important;",
      "  flex-direction: column;",
      "  align-items: flex-start;",
      "  gap: 4px;",
      "  pointer-events: auto;",
      "}",
      ".cor-afk-mode-btn {",
      "  margin: 0;",
      "  min-width: 42px;",
      "  padding: 6px 10px;",
      "  border: 1px solid #5c4a32;",
      "  border-radius: 4px;",
      "  background: #3d3428;",
      "  color: #f5e6c8;",
      "  font: 600 12px/1.2 Arial, sans-serif;",
      "  cursor: pointer;",
      "  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);",
      "  pointer-events: auto;",
      "}",
      ".cor-afk-mode-btn:hover {",
      "  background: #4a4032;",
      "}",
      ".cor-auto-row {",
      "  display: flex !important;",
      "  align-items: center;",
      "  gap: 4px;",
      "  pointer-events: auto;",
      "}",
      ".cor-auto-mode-btn {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 5px;",
      "  min-width: 64px;",
      "}",
      ".cor-auto-toggle-btn {",
      "  min-width: 42px;",
      "}",
      "#" + AUTO_BUILD_TOGGLE_BUTTON_ID + ".cor-auto-build-toggle-on {",
      "  background: #2d6a4f;",
      "  border-color: #1b4332;",
      "  color: #ffffff;",
      "}",
      "#" + AUTO_BUILD_TOGGLE_BUTTON_ID + ".cor-auto-build-toggle-on:hover {",
      "  background: #40916c;",
      "}",
      "#" + AUTO_JOB_TOGGLE_BUTTON_ID + ".cor-auto-job-toggle-on {",
      "  background: #7f4f24;",
      "  border-color: #603814;",
      "  color: #ffffff;",
      "}",
      "#" + AUTO_JOB_TOGGLE_BUTTON_ID + ".cor-auto-job-toggle-on:hover {",
      "  background: #9a6b3f;",
      "}",
      ".cor-auto-mode-icon {",
      "  width: 16px;",
      "  height: 16px;",
      "  object-fit: contain;",
      "  flex: 0 0 auto;",
      "}",
      ".cor-auto-mode-label {",
      "  line-height: 1;",
      "}",
      "#" + DUMMY_PANEL_ID + " {",
      "  display: flex !important;",
      "  align-items: center;",
      "  gap: 6px;",
      "  pointer-events: auto;",
      "}",
      "#" + DUMMY_COUNT_INPUT_ID + " {",
      "  display: block !important;",
      "  visibility: visible !important;",
      "  width: 52px !important;",
      "  min-width: 52px;",
      "  margin: 0;",
      "  padding: 6px 6px;",
      "  border: 1px solid #c9a227 !important;",
      "  border-radius: 4px;",
      "  background: #1a1610 !important;",
      "  color: #ffffff !important;",
      "  font: 600 13px/1.2 Arial, sans-serif;",
      "  text-align: center;",
      "  box-sizing: border-box;",
      "  -moz-appearance: textfield;",
      "}",
      "#" + DUMMY_COUNT_INPUT_ID + "::-webkit-outer-spin-button,",
      "#" + DUMMY_COUNT_INPUT_ID + "::-webkit-inner-spin-button {",
      "  -webkit-appearance: none;",
      "  margin: 0;",
      "}",
      "#" + DUMMY_LOAD_BUTTON_ID + " {",
      "  min-width: 56px;",
      "}",
      "#" + HERO_GEAR_PANEL_ID + " {",
      "  display: flex !important;",
      "  align-items: center;",
      "  gap: 4px;",
      "  pointer-events: auto;",
      "}",
      "#" + HERO_GEAR_UNEQUIP_ALL_BUTTON_ID + ",",
      "#" + HERO_GEAR_BEST_EQUIP_BUTTON_ID + " {",
      "  min-width: 72px;",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function ensureAutoBuildControls() {
    const controls = ensureAfKControlsContainer();

    if (!controls) {
      return null;
    }

    let row = document.getElementById(AUTO_BUILD_ROW_ID);

    if (!row) {
      row = document.createElement("div");
      row.id = AUTO_BUILD_ROW_ID;
      row.className = "cor-auto-row";

      const modeButton = document.createElement("button");
      modeButton.id = AUTO_BUILD_MODE_BUTTON_ID;
      modeButton.type = "button";
      modeButton.className = "cor-afk-mode-btn cor-auto-mode-btn";
      modeButton.addEventListener("click", cycleAutoBuildMode);
      row.appendChild(modeButton);

      const toggleButton = document.createElement("button");
      toggleButton.id = AUTO_BUILD_TOGGLE_BUTTON_ID;
      toggleButton.type = "button";
      toggleButton.className = "cor-afk-mode-btn cor-auto-toggle-btn";
      toggleButton.addEventListener("click", toggleAutoBuildEnabled);
      row.appendChild(toggleButton);

      controls.appendChild(row);
      window[PATCH_FLAG].autoBuild = true;
    } else if (row.parentElement !== controls) {
      controls.appendChild(row);
    }

    updateAutoBuildModeButton();
    updateAutoBuildToggleButton();

    return row;
  }

  function isGameFrameReadyForAutoBuild() {
    const gate = { reason: autoBuildGateReason };

    if (!isGameFrameReadyForAfKMode(gate)) {
      autoBuildGateReason = gate.reason;
      return false;
    }

    if (!getBuildingController()) {
      autoBuildGateReason = "loading controllers";
      return false;
    }

    autoBuildGateReason = "";
    return true;
  }

  function getProductionBuilding(castle, buildingTypeId) {
    if (!castle || !castle.buildingManager || buildingTypeId == null) {
      return null;
    }

    const building = castle.buildingManager.getUniqueBuildingByType(buildingTypeId);

    if (!building || toInt(building.level) < 1) {
      return null;
    }

    return building;
  }

  function getAutoJobModeConfig(mode) {
    return AUTO_JOB_MODE_CONFIG[mode] || null;
  }

  function getAutoJobBuildingTypeId(mode) {
    const config = getAutoJobModeConfig(mode);
    const BuildingConstant = getBuildingConstant();

    if (!config || !BuildingConstant) {
      return null;
    }

    return BuildingConstant[config.buildingTypeProp];
  }

  function getAutoJobWorkerType(mode) {
    const config = getAutoJobModeConfig(mode);
    const WorkerConstant = getWorkerConstant();

    if (!config || !config.workerTypeProp || !WorkerConstant) {
      return null;
    }

    return WorkerConstant[config.workerTypeProp];
  }

  function getCastleAssignedWorkerCount(castle, resourceWorkerKey) {
    const resourceManager = castle && castle.resourceManager;
    const resource = resourceManager && resourceWorkerKey && resourceManager[resourceWorkerKey];

    return toInt(resource && resource.worker);
  }

  function findLowestWorkerProductionSlot(castle) {
    let bestSlot = null;

    for (let index = 0; index < AUTO_PRODUCTION_JOB_MODES.length; index += 1) {
      const mode = AUTO_PRODUCTION_JOB_MODES[index];
      const config = getAutoJobModeConfig(mode);
      const buildingTypeId = getAutoJobBuildingTypeId(mode);
      const workerType = getAutoJobWorkerType(mode);
      const building = getProductionBuilding(castle, buildingTypeId);

      if (!config || !building || workerType == null) {
        continue;
      }

      const trainCount = calcMaxWorkerTrainCount(building, workerType, castle);

      if (trainCount <= 0) {
        continue;
      }

      const workerCount = getCastleAssignedWorkerCount(castle, config.resourceWorkerKey);

      if (
        !bestSlot
        || workerCount < bestSlot.workerCount
        || (
          workerCount === bestSlot.workerCount
          && toInt(building.level) < toInt(bestSlot.building.level)
        )
      ) {
        bestSlot = {
          building: building,
          workerType: workerType,
          count: trainCount,
          workerCount: workerCount,
          mode: mode
        };
      }
    }

    return bestSlot;
  }

  function isCastleWorkerQueueEmpty(castle) {
    const manager = castle && castle.workerTrainningManager;

    if (!manager) {
      return false;
    }

    return manager.workerTrainningBean == null;
  }

  function calcMaxWorkerTrainCount(building, workerType, castle) {
    const GameRuleHelper = getGameRuleHelper();

    if (!GameRuleHelper || !building || !castle || workerType == null) {
      return 0;
    }

    const buildingRule = GameRuleHelper.getBuildingRule(building.typeId, building.level);
    const workerRule = GameRuleHelper.getWorkerRule(workerType);

    if (!buildingRule || !workerRule) {
      return 0;
    }

    let ruleCheckResult = null;

    if (typeof workerRule.check === "function") {
      ruleCheckResult = workerRule.check(building);
    }

    if (!ruleCheckResult) {
      return 0;
    }

    const maxByResources = calcMaxAffordableCountFromRuleCheck(ruleCheckResult, castle);

    if (maxByResources <= 0) {
      return 0;
    }

    let maxByPopulation = Number.POSITIVE_INFINITY;
    const populationPerWorker = toInt(workerRule.population);
    const resourceManager = castle.resourceManager;

    if (populationPerWorker > 0 && resourceManager) {
      const populationPool = Math.max(
        0,
        toInt(resourceManager.freePopulation)
      );

      if (populationPool <= 0) {
        return 0;
      }

      maxByPopulation = Math.floor(populationPool / populationPerWorker);
    }

    const slotCap = toInt(buildingRule.buff1);

    return Math.max(0, Math.min(maxByResources, maxByPopulation, slotCap));
  }

  function canTrainWorkers(building, workerType, castle, count) {
    const trainCount = toInt(count);

    if (trainCount <= 0) {
      return false;
    }

    const affordableCount = calcMaxWorkerTrainCount(building, workerType, castle);

    return affordableCount >= trainCount;
  }

  function requestWorkerTraining(castle, building, workerType, count) {
    if (!castle || !building || workerType == null || count <= 0) {
      return false;
    }

    if (!canTrainWorkers(building, workerType, castle, count)) {
      return false;
    }

    if (typeof building.trainningWorker === "function") {
      building.trainningWorker(workerType, count);

      if (autoJobEnabled) {
        window.setTimeout(runAutoJobTick, AUTO_JOB_RETRY_MS);
      }

      return true;
    }

    const workerController = getWorkerController();
    const cityId = toInt(castle.cityId);

    if (
      !workerController
      || cityId == null
      || typeof workerController.trainningWorker !== "function"
    ) {
      return false;
    }

    workerController.trainningWorker(
      cityId,
      workerType,
      count,
      function autoJobTrainCallback() {
        if (autoJobEnabled) {
          window.setTimeout(runAutoJobTick, AUTO_JOB_RETRY_MS);
        }
      },
      true
    );

    return true;
  }

  function listAutoJobCandidates() {
    const player = getPlayerObj();

    if (!player || !autoJobEnabled) {
      return [];
    }

    const candidates = [];

    if (autoJobMode === "lowest") {
      forEachCastle(player, function collectLowestJobCandidate(castle) {
        if (!castle || !isCastleWorkerQueueEmpty(castle)) {
          return;
        }

        const slot = findLowestWorkerProductionSlot(castle);

        if (!slot) {
          return;
        }

        candidates.push({
          castle: castle,
          building: slot.building,
          workerType: slot.workerType,
          cityId: toInt(castle.cityId),
          count: slot.count,
          workerCount: slot.workerCount
        });
      });

      candidates.sort(function sortByLowestWorkerCount(left, right) {
        return left.workerCount - right.workerCount;
      });

      return candidates;
    }

    const buildingTypeId = getAutoJobBuildingTypeId(autoJobMode);
    const workerType = getAutoJobWorkerType(autoJobMode);

    if (buildingTypeId == null || workerType == null) {
      return [];
    }

    forEachCastle(player, function collectJobCandidate(castle) {
      if (!castle || !isCastleWorkerQueueEmpty(castle)) {
        return;
      }

      const building = getProductionBuilding(castle, buildingTypeId);

      if (!building) {
        return;
      }

      const count = calcMaxWorkerTrainCount(building, workerType, castle);

      if (count <= 0) {
        return;
      }

      candidates.push({
        castle: castle,
        building: building,
        workerType: workerType,
        cityId: toInt(castle.cityId),
        count: count
      });
    });

    return candidates;
  }

  function stopAutoJobTimer() {
    if (autoJobTimerId !== null) {
      window.clearInterval(autoJobTimerId);
      autoJobTimerId = null;
    }
  }

  function startAutoJobTimer() {
    stopAutoJobTimer();
    autoJobTimerId = window.setInterval(runAutoJobTick, AUTO_JOB_INTERVAL_MS);
  }

  function runAutoJobTick() {
    if (!autoJobEnabled) {
      return;
    }

    if (!isGameFrameReadyForAutoJob()) {
      return;
    }

    if (!getPlayerObj() || isSocketBusy()) {
      return;
    }

    const candidates = listAutoJobCandidates();

    if (candidates.length === 0) {
      return;
    }

    const candidate = candidates[0];
    requestWorkerTraining(
      candidate.castle,
      candidate.building,
      candidate.workerType,
      candidate.count
    );
  }

  function setAutoJobMode(mode) {
    if (AUTO_JOB_SELECT_MODES.indexOf(mode) < 0) {
      return;
    }

    autoJobMode = mode;
    updateAutoJobModeButton();

    if (autoJobEnabled) {
      runAutoJobTick();
    }

    saveAfKSettings();
  }

  function setAutoJobEnabled(enabled) {
    autoJobEnabled = Boolean(enabled);
    updateAutoJobToggleButton();

    if (autoJobEnabled) {
      runAutoJobTick();
      startAutoJobTimer();
    } else {
      stopAutoJobTimer();
    }

    saveAfKSettings();
  }

  function toggleAutoJobEnabled() {
    setAutoJobEnabled(!autoJobEnabled);
  }

  function cycleAutoJobMode() {
    setAutoJobMode(cycleAutoMode(autoJobMode, AUTO_JOB_SELECT_MODES));
  }

  function suspendAfKModesForWebGLRecovery() {
    if (autoBuildEnabled && autoBuildTimerId !== null) {
      webglRecoverySuspendedAutoBuild = true;
      stopAutoBuildTimer();
    }

    if (autoJobEnabled && autoJobTimerId !== null) {
      webglRecoverySuspendedAutoJob = true;
      stopAutoJobTimer();
    }
  }

  function resumeAfKModesAfterWebGLRecovery() {
    if (webglRecoverySuspendedAutoBuild) {
      webglRecoverySuspendedAutoBuild = false;

      if (autoBuildEnabled) {
        startAutoBuildTimer();
      }
    }

    if (webglRecoverySuspendedAutoJob) {
      webglRecoverySuspendedAutoJob = false;

      if (autoJobEnabled) {
        startAutoJobTimer();
      }
    }
  }

  function clearWebGLRecoveryTimeouts() {
    if (webglRecoveryReloadPromptTimeoutId !== null) {
      window.clearTimeout(webglRecoveryReloadPromptTimeoutId);
      webglRecoveryReloadPromptTimeoutId = null;
    }

    if (webglRecoveryAutoReloadTimeoutId !== null) {
      window.clearTimeout(webglRecoveryAutoReloadTimeoutId);
      webglRecoveryAutoReloadTimeoutId = null;
    }
  }

  function reloadGamePageForWebGLRecovery() {
    clearWebGLRecoveryTimeouts();

    try {
      window.location.reload();
    } catch (error) {
      // ignore
    }
  }

  function ensureWebGLRecoveryStyles() {
    if (document.getElementById(WEBGL_RECOVERY_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = WEBGL_RECOVERY_STYLE_ID;
    style.textContent = [
      "#" + WEBGL_RECOVERY_BANNER_ID + " {",
      "  position: fixed !important;",
      "  top: 50% !important;",
      "  left: 50% !important;",
      "  transform: translate(-50%, -50%) !important;",
      "  z-index: 2147483646 !important;",
      "  max-width: min(420px, 92vw) !important;",
      "  padding: 16px 18px !important;",
      "  border-radius: 8px !important;",
      "  background: rgba(20, 16, 12, 0.94) !important;",
      "  color: #f5e6c8 !important;",
      "  font: 14px/1.45 Arial, sans-serif !important;",
      "  text-align: center !important;",
      "  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45) !important;",
      "  pointer-events: auto !important;",
      "}",
      "#" + WEBGL_RECOVERY_BANNER_ID + " button {",
      "  margin-top: 12px !important;",
      "  padding: 8px 14px !important;",
      "  cursor: pointer !important;",
      "  border: 1px solid #8a6d3b !important;",
      "  border-radius: 4px !important;",
      "  background: #3d2f1f !important;",
      "  color: #f5e6c8 !important;",
      "  font: inherit !important;",
      "}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  function showWebGLRecoveryBanner(mode) {
    if (!isAfKModeGameFrame()) {
      return;
    }

    ensureWebGLRecoveryStyles();

    let banner = document.getElementById(WEBGL_RECOVERY_BANNER_ID);

    if (!banner) {
      banner = document.createElement("div");
      banner.id = WEBGL_RECOVERY_BANNER_ID;
      (document.body || document.documentElement).appendChild(banner);
    }

    banner.replaceChildren();

    const message = document.createElement("div");

    if (mode === "recovering") {
      message.textContent = "Game graphics were reset by the browser. Recovering…";
    } else if (mode === "restored") {
      message.textContent = "Graphics restored. Reloading the game…";
    } else {
      message.textContent = "Game graphics were lost. Reload the page to continue.";
    }

    banner.appendChild(message);

    if (mode === "reload") {
      const reloadButton = document.createElement("button");
      reloadButton.type = "button";
      reloadButton.textContent = "Reload game";
      reloadButton.addEventListener("click", reloadGamePageForWebGLRecovery);
      banner.appendChild(reloadButton);
    }

    banner.hidden = false;
  }

  function hideWebGLRecoveryBanner() {
    const banner = document.getElementById(WEBGL_RECOVERY_BANNER_ID);

    if (banner) {
      banner.hidden = true;
    }
  }

  function scheduleWebGLRecoveryReloadPrompt() {
    if (webglRecoveryReloadPromptTimeoutId !== null) {
      return;
    }

    webglRecoveryReloadPromptTimeoutId = window.setTimeout(function showReloadPrompt() {
      webglRecoveryReloadPromptTimeoutId = null;

      if (!webglContextLost) {
        return;
      }

      showWebGLRecoveryBanner("reload");
    }, WEBGL_RECOVERY_RELOAD_PROMPT_MS);
  }

  function handleWebGLContextLost() {
    if (webglContextLost) {
      return;
    }

    webglContextLost = true;
    suspendAfKModesForWebGLRecovery();
    showWebGLRecoveryBanner("recovering");
    scheduleWebGLRecoveryReloadPrompt();
  }

  function handleWebGLContextRestored() {
    webglContextLost = false;
    clearWebGLRecoveryTimeouts();
    showWebGLRecoveryBanner("restored");
    resumeAfKModesAfterWebGLRecovery();

    webglRecoveryAutoReloadTimeoutId = window.setTimeout(function reloadAfterWebGLRestore() {
      webglRecoveryAutoReloadTimeoutId = null;
      reloadGamePageForWebGLRecovery();
    }, WEBGL_RECOVERY_AUTO_RELOAD_AFTER_RESTORE_MS);
  }

  function installWebGLContextRecovery() {
    if (window[PATCH_FLAG].webglRecovery) {
      return true;
    }

    if (!isAfKModeGameFrame()) {
      return false;
    }

    const canvas = document.querySelector(".egret-player canvas");

    if (!canvas || canvas.__corWebglRecoveryBound) {
      if (canvas && canvas.__corWebglRecoveryBound) {
        window[PATCH_FLAG].webglRecovery = true;
      }

      return Boolean(canvas && canvas.__corWebglRecoveryBound);
    }

    canvas.__corWebglRecoveryBound = true;

    canvas.addEventListener("webglcontextlost", function onWebGLContextLost(event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      handleWebGLContextLost();
    }, false);

    canvas.addEventListener("webglcontextrestored", function onWebGLContextRestored() {
      handleWebGLContextRestored();
    }, false);

    window[PATCH_FLAG].webglRecovery = true;
    return true;
  }

  function ensureAutoJobControls() {
    const controls = ensureAfKControlsContainer();

    if (!controls) {
      return null;
    }

    let row = document.getElementById(AUTO_JOB_ROW_ID);

    if (!row) {
      row = document.createElement("div");
      row.id = AUTO_JOB_ROW_ID;
      row.className = "cor-auto-row";

      const modeButton = document.createElement("button");
      modeButton.id = AUTO_JOB_MODE_BUTTON_ID;
      modeButton.type = "button";
      modeButton.className = "cor-afk-mode-btn cor-auto-mode-btn";
      modeButton.addEventListener("click", cycleAutoJobMode);
      row.appendChild(modeButton);

      const toggleButton = document.createElement("button");
      toggleButton.id = AUTO_JOB_TOGGLE_BUTTON_ID;
      toggleButton.type = "button";
      toggleButton.className = "cor-afk-mode-btn cor-auto-toggle-btn";
      toggleButton.addEventListener("click", toggleAutoJobEnabled);
      row.appendChild(toggleButton);

      const buildRow = document.getElementById(AUTO_BUILD_ROW_ID);

      if (buildRow && buildRow.nextSibling) {
        controls.insertBefore(row, buildRow.nextSibling);
      } else {
        controls.appendChild(row);
      }

      window[PATCH_FLAG].autoJob = true;
    } else if (row.parentElement !== controls) {
      controls.appendChild(row);
    }

    updateAutoJobModeButton();
    updateAutoJobToggleButton();

    return row;
  }

  function isGameFrameReadyForAutoJob() {
    const gate = { reason: autoJobGateReason };

    if (!isGameFrameReadyForAfKMode(gate)) {
      autoJobGateReason = gate.reason;
      return false;
    }

    if (!getWorkerController()) {
      autoJobGateReason = "loading controllers";
      return false;
    }

    autoJobGateReason = "";
    return true;
  }

  function getDummyTroopCount() {
    const input = document.getElementById(DUMMY_COUNT_INPUT_ID);
    const rawValue = input ? input.value : "1";
    const count = toInt(rawValue);

    return count > 0 ? count : 1;
  }

  function isArmyResponseSuccess(response) {
    return !response
      || typeof response.isSuccess !== "function"
      || response.isSuccess();
  }

  function showArmyResponseError(response) {
    const MyAlert = window.views
      && window.views.spreadUI
      && window.views.spreadUI.MyAlert;

    if (
      MyAlert
      && typeof MyAlert.showError === "function"
      && response
    ) {
      MyAlert.showError(response);
    }
  }

  function getSelectedHeroObj() {
    const helper = getHeroHelper();

    if (helper && helper.curSelectHero) {
      return helper.curSelectHero;
    }

    const player = getPlayerObj();
    const castle = getCurrentCastle();

    if (!player || !castle || !castle.heroManager || !castle.heroManager.heroArray) {
      return null;
    }

    const heroes = castle.heroManager.heroArray;

    if (typeof heroes.length !== "number") {
      return null;
    }

    for (let index = 0; index < heroes.length; index += 1) {
      const hero = typeof heroes.getItemAt === "function"
        ? heroes.getItemAt(index)
        : heroes[index];

      if (hero && hero.selectedInUi) {
        return hero;
      }
    }

    return null;
  }

  function getHeroCityId(hero) {
    if (hero && hero.castleObj && hero.castleObj.cityId != null) {
      return toInt(hero.castleObj.cityId);
    }

    if (hero && hero.castle && hero.castle.cityId != null) {
      return toInt(hero.castle.cityId);
    }

    return null;
  }

  function getHeroId(hero) {
    return hero && hero.heroInfo && hero.heroInfo.id != null
      ? toInt(hero.heroInfo.id)
      : null;
  }

  function getHeroCastle(hero, cityId) {
    if (hero && hero.castleObj) {
      return hero.castleObj;
    }

    const player = getPlayerObj();

    if (!player || cityId == null || typeof player.getCastleObjById !== "function") {
      return null;
    }

    return player.getCastleObjById(cityId);
  }

  function getCastleTroopStock(castle, troopType) {
    if (!castle || !castle.troopManager || typeof castle.troopManager.getTroopByTypeId !== "function") {
      return 0;
    }

    const troopPair = castle.troopManager.getTroopByTypeId(troopType);

    return toInt(troopPair && troopPair.value);
  }

  function buildCastleToHeroDelta(castle, troopType, troopsOnHero) {
    const castleStock = getCastleTroopStock(castle, troopType);
    const remainInCastle = Math.max(0, castleStock - troopsOnHero);

    return remainInCastle + 0.1;
  }

  function waitUntilSocketReady(callback, timeoutMs) {
    const startedAt = Date.now();
    const limitMs = timeoutMs || DUMMY_SOCKET_READY_TIMEOUT_MS;

    function poll() {
      if (!isSocketBusy()) {
        callback(true);
        return;
      }

      if (Date.now() - startedAt >= limitMs) {
        callback(false);
        return;
      }

      window.setTimeout(poll, DUMMY_SOCKET_POLL_MS);
    }

    poll();
  }

  function getHeroSlotTroopCount(hero, armyPos) {
    const troops = hero && hero.armyManager && hero.armyManager.troopsArray;
    const troop = troops && troops[armyPos];

    return toInt(troop && troop.count);
  }

  function isHeroSlotFilled(hero, assignment) {
    return getHeroSlotTroopCount(hero, assignment.armyPos) >= assignment.count;
  }

  function assignHeroTroopsFromCastle(castle, cityId, heroId, hero, assignments, callback) {
    const armyController = getArmyController();

    if (!armyController || typeof armyController.castle2Hero !== "function") {
      callback(false);
      return;
    }

    let index = 0;
    let attempts = 0;

    function assignCurrent() {
      if (index >= assignments.length) {
        callback(true);
        return;
      }

      const assignment = assignments[index];

      waitUntilSocketReady(function onSocketReady(ready) {
        if (!ready) {
          attempts += 1;

          if (attempts >= DUMMY_ASSIGN_MAX_ATTEMPTS) {
            callback(false);
            return;
          }

          window.setTimeout(assignCurrent, DUMMY_ASSIGN_RETRY_DELAY_MS);
          return;
        }

        const delta = buildCastleToHeroDelta(castle, assignment.troopType, assignment.count);

        armyController.castle2Hero(
          cityId,
          heroId,
          assignment.armyPos,
          assignment.troopType,
          delta,
          function dummyAssignCallback(response) {
            if (typeof hero.updateHeroObj === "function") {
              hero.updateHeroObj();
            }

            const slotFilled = isHeroSlotFilled(hero, assignment);
            const responseOk = isArmyResponseSuccess(response);

            if (!responseOk || !slotFilled) {
              attempts += 1;

              if (attempts >= DUMMY_ASSIGN_MAX_ATTEMPTS) {
                if (!responseOk) {
                  showArmyResponseError(response);
                }

                callback(false);
                return;
              }

              window.setTimeout(
                assignCurrent,
                DUMMY_ASSIGN_RETRY_DELAY_MS * Math.min(attempts, 5)
              );
              return;
            }

            const stepDelay = attempts > 0
              ? DUMMY_ASSIGN_STEP_DELAY_MS
              : DUMMY_ASSIGN_FAST_STEP_DELAY_MS;

            attempts = 0;
            index += 1;
            window.setTimeout(assignCurrent, stepDelay);
          },
          true
        );
      }, DUMMY_SOCKET_READY_TIMEOUT_MS);
    }

    assignCurrent();
  }

  function loadDummyHero() {
    if (dummyLoadInProgress) {
      return;
    }

    if (!isAfKModeGameFrame() || !getPlayerObj()) {
      return;
    }

    const armyController = getArmyController();
    const TroopForConstants = getTroopForConstants();
    const hero = getSelectedHeroObj();
    const count = getDummyTroopCount();
    const cityId = getHeroCityId(hero);
    const heroId = getHeroId(hero);
    const castle = getHeroCastle(hero, cityId);

    if (
      !armyController
      || !TroopForConstants
      || !hero
      || !castle
      || cityId == null
      || heroId == null
    ) {
      return;
    }

    if (hero.isInCastle === false) {
      return;
    }

    dummyLoadInProgress = true;

    function finishDummyLoad() {
      dummyLoadInProgress = false;

      if (typeof hero.updateHeroObj === "function") {
        hero.updateHeroObj();
      }
    }

    const assignments = [];

    for (let index = 0; index < DUMMY_MELEE_ARMY_POSITIONS.length; index += 1) {
      assignments.push({
        armyPos: DUMMY_MELEE_ARMY_POSITIONS[index],
        troopType: TroopForConstants.T_TRIARII,
        count: count
      });
    }

    for (let index = 0; index < DUMMY_RANGED_ARMY_POSITIONS.length; index += 1) {
      assignments.push({
        armyPos: DUMMY_RANGED_ARMY_POSITIONS[index],
        troopType: TroopForConstants.T_ARCHERS,
        count: count
      });
    }

    function startAssignmentsAfterUnload() {
      window.setTimeout(function runDummyAssignments() {
        assignHeroTroopsFromCastle(
          castle,
          cityId,
          heroId,
          hero,
          assignments,
          function dummyLoadFinished(success) {
            finishDummyLoad();

            if (!success) {
              return;
            }
          }
        );
      }, DUMMY_UNLOAD_SETTLE_MS);
    }

    function tryUnloadHero(attempt) {
      waitUntilSocketReady(function onUnloadSocketReady(ready) {
        if (!ready) {
          if (attempt >= DUMMY_ASSIGN_MAX_ATTEMPTS) {
            finishDummyLoad();
            return;
          }

          window.setTimeout(function retryUnload() {
            tryUnloadHero(attempt + 1);
          }, DUMMY_ASSIGN_RETRY_DELAY_MS);
          return;
        }

        armyController.uninstallHeroTroop(
          cityId,
          heroId,
          function dummyUnloadCallback(response) {
            if (!isArmyResponseSuccess(response)) {
              if (attempt >= DUMMY_ASSIGN_MAX_ATTEMPTS) {
                showArmyResponseError(response);
                finishDummyLoad();
                return;
              }

              window.setTimeout(function retryUnloadAfterError() {
                tryUnloadHero(attempt + 1);
              }, DUMMY_ASSIGN_RETRY_DELAY_MS * Math.min(attempt + 1, 5));
              return;
            }

            if (typeof hero.updateHeroObj === "function") {
              hero.updateHeroObj();
            }

            startAssignmentsAfterUnload();
          },
          true
        );
      }, DUMMY_SOCKET_READY_TIMEOUT_MS);
    }

    tryUnloadHero(0);
  }

  function getEquipHelper() {
    return window.views
      && window.views.windows
      && window.views.windows.functionWins
      && window.views.windows.functionWins.hero
      && window.views.windows.functionWins.hero.EquipHelper
      && window.views.windows.functionWins.hero.EquipHelper.instance;
  }

  function getEquipBeanConstructor() {
    return window.roma
      && window.roma.common
      && window.roma.common.valueObject
      && window.roma.common.valueObject.EquipBean;
  }

  function isEquipResponseSuccess(response) {
    if (!response) {
      return true;
    }

    if (typeof response.isSuccess === "function") {
      return response.isSuccess();
    }

    if (typeof response.success === "boolean") {
      return response.success;
    }

    if (response.ok != null) {
      return response.ok === 1 || response.ok === true;
    }

    return true;
  }

  function showEquipResponseError(response) {
    showArmyResponseError(response);
  }

  function syncHeroForGear(hero) {
    const heroHelper = getHeroHelper();

    if (heroHelper && hero) {
      heroHelper.curSelectHero = hero;
    }
  }

  function getHeroCityIdForGear(hero) {
    if (hero && hero.castleObj && hero.castleObj.cityId != null) {
      return toInt(hero.castleObj.cityId);
    }

    return getHeroCityId(hero);
  }

  function isHeroEligibleForGear(hero) {
    if (!hero) {
      return false;
    }

    if (hero.isInCastle === true) {
      return true;
    }

    const HeroManConstants = getHeroManConstants();

    if (
      HeroManConstants
      && hero.heroInfo
      && hero.heroInfo.status === HeroManConstants.STATUS_GROWTH
    ) {
      return true;
    }

    return hero.isInCastle !== false;
  }

  function getHeroLevel(hero) {
    if (hero && hero.heroInfo && hero.heroInfo.level != null) {
      return toInt(hero.heroInfo.level);
    }

    if (hero && hero.lv != null) {
      return toInt(hero.lv);
    }

    return 0;
  }

  function getHeroPot(hero) {
    if (hero && hero.heroInfo && hero.heroInfo.potentiality != null) {
      return toInt(hero.heroInfo.potentiality);
    }

    return toInt(hero && hero.pot);
  }

  function canHeroWearEquip(hero, equip) {
    if (!hero || !equip) {
      return false;
    }

    return getHeroLevel(hero) >= toInt(equip.level)
      && getHeroPot(hero) >= toInt(equip.pot);
  }

  function isTimedEquipUsable(equip) {
    if (!equip || !equip.willExpired) {
      return true;
    }

    const gameContext = getGameContext();
    const serverNewEquip = gameContext
      && gameContext.instance
      && gameContext.instance.serverNewEquip;

    if (serverNewEquip == null) {
      return true;
    }

    return Number(equip.expiredTime) > Number(serverNewEquip);
  }

  function compareEquipStrength(leftEquip, rightEquip) {
    const leftSort = toInt(leftEquip && leftEquip.sort);
    const rightSort = toInt(rightEquip && rightEquip.sort);

    if (leftSort !== rightSort) {
      return leftSort - rightSort;
    }

    return toInt(leftEquip && leftEquip.attack) - toInt(rightEquip && rightEquip.attack);
  }

  function collectCollectionItems(collection) {
    const items = [];

    if (!collection || typeof collection.length !== "number") {
      return items;
    }

    for (let index = 0; index < collection.length; index += 1) {
      const item = typeof collection.getItemAt === "function"
        ? collection.getItemAt(index)
        : collection[index];

      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  function collectHeroEquipsResponse(response) {
    const items = [];
    const worn = response && response.equipsArray;

    if (!worn || typeof worn.length !== "number") {
      return items;
    }

    for (let index = 0; index < worn.length; index += 1) {
      const item = typeof worn.getItemAt === "function"
        ? worn.getItemAt(index)
        : worn[index];

      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  function fetchHeroWornEquips(cityId, heroId, callback) {
    const equipController = getEquipController();

    if (!equipController || typeof equipController.getHeroEquips !== "function") {
      callback([]);
      return;
    }

    equipController.getHeroEquips(
      cityId,
      heroId,
      function loadHeroWornEquipsCallback(response) {
        if (!isEquipResponseSuccess(response)) {
          showEquipResponseError(response);
          callback([]);
          return;
        }

        callback(collectHeroEquipsResponse(response));
      },
      false
    );
  }

  function buildUnequipSocketParams(heroEquip, equipHelper) {
    const equipType = heroEquip.equipType != null ? heroEquip.equipType : heroEquip.type;
    const template = equipHelper && typeof equipHelper.getEquipsBeanById === "function"
      ? equipHelper.getEquipsBeanById(equipType)
      : null;

    if (template) {
      return {
        typeId: template.type,
        indexId: template.willExpired
      };
    }

    return {
      typeId: equipType,
      indexId: heroEquip.expiredTime > 0 ? heroEquip.expiredTime : 0
    };
  }

  function mapWornHeroEquipsByPart(heroWornList, equipHelper) {
    const byPart = Object.create(null);

    for (let index = 0; index < heroWornList.length; index += 1) {
      const heroEquip = heroWornList[index];
      const equipType = heroEquip.equipType != null ? heroEquip.equipType : heroEquip.type;
      const template = equipHelper && typeof equipHelper.getEquipsBeanById === "function"
        ? equipHelper.getEquipsBeanById(equipType)
        : null;

      if (!template) {
        continue;
      }

      const part = toInt(template.part);

      if (part >= 0 && part <= HERO_OUTFIT_SLOT_MAX) {
        byPart[part] = template;
      }
    }

    return byPart;
  }

  function mapEquipsByPart(equips) {
    const byPart = Object.create(null);

    for (let index = 0; index < equips.length; index += 1) {
      const equip = equips[index];
      const part = toInt(equip && equip.part);

      if (part >= 0 && part <= HERO_OUTFIT_SLOT_MAX) {
        byPart[part] = equip;
      }
    }

    return byPart;
  }

  function createInventoryEquipBean(equipHelper, stackEntry, timedEntry) {
    const EquipBean = getEquipBeanConstructor();
    const bean = EquipBean ? new EquipBean() : {};

    if (typeof equipHelper.getequipNewBean === "function") {
      equipHelper.getequipNewBean(bean, stackEntry);
    } else {
      const template = equipHelper.getEquipsBeanById(stackEntry.typeId);

      if (!template) {
        return null;
      }

      Object.assign(bean, template);
    }

    if (timedEntry) {
      bean.equipIndex = timedEntry.validIndex;
      bean.expiredTime = timedEntry.expiredTime;
    } else if (bean.equipIndex == null) {
      bean.equipIndex = 0;
    }

    return bean;
  }

  function expandPlayerInventoryEquips(equipHelper) {
    const inventory = [];
    const playerEquips = equipHelper && equipHelper.playerEquipsArray;
    const ArrayCollection = window.eui && window.eui.ArrayCollection;

    if (
      equipHelper
      && ArrayCollection
      && playerEquips
      && typeof playerEquips.length === "number"
      && playerEquips.length > 0
      && equipHelper.equipsArray
      && equipHelper.equipsArray.length > 0
      && typeof equipHelper.getAllEquipsBeanToTarget === "function"
    ) {
      const tempCollection = new ArrayCollection();
      equipHelper.getAllEquipsBeanToTarget(tempCollection);
      return collectCollectionItems(tempCollection);
    }

    if (
      !equipHelper
      || !playerEquips
      || typeof playerEquips.length !== "number"
    ) {
      return inventory;
    }

    for (let index = 0; index < playerEquips.length; index += 1) {
      const stackEntry = typeof playerEquips.getItemAt === "function"
        ? playerEquips.getItemAt(index)
        : playerEquips[index];

      if (!stackEntry || toInt(stackEntry.value) <= 0) {
        continue;
      }

      if (stackEntry.validTimeArray && stackEntry.validTimeArray.length > 0) {
        for (let timedIndex = 0; timedIndex < stackEntry.validTimeArray.length; timedIndex += 1) {
          const timedEntry = stackEntry.validTimeArray[timedIndex];
          const bean = createInventoryEquipBean(equipHelper, stackEntry, timedEntry);

          if (bean) {
            inventory.push(bean);
          }
        }
        continue;
      }

      const stackCount = toInt(stackEntry.value);

      for (let copyIndex = 0; copyIndex < stackCount; copyIndex += 1) {
        const bean = createInventoryEquipBean(equipHelper, stackEntry, null);

        if (bean) {
          inventory.push(bean);
        }
      }
    }

    return inventory;
  }

  function pickBestInventoryEquipsByPart(inventory, hero) {
    const bestByPart = Object.create(null);

    for (let index = 0; index < inventory.length; index += 1) {
      const equip = inventory[index];
      const part = toInt(equip && equip.part);

      if (part < 0 || part > HERO_OUTFIT_SLOT_MAX) {
        continue;
      }

      if (!canHeroWearEquip(hero, equip) || !isTimedEquipUsable(equip)) {
        continue;
      }

      const currentBest = bestByPart[part];

      if (!currentBest || compareEquipStrength(equip, currentBest) > 0) {
        bestByPart[part] = equip;
      }
    }

    return bestByPart;
  }

  function buildBestEquipActions(wornByPart, bestByPart) {
    const actions = [];

    for (let part = 0; part <= HERO_OUTFIT_SLOT_MAX; part += 1) {
      const candidate = bestByPart[part];

      if (!candidate || candidate.type == null) {
        continue;
      }

      const worn = wornByPart[part];

      if (worn && compareEquipStrength(candidate, worn) <= 0) {
        continue;
      }

      actions.push({
        type: candidate.type,
        equipIndex: candidate.equipIndex == null ? "0" : String(candidate.equipIndex)
      });
    }

    return actions;
  }

  function refreshHeroAndBagEquips(cityId, heroId, hero) {
    const equipHelper = getEquipHelper();

    if (typeof equipHelper.getPlayerEquip === "function") {
      equipHelper.getPlayerEquip();
    }

    fetchHeroWornEquips(cityId, heroId, function refreshHeroWornDone() {
      if (hero && typeof hero.updateHeroObj === "function") {
        hero.updateHeroObj();
      }
    });
  }

  function withPlayerInventory(callback) {
    const equipHelper = getEquipHelper();
    const equipController = getEquipController();

    if (!equipHelper || !equipController) {
      callback([]);
      return;
    }

    function finishWithInventory() {
      callback(expandPlayerInventoryEquips(equipHelper));
    }

    if (typeof equipController.getPlayerEquips === "function") {
      equipController.getPlayerEquips(
        function loadPlayerInventoryCallback(response) {
          if (isEquipResponseSuccess(response) && response.equipsArray) {
            equipHelper.playerEquipsArray = response.equipsArray;

            if (equipHelper.playerEquipWithCount && typeof equipHelper.playerEquipWithCount.removeAll === "function") {
              equipHelper.playerEquipWithCount.removeAll();

              for (let index = 0; index < response.equipsArray.length; index += 1) {
                const stackEntry = typeof response.equipsArray.getItemAt === "function"
                  ? response.equipsArray.getItemAt(index)
                  : response.equipsArray[index];

                if (stackEntry && toInt(stackEntry.value) > 0) {
                  equipHelper.playerEquipWithCount.addItem(stackEntry);
                }
              }
            }
          }

          finishWithInventory();
        },
        false
      );
      return;
    }

    if (typeof equipHelper.getPlayerEquip === "function") {
      equipHelper.getPlayerEquip();
    }

    window.setTimeout(finishWithInventory, 400);
  }

  function runEquipSocketActionQueue(actions, onComplete) {
    let index = 0;
    let attempts = 0;

    function runNext() {
      if (index >= actions.length) {
        onComplete(true);
        return;
      }

      const action = actions[index];

      waitUntilSocketReady(function onEquipSocketReady(ready) {
        if (!ready) {
          attempts += 1;

          if (attempts >= DUMMY_ASSIGN_MAX_ATTEMPTS) {
            onComplete(false);
            return;
          }

          window.setTimeout(runNext, DUMMY_ASSIGN_RETRY_DELAY_MS);
          return;
        }

        action(function onEquipActionFinished(success, response) {
          if (!success) {
            attempts += 1;

            if (attempts >= DUMMY_ASSIGN_MAX_ATTEMPTS) {
              if (response) {
                showEquipResponseError(response);
              }

              onComplete(false);
              return;
            }

            window.setTimeout(runNext, DUMMY_ASSIGN_RETRY_DELAY_MS * Math.min(attempts, 5));
            return;
          }

          attempts = 0;
          index += 1;
          window.setTimeout(runNext, HERO_GEAR_SOCKET_STEP_DELAY_MS);
        });
      }, DUMMY_SOCKET_READY_TIMEOUT_MS);
    }

    runNext();
  }

  function getHeroGearBatchContext() {
    if (!isAfKModeGameFrame() || !getPlayerObj()) {
      return null;
    }

    const hero = getSelectedHeroObj();
    const cityId = getHeroCityIdForGear(hero);
    const heroId = getHeroId(hero);

    if (!hero || cityId == null || heroId == null || !isHeroEligibleForGear(hero)) {
      return null;
    }

    syncHeroForGear(hero);

    return {
      hero: hero,
      cityId: cityId,
      heroId: heroId,
      equipHelper: getEquipHelper()
    };
  }

  function finishHeroGearBatch(context) {
    heroGearBatchInProgress = false;

    if (context) {
      refreshHeroAndBagEquips(context.cityId, context.heroId, context.hero);
    }
  }

  function unequipAllHeroGear() {
    if (heroGearBatchInProgress || dummyLoadInProgress) {
      return;
    }

    const context = getHeroGearBatchContext();
    const equipController = getEquipController();

    if (!context || !equipController || typeof equipController.removeHeroEquip !== "function") {
      return;
    }

    heroGearBatchInProgress = true;

    fetchHeroWornEquips(context.cityId, context.heroId, function startUnequipAll(wornEquips) {
      if (wornEquips.length === 0) {
        finishHeroGearBatch(context);
        return;
      }

      const actions = [];

      for (let index = 0; index < wornEquips.length; index += 1) {
        const heroEquip = wornEquips[index];
        const socketParams = buildUnequipSocketParams(heroEquip, context.equipHelper);

        actions.push(function unequipAction(done) {
          equipController.removeHeroEquip(
            context.cityId,
            context.heroId,
            socketParams.typeId,
            socketParams.indexId,
            function unequipCallback(response) {
              done(isEquipResponseSuccess(response), response);
            },
            true
          );
        });
      }

      runEquipSocketActionQueue(actions, function unequipAllFinished() {
        finishHeroGearBatch(context);
      });
    });
  }

  function autoEquipBestHeroGear() {
    if (heroGearBatchInProgress || dummyLoadInProgress) {
      return;
    }

    const context = getHeroGearBatchContext();
    const equipController = getEquipController();

    if (!context || !equipController || typeof equipController.equipForHero !== "function") {
      return;
    }

    heroGearBatchInProgress = true;

    fetchHeroWornEquips(context.cityId, context.heroId, function startAutoEquip(wornEquips) {
      const wornByPart = mapWornHeroEquipsByPart(wornEquips, context.equipHelper);

      withPlayerInventory(function onInventoryReady(inventory) {
        const bestByPart = pickBestInventoryEquipsByPart(inventory, context.hero);
        const equipActions = buildBestEquipActions(wornByPart, bestByPart);

        if (equipActions.length === 0) {
          finishHeroGearBatch(context);
          return;
        }

        const actions = [];

        for (let index = 0; index < equipActions.length; index += 1) {
          const equipAction = equipActions[index];

          actions.push(function equipActionRunner(done) {
            equipController.equipForHero(
              context.cityId,
              context.heroId,
              equipAction.type,
              equipAction.equipIndex,
              function equipCallback(response) {
                done(isEquipResponseSuccess(response), response);
              },
              true
            );
          });
        }

        runEquipSocketActionQueue(actions, function autoEquipFinished() {
          finishHeroGearBatch(context);
        });
      });
    });
  }

  function ensureHeroGearPanel() {
    const controls = ensureAfKControlsContainer();

    if (!controls) {
      return null;
    }

    ensureDummyPanel();

    let panel = document.getElementById(HERO_GEAR_PANEL_ID);
    const dummyPanel = document.getElementById(DUMMY_PANEL_ID);

    if (panel && panel.parentElement !== controls) {
      controls.appendChild(panel);
    }

    if (!panel) {
      panel = document.createElement("div");
      panel.id = HERO_GEAR_PANEL_ID;
      window[PATCH_FLAG].heroGearBatch = true;
    }

    if (dummyPanel) {
      if (panel.parentElement !== controls || panel.previousElementSibling !== dummyPanel) {
        controls.insertBefore(panel, dummyPanel.nextSibling);
      }
    } else if (panel.parentElement !== controls) {
      controls.appendChild(panel);
    }

    let unequipButton = document.getElementById(HERO_GEAR_UNEQUIP_ALL_BUTTON_ID);

    if (!unequipButton) {
      unequipButton = document.createElement("button");
      unequipButton.id = HERO_GEAR_UNEQUIP_ALL_BUTTON_ID;
      unequipButton.type = "button";
      unequipButton.className = "cor-afk-mode-btn";
      unequipButton.textContent = "Strip";
      unequipButton.title = "Unequip all gear from every slot on the selected hero";
      unequipButton.addEventListener("click", unequipAllHeroGear);
      panel.appendChild(unequipButton);
    } else {
      unequipButton.textContent = "Strip";
    }

    let bestEquipButton = document.getElementById(HERO_GEAR_BEST_EQUIP_BUTTON_ID);

    if (!bestEquipButton) {
      bestEquipButton = document.createElement("button");
      bestEquipButton.id = HERO_GEAR_BEST_EQUIP_BUTTON_ID;
      bestEquipButton.type = "button";
      bestEquipButton.className = "cor-afk-mode-btn";
      bestEquipButton.textContent = "Equip";
      bestEquipButton.title = "Equip the strongest usable inventory gear in every slot for the selected hero";
      bestEquipButton.addEventListener("click", autoEquipBestHeroGear);
      panel.appendChild(bestEquipButton);
    } else {
      bestEquipButton.textContent = "Equip";
    }

    return panel;
  }

  function ensureDummyCountInput(panel) {
    let countInput = document.getElementById(DUMMY_COUNT_INPUT_ID);

    if (countInput) {
      return countInput;
    }

    countInput = document.createElement("input");
    countInput.id = DUMMY_COUNT_INPUT_ID;
    countInput.type = "number";
    countInput.min = "1";
    countInput.step = "1";
    countInput.value = "1";
    countInput.title = "Troops per division slot (fills all 3 front + 3 rear slots)";
    countInput.setAttribute("aria-label", "Dummy troop count");
    panel.insertBefore(countInput, panel.firstChild);

    return countInput;
  }

  function ensureDummyPanel() {
    const controls = ensureAfKControlsContainer();

    if (!controls) {
      return null;
    }

    let panel = document.getElementById(DUMMY_PANEL_ID);

    if (panel && panel.parentElement !== controls) {
      controls.appendChild(panel);
    }

    if (!panel) {
      panel = document.createElement("div");
      panel.id = DUMMY_PANEL_ID;
      controls.appendChild(panel);
      window[PATCH_FLAG].dummyLoad = true;
    }

    ensureDummyCountInput(panel);

    let loadButton = document.getElementById(DUMMY_LOAD_BUTTON_ID);

    if (!loadButton) {
      loadButton = document.createElement("button");
      loadButton.id = DUMMY_LOAD_BUTTON_ID;
      loadButton.type = "button";
      loadButton.className = "cor-afk-mode-btn";
      loadButton.textContent = "Dummy";
      loadButton.title = "Unload hero, then fill all 6 slots: Hastatus x3 front, Sagittarius x3 rear";
      loadButton.addEventListener("click", loadDummyHero);
      panel.appendChild(loadButton);
    }

    return panel;
  }

  loadAfKSettings();

  ensureAutoBuildControls();
  ensureAutoJobControls();
  ensureDummyPanel();
  ensureHeroGearPanel();
  applyStartupMuteSetting();
  updateAutoBuildModeButton();
  updateAutoBuildToggleButton();
  updateAutoJobModeButton();
  updateAutoJobToggleButton();

  window.setInterval(function keepAfKModeButtonsVisible() {
    if (!isAfKModeGameFrame()) {
      return;
    }

    installWebGLContextRecovery();
    ensureAutoBuildControls();
    ensureAutoJobControls();
    ensureDummyPanel();
    ensureHeroGearPanel();
    applyStartupMuteSetting();
    restorePersistedAfKModesWhenReady();
  }, 3000);

  const externalRechargeObserver = new MutationObserver(function removeInjectedRechargeAd() {
    if (removeExternalRechargeAd()) {
      window[PATCH_FLAG].externalRechargeAd = true;
    }
  });

  if (window === window.top && document.documentElement) {
    externalRechargeObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function getFieldAniSetManager() {
    return window.animation
      && window.animation.aniSet
      && window.animation.aniSet.FieldAniSetManager;
  }

  function toInt(value) {
    if (window.flash && typeof window.flash.checkInt === "function") {
      return window.flash.checkInt(value);
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }

  function createAniPlayer(animationData) {
    const BaseAniSetPlayer = window.animation
      && window.animation.aniSet
      && window.animation.aniSet.BaseAniSetPlayer;

    if (!BaseAniSetPlayer || !animationData) {
      return null;
    }

    const player = new BaseAniSetPlayer();
    player.addAni(animationData);
    return player;
  }

  function createCastle4AnimationData() {
    const BaseAnimationData = window.animation
      && window.animation.BaseAnimationData;

    if (!BaseAnimationData) {
      return null;
    }

    return new BaseAnimationData(128, 96, 1, null, "field.castle4");
  }

  function patchWorldMapCitySprites() {
    const FieldAniSetManager = getFieldAniSetManager();

    if (
      !FieldAniSetManager
      || !FieldAniSetManager.prototype
    ) {
      return false;
    }

    const aniPrototype = FieldAniSetManager.prototype;

    if (aniPrototype.__callOfRomaCastleAniFixOriginal) {
      window[PATCH_FLAG].citySprites = true;
      return true;
    }

    const originalGetCastleAniByLevel = aniPrototype.getCastleAniByLevel;

    if (typeof originalGetCastleAniByLevel !== "function") {
      return false;
    }

    aniPrototype.__callOfRomaCastleAniFixOriginal = originalGetCastleAniByLevel;

    aniPrototype.getCastleAniByLevel = function getCastleAniByLevelWithClamp(expansionLevel) {
      const normalizedLevel = Math.max(0, Math.min(3, toInt(expansionLevel)));
      const citySprites = this.castelAry;
      const animationData = normalizedLevel === 3
        ? createCastle4AnimationData()
        : citySprites && citySprites[normalizedLevel];

      if (!animationData) {
        return originalGetCastleAniByLevel.apply(this, arguments);
      }

      return createAniPlayer(animationData)
        || originalGetCastleAniByLevel.apply(this, arguments);
    };

    window[PATCH_FLAG].citySprites = true;
    return true;
  }

  function getGameContext() {
    return window.GameContext
      || (window.roma
        && window.roma.logic
        && window.roma.logic.GameContext);
  }

  function getHeroManConstants() {
    return window.HeroManConstants
      || (window.roma
        && window.roma.common
        && window.roma.common.constants
        && window.roma.common.constants.HeroManConstants);
  }

  function getArmyManager() {
    return window.roma
      && window.roma.logic
      && window.roma.logic.object
      && window.roma.logic.object.player
      && window.roma.logic.object.player.ArmyManager;
  }

  function getButtonBar() {
    return window.ButtonBar;
  }

  function getIntelligenceWin() {
    return window.views
      && window.views.windows
      && window.views.windows.functionWins
      && window.views.windows.functionWins.intelligence
      && window.views.windows.functionWins.intelligence.IntelligenceWin;
  }

  function getHeroHelper() {
    return window.views
      && window.views.windows
      && window.views.windows.functionWins
      && window.views.windows.functionWins.hero
      && window.views.windows.functionWins.hero.HeroHelper
      && window.views.windows.functionWins.hero.HeroHelper.instance;
  }

  function getHerosMansionWin() {
    return window.views
      && window.views.windows
      && window.views.windows.functionWins
      && window.views.windows.functionWins.hero
      && window.views.windows.functionWins.hero.HerosMansionWin;
  }

  function getCastleIconPanel() {
    return window.views
      && window.views.spreadUI
      && window.views.spreadUI.castleIcon
      && window.views.spreadUI.castleIcon.CastleIconPanel;
  }

  function getFieldConstant() {
    return window.roma
      && window.roma.common
      && window.roma.common.constants
      && window.roma.common.constants.FieldConstant;
  }

  function getDiamondWorldMap2Class() {
    return window.views
      && window.views.mainModules
      && window.views.mainModules.map
      && window.views.mainModules.map.diamond2
      && window.views.mainModules.map.diamond2.DiamondWorldMap2;
  }

  function getDiamondMapTile2Class() {
    return window.views
      && window.views.mainModules
      && window.views.mainModules.map
      && window.views.mainModules.map.diamond2
      && window.views.mainModules.map.diamond2.DiamondMapTile2;
  }

  function getMapDataByteArrayClass() {
    return window.views
      && window.views.mainModules
      && window.views.mainModules.map
      && window.views.mainModules.map.diamond2
      && window.views.mainModules.map.diamond2.MapDataByteArray;
  }

  function wrapMapCoordinate(value) {
    const FieldConstant = getFieldConstant();
    const mapSize = FieldConstant && toInt(FieldConstant.MAP_SIZE);

    if (!mapSize) {
      return toInt(value);
    }

    const wrapped = toInt(value) % mapSize;
    return wrapped < 0 ? wrapped + mapSize : wrapped;
  }

  function getServerWildLevelKey(fieldX, fieldY) {
    return `${wrapMapCoordinate(fieldX)},${wrapMapCoordinate(fieldY)}`;
  }

  function setServerWildLevel(fieldX, fieldY, level) {
    serverWildLevels[getServerWildLevelKey(fieldX, fieldY)] = Math.max(0, toInt(level));
  }

  function getServerWildLevel(fieldX, fieldY) {
    return serverWildLevels[getServerWildLevelKey(fieldX, fieldY)];
  }

  function setCachedMapTile(mapData, fieldX, fieldY, value) {
    const x = wrapMapCoordinate(fieldX);
    const y = wrapMapCoordinate(fieldY);

    if (mapData && mapData.mapArray && mapData.mapArray[x]) {
      mapData.mapArray[x][y] = value;
    }
  }

  function createFunctionalServerWildTile(fieldX, fieldY, level) {
    const FieldConstant = getFieldConstant();
    const DiamondMapTile2 = getDiamondMapTile2Class();

    if (!FieldConstant || !DiamondMapTile2) {
      return null;
    }

    // Lake tiles are functional wilds without forcing an extra overlay sprite.
    const tile = new DiamondMapTile2(
      wrapMapCoordinate(fieldX),
      wrapMapCoordinate(fieldY),
      FieldConstant.LAKE_TYPE
    );

    if (typeof tile.setLevelData === "function") {
      tile.setLevelData(level);
    } else {
      tile.fieldLevel = level;
    }

    tile.__callOfRomaServerWildClearingFix = true;
    return tile;
  }

  function correctServerWildClearingTile(mapData, fieldX, fieldY, tile) {
    const serverLevel = getServerWildLevel(fieldX, fieldY);

    if (serverLevel === undefined || serverLevel <= 0 || tile !== null) {
      return tile;
    }

    const fixedTile = createFunctionalServerWildTile(fieldX, fieldY, serverLevel);

    if (!fixedTile) {
      return tile;
    }

    setCachedMapTile(mapData, fieldX, fieldY, fixedTile);
    return fixedTile;
  }

  function cacheServerWildLevels(response) {
    const FieldConstant = getFieldConstant();

    if (
      !FieldConstant
      || !response
      || typeof response.mapStr !== "string"
    ) {
      return;
    }

    const viewRadius = toInt(FieldConstant.CLIENT_VIEW_RADIUS);
    const halfRadius = Math.floor(viewRadius / 2);
    let mapStringIndex = 0;

    for (let row = 0; row < viewRadius; row += 1) {
      let rowRadius = row;

      if (rowRadius > halfRadius) {
        rowRadius = viewRadius - row - 1;
      }

      const fieldY = toInt(response.y) - halfRadius + row;

      for (let offset = -rowRadius; offset <= rowRadius; offset += 1) {
        const levelCode = response.mapStr.charCodeAt(mapStringIndex) - 48;
        mapStringIndex += 1;

        if (Number.isFinite(levelCode)) {
          setServerWildLevel(toInt(response.x) + offset, fieldY, levelCode);
        }
      }
    }
  }

  function patchServerWildLevelCache() {
    const DiamondWorldMap2 = getDiamondWorldMap2Class();

    if (
      !DiamondWorldMap2
      || !DiamondWorldMap2.prototype
    ) {
      return false;
    }

    const worldMapPrototype = DiamondWorldMap2.prototype;

    if (!worldMapPrototype.__callOfRomaServerWildLevelOriginalOnServerResponse) {
      const originalOnServerResponse = worldMapPrototype.onServerResponse;

      if (typeof originalOnServerResponse !== "function") {
        return false;
      }

      worldMapPrototype.__callOfRomaServerWildLevelOriginalOnServerResponse = originalOnServerResponse;
      worldMapPrototype.onServerResponse = function onServerResponseWithServerWildLevelCache(response) {
        cacheServerWildLevels(response);
        return originalOnServerResponse.apply(this, arguments);
      };
    }

    return true;
  }

  function patchServerWildClearingFunctionalFix() {
    const MapDataByteArray = getMapDataByteArrayClass();
    const DiamondMapTile2 = getDiamondMapTile2Class();

    if (
      !MapDataByteArray
      || !MapDataByteArray.prototype
      || !DiamondMapTile2
    ) {
      return false;
    }

    const mapDataPrototype = MapDataByteArray.prototype;

    if (!mapDataPrototype.__callOfRomaServerWildClearingOriginalGetTileObj) {
      const originalGetTileObj = mapDataPrototype.getTileObj;

      if (typeof originalGetTileObj !== "function") {
        return false;
      }

      mapDataPrototype.__callOfRomaServerWildClearingOriginalGetTileObj = originalGetTileObj;
      mapDataPrototype.getTileObj = function getTileObjWithServerWildClearingFix(fieldX, fieldY) {
        const tile = originalGetTileObj.apply(this, arguments);
        return correctServerWildClearingTile(this, fieldX, fieldY, tile);
      };
    }

    window[PATCH_FLAG].serverWildClearingFix = true;
    return true;
  }

  function getCastleObjClass() {
    return window.roma
      && window.roma.logic
      && window.roma.logic.object
      && window.roma.logic.object.castle
      && window.roma.logic.object.castle.CastleObj;
  }

  function getPlayerObjClass() {
    return window.roma
      && window.roma.logic
      && window.roma.logic.object
      && window.roma.logic.object.player
      && window.roma.logic.object.player.PlayerObj;
  }

  function getHeroObjClass() {
    return window.roma
      && window.roma.logic
      && window.roma.logic.object
      && window.roma.logic.object.hero
      && window.roma.logic.object.hero.HeroObj;
  }

  function getCastleFrame() {
    return window.views
      && window.views.mainFrame
      && window.views.mainFrame.CastleFrame;
  }

  function getMainContainer() {
    return window.MainContainer;
  }

  function getRollTextBar() {
    return window.RollTextBar;
  }

  function getTaskManager() {
    return window.roma
      && window.roma.logic
      && window.roma.logic.object
      && window.roma.logic.object.task
      && window.roma.logic.object.task.TaskManager;
  }

  function getPlayerObj() {
    const GameContext = getGameContext();
    const instance = GameContext && GameContext.instance;

    return instance
      && typeof instance.getPlayerObj === "function"
      && instance.getPlayerObj();
  }

  function getTimeDis() {
    const GameContext = getGameContext();
    const instance = GameContext && GameContext.instance;

    if (!instance) {
      return 0;
    }

    if (typeof instance.getTimeDis === "function") {
      return Number(instance.getTimeDis()) || 0;
    }

    return Number(instance.timeDis) || 0;
  }

  function getRemainingMs(endTime) {
    const numericEndTime = Number(endTime);

    if (!Number.isFinite(numericEndTime) || numericEndTime <= 0) {
      return Number.POSITIVE_INFINITY;
    }

    return numericEndTime + getTimeDis() - Date.now();
  }

  function isExpired(endTime) {
    return getRemainingMs(endTime) <= 0;
  }

  function isExpiredMovingHero(hero) {
    const heroInfo = hero && hero.heroInfo;
    const constants = getHeroManConstants();

    if (!heroInfo || !isExpired(heroInfo.arriveTime)) {
      return false;
    }

    if (!constants) {
      return Boolean(hero.isMoving);
    }

    return heroInfo.status === constants.STATUS_FORWARD
      || heroInfo.status === constants.STATUS_BACKWARD
      || Boolean(hero.isMoving);
  }

  function isExpiredBattle(battle) {
    const battleBean = battle && (battle.battleWildBean || battle);
    return battleBean && isExpired(battleBean.battleTime);
  }

  function removeWhere(items, shouldRemove) {
    if (!items || typeof items.length !== "number") {
      return 0;
    }

    let removed = 0;

    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (shouldRemove(items[index])) {
        items.splice(index, 1);
        removed += 1;
      }
    }

    return removed;
  }

  function removeFromCollection(collection, shouldRemove) {
    if (!collection || typeof collection.length !== "number") {
      return 0;
    }

    let removed = 0;

    for (let index = collection.length - 1; index >= 0; index -= 1) {
      const item = typeof collection.getItemAt === "function"
        ? collection.getItemAt(index)
        : collection[index];

      if (shouldRemove(item)) {
        if (typeof collection.removeItemAt === "function") {
          collection.removeItemAt(index);
        } else if (collection.source) {
          collection.source.splice(index, 1);
        } else {
          collection.splice(index, 1);
        }

        removed += 1;
      }
    }

    return removed;
  }

  function pruneArmyManager(armyManager) {
    if (!armyManager) {
      return 0;
    }

    let removed = 0;

    removed += removeWhere(armyManager.heroMoveList, isExpiredMovingHero);

    if (Array.isArray(armyManager.heroOutSideList)) {
      removeWhere(armyManager.heroOutSideList, function removeExpiredMoveFromOutsideList(hero) {
        return isExpiredMovingHero(hero);
      });
    }

    return removed;
  }

  function prunePlayerArmyManager() {
    const playerObj = getPlayerObj();

    return playerObj && pruneArmyManager(playerObj.armyManager);
  }

  function patchArenaReminderCleanup() {
    const ArmyManager = getArmyManager();
    const ButtonBar = getButtonBar();
    const IntelligenceWin = getIntelligenceWin();

    if (
      !ArmyManager
      || !ArmyManager.prototype
      || !ButtonBar
      || !ButtonBar.prototype
      || !IntelligenceWin
      || !IntelligenceWin.prototype
    ) {
      return false;
    }

    const armyPrototype = ArmyManager.prototype;
    const buttonPrototype = ButtonBar.prototype;
    const intelligencePrototype = IntelligenceWin.prototype;

    if (!armyPrototype.__callOfRomaArenaCleanupOriginalGetOutSiteHeroOfMove) {
      const originalGetOutSiteHeroOfMove = armyPrototype.getOutSiteHeroOfMove;

      if (typeof originalGetOutSiteHeroOfMove !== "function") {
        return false;
      }

      armyPrototype.__callOfRomaArenaCleanupOriginalGetOutSiteHeroOfMove = originalGetOutSiteHeroOfMove;
      armyPrototype.getOutSiteHeroOfMove = function getOutSiteHeroOfMoveWithoutExpiredReturns() {
        const heroes = originalGetOutSiteHeroOfMove.apply(this, arguments);

        removeWhere(heroes, isExpiredMovingHero);
        return heroes;
      };
    }

    if (!buttonPrototype.__callOfRomaArenaCleanupOriginalResetArray) {
      const originalResetArray = buttonPrototype.resetArray;

      buttonPrototype.__callOfRomaArenaCleanupOriginalResetArray = originalResetArray;
      buttonPrototype.resetArray = function resetArrayWithoutExpiredBattles(battles) {
        removeWhere(battles, isExpiredBattle);

        if (typeof originalResetArray === "function") {
          return originalResetArray.apply(this, arguments);
        }

        return undefined;
      };
    }

    if (!buttonPrototype.__callOfRomaArenaCleanupOriginalOnCountEnterFrame) {
      const originalOnCountEnterFrame = buttonPrototype.onCountEnterFrame;

      if (typeof originalOnCountEnterFrame !== "function") {
        return false;
      }

      buttonPrototype.__callOfRomaArenaCleanupOriginalOnCountEnterFrame = originalOnCountEnterFrame;
      buttonPrototype.onCountEnterFrame = function onCountEnterFrameWithExpiredReturnCleanup() {
        prunePlayerArmyManager();
        return originalOnCountEnterFrame.apply(this, arguments);
      };
    }

    if (!intelligencePrototype.__callOfRomaArenaCleanupOriginalShowSelfArmy) {
      const originalShowSelfArmy = intelligencePrototype.showSelfArmy;

      if (typeof originalShowSelfArmy !== "function") {
        return false;
      }

      intelligencePrototype.__callOfRomaArenaCleanupOriginalShowSelfArmy = originalShowSelfArmy;
      intelligencePrototype.showSelfArmy = function showSelfArmyWithoutExpiredReturns() {
        prunePlayerArmyManager();
        return originalShowSelfArmy.apply(this, arguments);
      };
    }

    if (!intelligencePrototype.__callOfRomaArenaCleanupOriginalTimerHandler) {
      const originalTimerHandler = intelligencePrototype.timerHandler;

      if (typeof originalTimerHandler !== "function") {
        return false;
      }

      intelligencePrototype.__callOfRomaArenaCleanupOriginalTimerHandler = originalTimerHandler;
      intelligencePrototype.timerHandler = function timerHandlerWithoutExpiredReturnRows() {
        prunePlayerArmyManager();

        if (this.selectedIndex === 2 && this.selfArmyArray) {
          removeFromCollection(this.selfArmyArray, isExpiredMovingHero);
        }

        return originalTimerHandler.apply(this, arguments);
      };
    }

    window[PATCH_FLAG].arenaCleanup = true;
    return true;
  }

  function rememberSelectedCastle(castle) {
    if (castle && castle.cityId != null) {
      window[PATCH_FLAG].lastSelectedCityId = toInt(castle.cityId);
    }
  }

  function getCastleByCityId(cityId) {
    const playerObj = getPlayerObj();
    const normalizedCityId = toInt(cityId);

    return playerObj
      && normalizedCityId
      && typeof playerObj.getCastleObjById === "function"
      && playerObj.getCastleObjById(normalizedCityId);
  }

  function getCurrentCastle() {
    const playerObj = getPlayerObj();

    return playerObj
      && typeof playerObj.getCurCastleObj === "function"
      && playerObj.getCurCastleObj();
  }

  function getRememberedCampaignCastle() {
    const helper = getHeroHelper();
    const helperCastle = helper && helper.curSelectCastle;
    const rememberedCastle = getCastleByCityId(window[PATCH_FLAG].lastSelectedCityId);

    return rememberedCastle
      || getCurrentCastle()
      || helperCastle;
  }

  function setCampaignCastleOnHelper() {
    const helper = getHeroHelper();
    const castle = getRememberedCampaignCastle();

    if (helper && castle) {
      helper.curSelectCastle = castle;
    }

    return castle;
  }

  function getCollectionItem(collection, index) {
    if (!collection) {
      return null;
    }

    return typeof collection.getItemAt === "function"
      ? collection.getItemAt(index)
      : collection[index];
  }

  function findCityComboIndex(cityComData, cityId) {
    if (!cityComData || typeof cityComData.length !== "number") {
      return -1;
    }

    for (let index = 0; index < cityComData.length; index += 1) {
      const item = getCollectionItem(cityComData, index);
      const castle = item && item.data;

      if (castle && toInt(castle.cityId) === toInt(cityId)) {
        return index;
      }
    }

    return -1;
  }

  function selectFirstCampaignHero(win, helper) {
    let selectedHero = null;

    if (!win.heroArray || !win.heroArray.length) {
      win.curHero = null;
      helper.curSelectHero = null;
      return;
    }

    for (let index = 0; index < win.heroArray.length; index += 1) {
      const hero = getCollectionItem(win.heroArray, index);

      if (!hero) {
        continue;
      }

      hero.selectedInUi = false;

      if (!selectedHero) {
        selectedHero = hero;
      }
    }

    win.curHero = selectedHero;
    helper.curSelectHero = selectedHero;

    if (selectedHero) {
      selectedHero.selectedInUi = true;

      if (typeof selectedHero.updateHeroObj === "function") {
        selectedHero.updateHeroObj();
      }
    }
  }

  function repairCampaignHeroList(win) {
    const helper = getHeroHelper();

    if (
      !win
      || !helper
      || !helper.targetMapTileData
      || win.showWinId !== 3
      || typeof win.setHeroArr !== "function"
    ) {
      return;
    }

    const castle = setCampaignCastleOnHelper();

    if (!castle) {
      return;
    }

    win.curSelectCastle = castle;
    win.cityId = toInt(castle.cityId);
    win.setHeroArr(win.cityId);
    win.ArrayNum = win.heroArray ? win.heroArray.length : 0;

    const comboIndex = findCityComboIndex(win.cityComData, win.cityId);

    if (
      comboIndex >= 0
      && win.cityCom
      && typeof win.cityCom.setArr === "function"
    ) {
      win.cityCom.setArr(win.cityComData, comboIndex);
    }

    selectFirstCampaignHero(win, helper);

    if (win.initialized && win.heroViewStack) {
      win.heroViewStack.selectedIndex = 3;
    }

    if (
      win.heroCampaignView
      && typeof win.heroCampaignView.refreshFromMapTile === "function"
    ) {
      win.heroCampaignView.refreshFromMapTile(win.curHero, helper.targetMapTileData);
    }

    if (typeof win.bindHandler1 === "function") {
      win.bindHandler1();
    }
  }

  function patchCampaignCityHeroSelection() {
    const CastleIconPanel = getCastleIconPanel();
    const CastleObj = getCastleObjClass();
    const PlayerObj = getPlayerObjClass();
    const HerosMansionWin = getHerosMansionWin();

    if (
      !CastleIconPanel
      || !CastleIconPanel.prototype
      || !CastleObj
      || !CastleObj.prototype
      || !PlayerObj
      || !PlayerObj.prototype
      || !HerosMansionWin
      || !HerosMansionWin.prototype
    ) {
      return false;
    }

    const castleIconPrototype = CastleIconPanel.prototype;
    const castlePrototype = CastleObj.prototype;
    const playerPrototype = PlayerObj.prototype;
    const mansionPrototype = HerosMansionWin.prototype;

    if (!castleIconPrototype.__callOfRomaCityHeroOriginalOnUiClick) {
      const originalOnUiClick = castleIconPrototype.onUiClick;

      if (typeof originalOnUiClick !== "function") {
        return false;
      }

      castleIconPrototype.__callOfRomaCityHeroOriginalOnUiClick = originalOnUiClick;
      castleIconPrototype.onUiClick = function onUiClickRememberingCastle(event) {
        const logo = event && event.data;

        if (logo && logo.castle) {
          rememberSelectedCastle(logo.castle);
        }

        return originalOnUiClick.apply(this, arguments);
      };
    }

    if (!castleIconPrototype.__callOfRomaCityHeroOriginalGotoTown) {
      const originalGotoTown = castleIconPrototype.gotoTown;

      if (typeof originalGotoTown !== "function") {
        return false;
      }

      castleIconPrototype.__callOfRomaCityHeroOriginalGotoTown = originalGotoTown;
      castleIconPrototype.gotoTown = function gotoTownRememberingCastle(fieldId) {
        const result = originalGotoTown.apply(this, arguments);
        const playerObj = getPlayerObj();
        const castle = playerObj
          && typeof playerObj.getCastleByFieldId === "function"
          && playerObj.getCastleByFieldId(toInt(fieldId));

        rememberSelectedCastle(castle);
        return result;
      };
    }

    if (!castlePrototype.__callOfRomaCityHeroOriginalSetAsCurCastle) {
      const originalSetAsCurCastle = castlePrototype.setAsCurCastle;

      if (typeof originalSetAsCurCastle !== "function") {
        return false;
      }

      castlePrototype.__callOfRomaCityHeroOriginalSetAsCurCastle = originalSetAsCurCastle;
      castlePrototype.setAsCurCastle = function setAsCurCastleRememberingSelection() {
        rememberSelectedCastle(this);
        return originalSetAsCurCastle.apply(this, arguments);
      };
    }

    if (!playerPrototype.__callOfRomaCityHeroOriginalChangeCurCastle) {
      const originalChangeCurCastle = playerPrototype.changeCurCastle;

      if (typeof originalChangeCurCastle !== "function") {
        return false;
      }

      playerPrototype.__callOfRomaCityHeroOriginalChangeCurCastle = originalChangeCurCastle;
      playerPrototype.changeCurCastle = function changeCurCastleRememberingSelection(cityId) {
        const result = originalChangeCurCastle.apply(this, arguments);
        rememberSelectedCastle(getCastleByCityId(cityId));
        return result;
      };
    }

    if (!mansionPrototype.__callOfRomaCityHeroOriginalGotoTargetWin) {
      const originalGotoTargetWin = mansionPrototype.gotoTargetWin;

      if (typeof originalGotoTargetWin !== "function") {
        return false;
      }

      mansionPrototype.__callOfRomaCityHeroOriginalGotoTargetWin = originalGotoTargetWin;
      mansionPrototype.gotoTargetWin = function gotoTargetWinWithSafeCampaignRepair(targetWin) {
        const result = originalGotoTargetWin.apply(this, arguments);

        try {
          const helper = getHeroHelper();

          if (
            helper
            && helper.targetMapTileData
            && HerosMansionWin
            && targetWin === HerosMansionWin.WINDOW_SHOW_CAMPAIGN
          ) {
            setCampaignCastleOnHelper();
            repairCampaignHeroList(this);
          }
        } catch (error) {
          console.warn("Call of Roma campaign city repair skipped", error);
        }

        return result;
      };
    }

    window[PATCH_FLAG].cityHeroSelection = true;
    return true;
  }

  function hideQuestPopupOnFrame(frame) {
    if (!frame) {
      return;
    }

    if (frame.newTaskMc) {
      frame.newTaskMc.visible = false;

      if (typeof frame.newTaskMc.gotoAndStop === "function") {
        frame.newTaskMc.gotoAndStop(1);
      }

      if (frame.newTaskMc.r) {
        frame.newTaskMc.r.visible = false;
      }
    }
  }

  function patchCompletedQuestPopup() {
    const CastleFrame = getCastleFrame();

    if (!CastleFrame || !CastleFrame.prototype) {
      return false;
    }

    const framePrototype = CastleFrame.prototype;

    if (!framePrototype.__callOfRomaQuestPopupOriginalAddNewTaskBtn) {
      const originalAddNewTaskBtn = framePrototype.addNewTaskBtn;

      if (typeof originalAddNewTaskBtn !== "function") {
        return false;
      }

      framePrototype.__callOfRomaQuestPopupOriginalAddNewTaskBtn = originalAddNewTaskBtn;
      framePrototype.addNewTaskBtn = function addNewTaskBtnWithoutFlashingPopup() {
        const result = originalAddNewTaskBtn.apply(this, arguments);
        hideQuestPopupOnFrame(this);
        return result;
      };
    }

    if (!framePrototype.__callOfRomaQuestPopupOriginalNewTaskHandle) {
      const originalNewTaskHandle = framePrototype.newTaskHandle;

      if (typeof originalNewTaskHandle !== "function") {
        return false;
      }

      framePrototype.__callOfRomaQuestPopupOriginalNewTaskHandle = originalNewTaskHandle;
      framePrototype.newTaskHandle = function newTaskHandleWithoutFlashingPopup() {
        const result = originalNewTaskHandle.apply(this, arguments);
        hideQuestPopupOnFrame(this);
        return result;
      };
    }

    hideQuestPopupOnFrame(CastleFrame.instance);
    window[PATCH_FLAG].questPopup = true;
    return true;
  }

  function getNewsPopupClosedY(container) {
    const chatPanelY = Number(container && container.ChatPanel && container.ChatPanel.y);
    const currentY = Number(container && container.rollTextBar && container.rollTextBar.y);

    if (Number.isFinite(chatPanelY) && chatPanelY > 100) {
      return chatPanelY - 6;
    }

    if (Number.isFinite(currentY) && currentY > 100) {
      return currentY;
    }

    return 402;
  }

  function closeNewsPopupOnMainContainer(container) {
    if (!container || !container.rollTextBar) {
      return;
    }

    container.rollTextBarIsHide = true;
    container.rollTextBar.isShow = false;
    container.rollTextBar.y = getNewsPopupClosedY(container);

    if (container.rollTextBar.showRollTextBtn) {
      container.rollTextBar.showRollTextBtn.visible = true;
    }

    if (container.rollTextBar.hideRollTextBtn) {
      container.rollTextBar.hideRollTextBtn.visible = false;
    }
  }

  function patchNewsPopupDefaultClosed() {
    const MainContainer = getMainContainer();
    const RollTextBar = getRollTextBar();

    if (
      !MainContainer
      || !MainContainer.prototype
      || !RollTextBar
      || !RollTextBar.prototype
    ) {
      return false;
    }

    const mainPrototype = MainContainer.prototype;
    const rollPrototype = RollTextBar.prototype;

    if (!mainPrototype.__callOfRomaNewsPopupOriginalInit) {
      const originalInit = mainPrototype.init;

      if (typeof originalInit !== "function") {
        return false;
      }

      mainPrototype.__callOfRomaNewsPopupOriginalInit = originalInit;
      mainPrototype.init = function initWithNewsPopupClosed() {
        const result = originalInit.apply(this, arguments);
        closeNewsPopupOnMainContainer(this);
        window.setTimeout(closeNewsPopupOnMainContainer, 0, this);
        window.setTimeout(closeNewsPopupOnMainContainer, 500, this);
        return result;
      };
    }

    if (!rollPrototype.__callOfRomaNewsPopupOriginalInit) {
      const originalRollInit = rollPrototype.init;

      if (typeof originalRollInit !== "function") {
        return false;
      }

      rollPrototype.__callOfRomaNewsPopupOriginalInit = originalRollInit;
      rollPrototype.init = function initRollTextBarClosed() {
        const result = originalRollInit.apply(this, arguments);
        this.isShow = false;

        if (this.showRollTextBtn) {
          this.showRollTextBtn.visible = true;
        }

        if (this.hideRollTextBtn) {
          this.hideRollTextBtn.visible = false;
        }

        return result;
      };
    }

    closeNewsPopupOnMainContainer(MainContainer.instance);
    window[PATCH_FLAG].newsPopup = true;
    return true;
  }

  function refreshQuestCountSoon() {
    const TaskManager = getTaskManager();

    if (
      !TaskManager
      || !TaskManager.instance
      || typeof TaskManager.instance.getFinishedQuestCount !== "function"
    ) {
      return false;
    }

    window.setTimeout(function refreshQuestCountAfterLaunch() {
      TaskManager.instance.getFinishedQuestCount();
    }, 0);
    window.setTimeout(function refreshQuestCountAfterUiSettles() {
      TaskManager.instance.getFinishedQuestCount();
    }, 1500);

    return true;
  }

  function patchQuestCountLaunchRefresh() {
    const ButtonBar = getButtonBar();
    const TaskManager = getTaskManager();

    if (
      !ButtonBar
      || !ButtonBar.prototype
      || !TaskManager
      || !TaskManager.instance
    ) {
      return false;
    }

    const buttonPrototype = ButtonBar.prototype;

    if (!buttonPrototype.__callOfRomaQuestCountOriginalInit) {
      const originalInit = buttonPrototype.init;

      if (typeof originalInit !== "function") {
        return false;
      }

      buttonPrototype.__callOfRomaQuestCountOriginalInit = originalInit;
      buttonPrototype.init = function initWithLaunchQuestCountRefresh() {
        const result = originalInit.apply(this, arguments);
        refreshQuestCountSoon();
        return result;
      };
    }

    refreshQuestCountSoon();
    window[PATCH_FLAG].questCountRefresh = true;
    return true;
  }

  function patchHeroTroopDisplayedCapacity() {
    const HeroObj = getHeroObjClass();

    if (!HeroObj || !HeroObj.prototype) {
      return false;
    }

    const heroPrototype = HeroObj.prototype;

    if (!heroPrototype.__callOfRomaHeroTroopCapacityOriginalAfterBuffUpdate) {
      const originalAfterBuffUpdate = heroPrototype.afterBuffUpdate;

      if (typeof originalAfterBuffUpdate !== "function") {
        return false;
      }

      heroPrototype.__callOfRomaHeroTroopCapacityOriginalAfterBuffUpdate = originalAfterBuffUpdate;
      heroPrototype.afterBuffUpdate = function afterBuffUpdateWithServerCapacity() {
        const result = originalAfterBuffUpdate.apply(this, arguments);
        this.leadership = Math.max(0, toInt(this.leadership) - 1);
        this.tempLeadership = Math.max(0, toInt(this.tempLeadership) - 1);
        return result;
      };
    }

    window[PATCH_FLAG].heroTroopCapacity = true;
    return true;
  }

  const pollId = window.setInterval(function waitForGameClasses() {
    if (window === window.top) {
      removeExternalRechargeAd();
    }

    if (!isAfKModeGameFrame()) {
      return;
    }

    installWebGLContextRecovery();
    ensureAutoBuildControls();
    ensureAutoJobControls();
    applyStartupMuteSetting();
    restorePersistedAfKModesWhenReady();

    const citySpritesPatched = patchWorldMapCitySprites();
    const arenaCleanupPatched = patchArenaReminderCleanup();
    const cityHeroSelectionPatched = patchCampaignCityHeroSelection();
    const newsPopupPatched = patchNewsPopupDefaultClosed();
    const questCountRefreshPatched = patchQuestCountLaunchRefresh();
    const questPopupPatched = patchCompletedQuestPopup();
    const serverWildLevelCachePatched = patchServerWildLevelCache();
    const serverWildClearingFixPatched = patchServerWildClearingFunctionalFix();
    const heroTroopCapacityPatched = patchHeroTroopDisplayedCapacity();
    patchAutoFreeBuildingSpeed();

    if (
      citySpritesPatched
      && arenaCleanupPatched
      && cityHeroSelectionPatched
      && heroTroopCapacityPatched
      && newsPopupPatched
      && questCountRefreshPatched
      && questPopupPatched
      && serverWildLevelCachePatched
      && serverWildClearingFixPatched
    ) {
      window.clearInterval(pollId);
    }
  }, POLL_INTERVAL_MS);
})();
