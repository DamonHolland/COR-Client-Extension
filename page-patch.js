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
    rechargeSidebar: false
  };

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

  function closeRechargeSidebarOnButtonBar(buttonBar) {
    if (!buttonBar || !buttonBar.showPayButton) {
      return;
    }

    buttonBar.showPayButton.width = 0;
    buttonBar.showPayButton.visible = false;
    buttonBar.showPayButton.includeInLayout = false;
    buttonBar.showPayButton.touchEnabled = false;
    buttonBar.showPayButton.touchChildren = false;

    if (buttonBar.addCoinMc) {
      buttonBar.addCoinMc.visible = false;

      if (typeof buttonBar.addCoinMc.gotoAndStop === "function") {
        buttonBar.addCoinMc.gotoAndStop(1);
      }
    }
  }

  function patchRechargeSidebarDefaultClosed() {
    const ButtonBar = getButtonBar();

    if (!ButtonBar || !ButtonBar.prototype) {
      return false;
    }

    const buttonPrototype = ButtonBar.prototype;

    if (!buttonPrototype.__callOfRomaRechargeSidebarOriginalShowPay) {
      const originalShowPay = buttonPrototype.showPay;

      buttonPrototype.__callOfRomaRechargeSidebarOriginalShowPay = originalShowPay;
      buttonPrototype.showPay = function showPayWithRechargeSidebarClosed() {
        if (typeof originalShowPay === "function") {
          originalShowPay.apply(this, arguments);
        }

        closeRechargeSidebarOnButtonBar(this);
      };
    }

    if (!buttonPrototype.__callOfRomaRechargeSidebarOriginalInit) {
      const originalInit = buttonPrototype.init;

      if (typeof originalInit !== "function") {
        return false;
      }

      buttonPrototype.__callOfRomaRechargeSidebarOriginalInit = originalInit;
      buttonPrototype.init = function initWithRechargeSidebarClosed() {
        const result = originalInit.apply(this, arguments);
        closeRechargeSidebarOnButtonBar(this);
        return result;
      };
    }

    if (!buttonPrototype.__callOfRomaRechargeSidebarOriginalAddAddCionBtn) {
      const originalAddAddCionBtn = buttonPrototype.addAddCionBtn;

      if (typeof originalAddAddCionBtn !== "function") {
        return false;
      }

      buttonPrototype.__callOfRomaRechargeSidebarOriginalAddAddCionBtn = originalAddAddCionBtn;
      buttonPrototype.addAddCionBtn = function addAddCionBtnWithRechargeSidebarClosed() {
        const result = originalAddAddCionBtn.apply(this, arguments);
        closeRechargeSidebarOnButtonBar(this);
        return result;
      };
    }

    window[PATCH_FLAG].rechargeSidebar = true;
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

    const citySpritesPatched = patchWorldMapCitySprites();
    const arenaCleanupPatched = patchArenaReminderCleanup();
    const cityHeroSelectionPatched = patchCampaignCityHeroSelection();
    const newsPopupPatched = patchNewsPopupDefaultClosed();
    const questCountRefreshPatched = patchQuestCountLaunchRefresh();
    const questPopupPatched = patchCompletedQuestPopup();
    const rechargeSidebarPatched = patchRechargeSidebarDefaultClosed();
    const heroTroopCapacityPatched = patchHeroTroopDisplayedCapacity();

    if (
      citySpritesPatched
      && arenaCleanupPatched
      && cityHeroSelectionPatched
      && heroTroopCapacityPatched
      && newsPopupPatched
      && questCountRefreshPatched
      && questPopupPatched
      && rechargeSidebarPatched
    ) {
      window.clearInterval(pollId);
    }
  }, POLL_INTERVAL_MS);
})();
