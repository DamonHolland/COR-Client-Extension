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
    lastSelectedCityId: null
  };

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

  function getMapFieldInfoWin() {
    return window.views
      && window.views.mainModules
      && window.views.mainModules.map
      && window.views.mainModules.map.MapFieldInfoWin;
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

  function getRememberedCampaignCastle() {
    const helper = getHeroHelper();
    const playerObj = getPlayerObj();
    const helperCastle = helper && helper.curSelectCastle;
    const rememberedCastle = getCastleByCityId(window[PATCH_FLAG].lastSelectedCityId);

    return rememberedCastle
      || helperCastle
      || (playerObj
        && typeof playerObj.getCurCastleObj === "function"
        && playerObj.getCurCastleObj());
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
    const MapFieldInfoWin = getMapFieldInfoWin();
    const HerosMansionWin = getHerosMansionWin();

    if (
      !CastleIconPanel
      || !CastleIconPanel.prototype
      || !CastleObj
      || !CastleObj.prototype
      || !PlayerObj
      || !PlayerObj.prototype
      || !MapFieldInfoWin
      || !MapFieldInfoWin.prototype
      || !HerosMansionWin
      || !HerosMansionWin.prototype
    ) {
      return false;
    }

    const castleIconPrototype = CastleIconPanel.prototype;
    const castlePrototype = CastleObj.prototype;
    const playerPrototype = PlayerObj.prototype;
    const mapFieldInfoPrototype = MapFieldInfoWin.prototype;
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

    if (!mapFieldInfoPrototype.__callOfRomaCityHeroOriginalCreateArmy) {
      const originalCreateArmy = mapFieldInfoPrototype.createArmy;

      if (typeof originalCreateArmy !== "function") {
        return false;
      }

      mapFieldInfoPrototype.__callOfRomaCityHeroOriginalCreateArmy = originalCreateArmy;
      mapFieldInfoPrototype.createArmy = function createArmyWithRememberedSourceCastle() {
        setCampaignCastleOnHelper();
        return originalCreateArmy.apply(this, arguments);
      };
    }

    if (!mansionPrototype.__callOfRomaCityHeroOriginalRefresh) {
      const originalRefresh = mansionPrototype.refresh;

      if (typeof originalRefresh !== "function") {
        return false;
      }

      mansionPrototype.__callOfRomaCityHeroOriginalRefresh = originalRefresh;
      mansionPrototype.refresh = function refreshWithRememberedCampaignCastle() {
        setCampaignCastleOnHelper();
        const result = originalRefresh.apply(this, arguments);
        repairCampaignHeroList(this);
        return result;
      };
    }

    if (!mansionPrototype.__callOfRomaCityHeroOriginalGotoTargetWin) {
      const originalGotoTargetWin = mansionPrototype.gotoTargetWin;

      if (typeof originalGotoTargetWin !== "function") {
        return false;
      }

      mansionPrototype.__callOfRomaCityHeroOriginalGotoTargetWin = originalGotoTargetWin;
      mansionPrototype.gotoTargetWin = function gotoTargetWinWithRememberedCampaignCastle(targetWin) {
        setCampaignCastleOnHelper();
        const result = originalGotoTargetWin.apply(this, arguments);
        repairCampaignHeroList(this);
        return result;
      };
    }

    window[PATCH_FLAG].cityHeroSelection = true;
    return true;
  }

  const pollId = window.setInterval(function waitForGameClasses() {
    const citySpritesPatched = patchWorldMapCitySprites();
    const arenaCleanupPatched = patchArenaReminderCleanup();
    const cityHeroSelectionPatched = patchCampaignCityHeroSelection();

    if (citySpritesPatched && arenaCleanupPatched && cityHeroSelectionPatched) {
      window.clearInterval(pollId);
    }
  }, POLL_INTERVAL_MS);
})();
