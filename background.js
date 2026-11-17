const EXT = globalThis.browser ?? globalThis.chrome;
let lastHeartbeat = 0;

if (EXT?.runtime?.onMessage) {
  EXT.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'VB_HEARTBEAT') {
      lastHeartbeat = Date.now();
      try { sendResponse({ ok: true }); } catch (_) {}
    }
    return false;
  });
}
