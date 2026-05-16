(function patchCallOfRomaRectorateSprite() {
  const PATCH_FLAG = "__callOfRomaRectorateSpriteFixApplied";
  const POLL_INTERVAL_MS = 100;
  const GIVE_UP_AFTER_MS = 30000;

  if (window[PATCH_FLAG]) {
    return;
  }

  window[PATCH_FLAG] = {
    applied: false,
    startedAt: Date.now()
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
      window[PATCH_FLAG].applied = true;
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

    window[PATCH_FLAG].applied = true;
    console.info("[Call of Roma Sprite Fix] World-map city sprite patch applied.");
    return true;
  }

  const pollId = window.setInterval(function waitForGameClasses() {
    if (patchWorldMapCitySprites()) {
      window.clearInterval(pollId);
      return;
    }

    if (Date.now() - window[PATCH_FLAG].startedAt > GIVE_UP_AFTER_MS) {
      window.clearInterval(pollId);
      console.warn("[Call of Roma Sprite Fix] Timed out waiting for game renderer classes.");
    }
  }, POLL_INTERVAL_MS);
})();
