(function injectCallOfRomaSpriteFix() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-patch.js");
  script.onload = function cleanup() {
    script.remove();
  };

  (document.documentElement || document.head).appendChild(script);
})();
