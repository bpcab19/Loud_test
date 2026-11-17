(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime || !EXT?.storage?.local) return;

  const HAS_PROMISE_API = typeof globalThis.browser !== 'undefined' && EXT === globalThis.browser;
  const DEFAULTS = { enabled: true, gainDb: 100, loudness: 10, thresholdDb: 0, ratio: 20, lowShelfDb: 12, presenceDb: 12, highShelfDb: 10, drive: 1.0 };
  let hookReady = false;

  function storageGet(key) {
    if (HAS_PROMISE_API) return EXT.storage.local.get(key);
    return new Promise((resolve) => {
      EXT.storage.local.get(key, (res) => resolve(res || {}));
    });
  }

  function pushConfig(config) {
    window.postMessage({ type: 'VB_CONFIG', payload: config }, '*');
  }

  async function loadConfig() {
    try {
      const res = await storageGet('vbConfig');
      return { ...DEFAULTS, ...(res.vbConfig || {}) };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  async function sync() {
    pushConfig(await loadConfig());
  }

  window.addEventListener('message', (event) => {
    if (event.source === window && event.data?.type === 'VB_READY') {
      hookReady = true;
      sync();
    }
  });

  EXT.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.vbConfig) {
      pushConfig({ ...DEFAULTS, ...(changes.vbConfig.newValue || {}) });
    }
  });

  setInterval(sync, 3500);
  sync();
})();
