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
    cottageMode: false,
    farmingMode: false
  };

  const serverWildLevels = Object.create(null);
  const AFK_MODE_STYLE_ID = "cor-afk-mode-style";
  const COTTAGE_MODE_BUTTON_ID = "cor-cottage-mode-btn";
  const FARMING_MODE_BUTTON_ID = "cor-farming-mode-btn";
  const COTTAGE_MODE_INTERVAL_MS = 2500;
  const FARMING_MODE_INTERVAL_MS = 2500;
  const COTTAGE_MODE_RETRY_MS = 1200;
  const FARMING_MODE_RETRY_MS = 1200;
  let cottageModeEnabled = false;
  let cottageModeTimerId = null;
  let cottageModeGateReason = "";
  let farmingModeEnabled = false;
  let farmingModeTimerId = null;
  let farmingModeGateReason = "";

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

    return window.roma
      && window.roma.common
      && window.roma.common.GameRuleHelper
      && window.roma.common.GameRuleHelper.instance;
  }

  function getProduceResourceDataClass() {
    return window.roma
      && window.roma.data
      && window.roma.data.ProduceResourceData;
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

  function updateAfKModeButton(buttonId, enabled, activeClass) {
    const button = document.getElementById(buttonId);

    if (!button) {
      return;
    }

    button.textContent = enabled ? "ON" : "OFF";

    if (enabled) {
      button.classList.add(activeClass);
      button.setAttribute("aria-pressed", "true");
    } else {
      button.classList.remove(activeClass);
      button.setAttribute("aria-pressed", "false");
    }
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

  function canUpgradeHouse(house) {
    if (!house || typeof house.isConstructing !== "function" || house.isConstructing()) {
      return false;
    }

    if (typeof house.getRuleCheckResultForUpgrade !== "function") {
      return true;
    }

    const ruleCheckResult = house.getRuleCheckResultForUpgrade();

    if (ruleCheckResult == null) {
      return false;
    }

    return ruleCheckResult.isMatch === true;
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

  function requestCottageUpgrade(house, castle) {
    if (typeof house.upgrade === "function") {
      house.upgrade();
      return true;
    }

    const buildingController = getBuildingController();
    const cityId = getHouseCityId(house, castle);

    if (
      !buildingController
      || cityId == null
      || typeof buildingController.upgradeArchitecture !== "function"
    ) {
      return false;
    }

    buildingController.upgradeArchitecture(
      cityId,
      house.position,
      function cottageModeUpgradeCallback() {
        if (cottageModeEnabled) {
          window.setTimeout(runCottageModeTick, COTTAGE_MODE_RETRY_MS);
        }
      },
      true
    );

    return true;
  }

  function findLowestUpgradeableCottage(castle) {
    const houses = collectHouseBuildings(castle.buildingManager);
    let lowestHouse = null;
    let lowestLevel = Number.POSITIVE_INFINITY;

    for (let index = 0; index < houses.length; index += 1) {
      const house = houses[index];

      if (!canUpgradeHouse(house)) {
        continue;
      }

      const level = toInt(house.level);

      if (level < lowestLevel) {
        lowestLevel = level;
        lowestHouse = house;
      }
    }

    return lowestHouse;
  }

  function listCottageUpgradeCandidates() {
    const player = getPlayerObj();

    if (!player) {
      return [];
    }

    const constructLimit = getConstructLimit(player);
    const candidates = [];

    forEachCastle(player, function collectCandidate(castle) {
      if (!castle || getCastleIdleBuilderCount(castle, constructLimit) <= 0) {
        return;
      }

      const cottage = findLowestUpgradeableCottage(castle);

      if (!cottage) {
        return;
      }

      candidates.push({
        castle: castle,
        cottage: cottage,
        cityId: getHouseCityId(cottage, castle),
        level: toInt(cottage.level)
      });
    });

    candidates.sort(function sortByLowestCottageLevel(left, right) {
      return left.level - right.level;
    });

    return candidates;
  }

  function updateCottageModeButton() {
    updateAfKModeButton(COTTAGE_MODE_BUTTON_ID, cottageModeEnabled, "cor-cottage-on");
  }

  function stopCottageModeTimer() {
    if (cottageModeTimerId !== null) {
      window.clearInterval(cottageModeTimerId);
      cottageModeTimerId = null;
    }
  }

  function startCottageModeTimer() {
    stopCottageModeTimer();
    cottageModeTimerId = window.setInterval(runCottageModeTick, COTTAGE_MODE_INTERVAL_MS);
  }

  function runCottageModeTick() {
    if (!cottageModeEnabled) {
      return;
    }

    if (!isGameFrameReadyForCottageMode()) {
      return;
    }

    if (!getPlayerObj() || isSocketBusy()) {
      return;
    }

    const candidates = listCottageUpgradeCandidates();

    if (candidates.length === 0) {
      return;
    }

    requestCottageUpgrade(candidates[0].cottage, candidates[0].castle);
  }

  function setCottageModeEnabled(enabled) {
    cottageModeEnabled = Boolean(enabled);
    updateCottageModeButton();

    if (cottageModeEnabled) {
      runCottageModeTick();
      startCottageModeTimer();
    } else {
      stopCottageModeTimer();
    }
  }

  function toggleCottageMode() {
    setCottageModeEnabled(!cottageModeEnabled);
  }

  function ensureAfKModeStyles() {
    if (document.getElementById(AFK_MODE_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = AFK_MODE_STYLE_ID;
    style.textContent = [
      ".cor-afk-mode-btn {",
      "  position: fixed !important;",
      "  left: 8px !important;",
      "  z-index: 2147483647 !important;",
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
      "#" + COTTAGE_MODE_BUTTON_ID + " {",
      "  top: 8px !important;",
      "}",
      "#" + FARMING_MODE_BUTTON_ID + " {",
      "  top: 40px !important;",
      "}",
      "#" + COTTAGE_MODE_BUTTON_ID + ".cor-cottage-on {",
      "  background: #2d6a4f;",
      "  border-color: #1b4332;",
      "  color: #ffffff;",
      "}",
      "#" + COTTAGE_MODE_BUTTON_ID + ".cor-cottage-on:hover {",
      "  background: #40916c;",
      "}",
      "#" + FARMING_MODE_BUTTON_ID + ".cor-farming-on {",
      "  background: #7f4f24;",
      "  border-color: #603814;",
      "  color: #ffffff;",
      "}",
      "#" + FARMING_MODE_BUTTON_ID + ".cor-farming-on:hover {",
      "  background: #9a6b3f;",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function ensureCottageModeButton() {
    if (!isAfKModeGameFrame()) {
      const strayButton = document.getElementById(COTTAGE_MODE_BUTTON_ID);

      if (strayButton) {
        strayButton.remove();
      }

      return null;
    }

    ensureAfKModeStyles();

    let button = document.getElementById(COTTAGE_MODE_BUTTON_ID);

    if (button) {
      updateCottageModeButton();
      return button;
    }

    button = document.createElement("button");
    button.id = COTTAGE_MODE_BUTTON_ID;
    button.type = "button";
    button.className = "cor-afk-mode-btn";
    button.title = "Cottage mode: keep every builder busy by upgrading the lowest cottage";
    button.addEventListener("click", toggleCottageMode);

    const mountTarget = document.body || document.documentElement;

    if (mountTarget) {
      mountTarget.appendChild(button);
      updateCottageModeButton();
      window[PATCH_FLAG].cottageMode = true;
    }

    return button;
  }

  function isGameFrameReadyForCottageMode() {
    const gate = { reason: cottageModeGateReason };

    if (!isGameFrameReadyForAfKMode(gate)) {
      cottageModeGateReason = gate.reason;
      return false;
    }

    if (!getBuildingController()) {
      cottageModeGateReason = "loading controllers";
      return false;
    }

    cottageModeGateReason = "";
    return true;
  }

  function getFarmBuilding(castle) {
    const BuildingConstant = getBuildingConstant();

    if (!castle || !castle.buildingManager || !BuildingConstant) {
      return null;
    }

    const farm = castle.buildingManager.getUniqueBuildingByType(BuildingConstant.TYPE_FARM);

    if (!farm || toInt(farm.level) < 1) {
      return null;
    }

    return farm;
  }

  function isCastleWorkerQueueEmpty(castle) {
    const manager = castle && castle.workerTrainningManager;

    if (!manager) {
      return false;
    }

    return manager.workerTrainningBean == null;
  }

  function calcMaxFarmerTrainCount(farm) {
    const WorkerConstant = getWorkerConstant();
    const GameRuleHelper = getGameRuleHelper();
    const ProduceResourceData = getProduceResourceDataClass();

    if (!WorkerConstant || !GameRuleHelper || !farm) {
      return 0;
    }

    const farmerType = WorkerConstant.FARMER_WORKER_TYPE;
    const buildingRule = GameRuleHelper.getBuildingRule(farm.typeId, farm.level);
    const workerRule = GameRuleHelper.getWorkerRule(farmerType);

    if (!buildingRule || !workerRule) {
      return 0;
    }

    let ruleResult = null;

    if (typeof workerRule.check === "function") {
      ruleResult = workerRule.check(farm);

      if (ruleResult && ruleResult.isMatch === false) {
        return 0;
      }
    }

    if (!ProduceResourceData) {
      return Math.max(0, toInt(buildingRule.buff1));
    }

    const produceResourceData = new ProduceResourceData();

    if (ruleResult) {
      produceResourceData.ruleResult = ruleResult;
    } else if (typeof workerRule.check === "function") {
      produceResourceData.ruleResult = workerRule.check(farm);
    }

    const maxTrainningNum = toInt(
      produceResourceData.calcMaxWorkerTrainning(workerRule, buildingRule)
    );

    return Math.max(0, Math.min(toInt(buildingRule.buff1), maxTrainningNum));
  }

  function requestFarmerTraining(castle, farm, count) {
    const WorkerConstant = getWorkerConstant();
    const farmerType = WorkerConstant && WorkerConstant.FARMER_WORKER_TYPE;

    if (!castle || !farm || farmerType == null || count <= 0) {
      return false;
    }

    if (typeof farm.trainningWorker === "function") {
      farm.trainningWorker(farmerType, count);

      if (farmingModeEnabled) {
        window.setTimeout(runFarmingModeTick, FARMING_MODE_RETRY_MS);
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
      farmerType,
      count,
      function farmingModeTrainCallback() {
        if (farmingModeEnabled) {
          window.setTimeout(runFarmingModeTick, FARMING_MODE_RETRY_MS);
        }
      },
      true
    );

    return true;
  }

  function listFarmingCandidates() {
    const player = getPlayerObj();

    if (!player) {
      return [];
    }

    const candidates = [];

    forEachCastle(player, function collectFarmingCandidate(castle) {
      if (!castle || !isCastleWorkerQueueEmpty(castle)) {
        return;
      }

      const farm = getFarmBuilding(castle);

      if (!farm) {
        return;
      }

      const count = calcMaxFarmerTrainCount(farm);

      if (count <= 0) {
        return;
      }

      candidates.push({
        castle: castle,
        farm: farm,
        cityId: toInt(castle.cityId),
        count: count
      });
    });

    return candidates;
  }

  function updateFarmingModeButton() {
    updateAfKModeButton(FARMING_MODE_BUTTON_ID, farmingModeEnabled, "cor-farming-on");
  }

  function stopFarmingModeTimer() {
    if (farmingModeTimerId !== null) {
      window.clearInterval(farmingModeTimerId);
      farmingModeTimerId = null;
    }
  }

  function startFarmingModeTimer() {
    stopFarmingModeTimer();
    farmingModeTimerId = window.setInterval(runFarmingModeTick, FARMING_MODE_INTERVAL_MS);
  }

  function runFarmingModeTick() {
    if (!farmingModeEnabled) {
      return;
    }

    if (!isGameFrameReadyForFarmingMode()) {
      return;
    }

    if (!getPlayerObj() || isSocketBusy()) {
      return;
    }

    const candidates = listFarmingCandidates();

    if (candidates.length === 0) {
      return;
    }

    requestFarmerTraining(candidates[0].castle, candidates[0].farm, candidates[0].count);
  }

  function setFarmingModeEnabled(enabled) {
    farmingModeEnabled = Boolean(enabled);
    updateFarmingModeButton();

    if (farmingModeEnabled) {
      runFarmingModeTick();
      startFarmingModeTimer();
    } else {
      stopFarmingModeTimer();
    }
  }

  function toggleFarmingMode() {
    setFarmingModeEnabled(!farmingModeEnabled);
  }

  function ensureFarmingModeButton() {
    if (!isAfKModeGameFrame()) {
      const strayButton = document.getElementById(FARMING_MODE_BUTTON_ID);

      if (strayButton) {
        strayButton.remove();
      }

      return null;
    }

    ensureAfKModeStyles();

    let button = document.getElementById(FARMING_MODE_BUTTON_ID);

    if (button) {
      updateFarmingModeButton();
      return button;
    }

    button = document.createElement("button");
    button.id = FARMING_MODE_BUTTON_ID;
    button.type = "button";
    button.className = "cor-afk-mode-btn";
    button.title = "Farming mode: fill empty worker job queues with max farmer training";
    button.addEventListener("click", toggleFarmingMode);

    const mountTarget = document.body || document.documentElement;

    if (mountTarget) {
      mountTarget.appendChild(button);
      updateFarmingModeButton();
      window[PATCH_FLAG].farmingMode = true;
    }

    return button;
  }

  function isGameFrameReadyForFarmingMode() {
    const gate = { reason: farmingModeGateReason };

    if (!isGameFrameReadyForAfKMode(gate)) {
      farmingModeGateReason = gate.reason;
      return false;
    }

    if (!getWorkerController()) {
      farmingModeGateReason = "loading controllers";
      return false;
    }

    farmingModeGateReason = "";
    return true;
  }

  ensureCottageModeButton();
  ensureFarmingModeButton();

  window.setInterval(function keepAfKModeButtonsVisible() {
    ensureCottageModeButton();
    ensureFarmingModeButton();
  }, 3000);

  const externalRechargeObserver = new MutationObserver(function removeInjectedRechargeAd() {
    if (removeExternalRechargeAd()) {
      window[PATCH_FLAG].externalRechargeAd = true;
    }
  });

  if (document.documentElement) {
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
    removeExternalRechargeAd();
    ensureCottageModeButton();

    const citySpritesPatched = patchWorldMapCitySprites();
    const arenaCleanupPatched = patchArenaReminderCleanup();
    const cityHeroSelectionPatched = patchCampaignCityHeroSelection();
    const newsPopupPatched = patchNewsPopupDefaultClosed();
    const questCountRefreshPatched = patchQuestCountLaunchRefresh();
    const questPopupPatched = patchCompletedQuestPopup();
    const serverWildLevelCachePatched = patchServerWildLevelCache();
    const serverWildClearingFixPatched = patchServerWildClearingFunctionalFix();
    const heroTroopCapacityPatched = patchHeroTroopDisplayedCapacity();

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
