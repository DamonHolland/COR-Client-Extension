(function patchCallOfRomaClientBugs() {
  const PATCH_FLAG = "__callOfRomaRectorateSpriteFixApplied";
  const POLL_INTERVAL_MS = 100;

  if (window[PATCH_FLAG]) {
    return;
  }

  window[PATCH_FLAG] = {
    arenaCleanup: false,
    citySprites: false
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
    const GameContext = getGameContext();
    const playerObj = GameContext
      && GameContext.instance
      && GameContext.instance.getPlayerObj
      && GameContext.instance.getPlayerObj();

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

  const pollId = window.setInterval(function waitForGameClasses() {
    const citySpritesPatched = patchWorldMapCitySprites();
    const arenaCleanupPatched = patchArenaReminderCleanup();

    if (citySpritesPatched && arenaCleanupPatched) {
      window.clearInterval(pollId);
    }
  }, POLL_INTERVAL_MS);
})();
