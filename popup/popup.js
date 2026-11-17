const EXT = globalThis.browser ?? globalThis.chrome;
const DEFAULTS = { enabled: true, gainDb: 100, loudness: 10, thresholdDb: 0, ratio: 20, lowShelfDb: 12, presenceDb: 12, highShelfDb: 10, drive: 1.0 };
const keys = Object.keys(DEFAULTS);

function getStorage() {
  return new Promise(resolve => EXT.storage.local.get('vbConfig', res => resolve(res.vbConfig || DEFAULTS)));
}

async function saveStorage(cfg) {
  await new Promise(resolve => EXT.storage.local.set({ vbConfig: cfg }, resolve));
}

async function init() {
  let cfg = await getStorage();
  
  keys.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!cfg[key];
    else el.value = cfg[key];
    
    const valSpan = document.getElementById(key + 'Val');
    if (valSpan) valSpan.textContent = cfg[key];

    el.addEventListener('input', async () => {
      cfg[key] = el.type === 'checkbox' ? el.checked : Number(el.value);
      if (valSpan) valSpan.textContent = cfg[key];
      await saveStorage(cfg);
    });
  });
}

init();
