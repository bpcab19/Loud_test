(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime?.getURL) return;

  const injectorUrl = EXT.runtime.getURL('core/injector.js');

  function sendHeartbeat() {
    try {
      const result = EXT.runtime.sendMessage({ type: 'VB_HEARTBEAT' });
      if (result?.catch) result.catch(() => {});
    } catch (_) {}
  }

  function inject() {
    if (window.__vbLoaderBusy) return;
    window.__vbLoaderBusy = true;

    if (document.documentElement?.dataset?.vbInjected === '1' && window.__vbInjectorReady) {
      window.__vbLoaderBusy = false;
      sendHeartbeat();
      return;
    }

    const script = document.createElement('script');
    script.src = injectorUrl;
    script.async = false;
    script.onload = () => {
      document.documentElement.dataset.vbInjected = '1';
      window.__vbLoaderBusy = false;
      sendHeartbeat();
      script.remove();
    };
    script.onerror = () => {
      window.__vbLoaderBusy = false;
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  inject();
  const observer = new MutationObserver(() => {
    if (!window.__vbInjectorReady) inject();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(() => {
    if (!window.__vbInjectorReady) inject();
  }, 2500);
})();
