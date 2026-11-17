(() => {
  if (window.__vbInjectorReady) return;
  window.__vbInjectorReady = true;

  const DEFAULTS = {
    enabled: true,
    gainDb: 100,
    loudness: 10,
    thresholdDb: 0,
    ratio: 20,
    lowShelfDb: 12,
    presenceDb: 12,
    highShelfDb: 10,
    drive: 1.0
  };

  let currentConfig = { ...DEFAULTS };
  const pipelines = new Set();

  function dbToLinear(db) {
    return Math.pow(10, db / 20);
  }

  function setParam(param, value) {
    if (!param) return;
    try {
      param.value = value;
    } catch (_) {}
  }

  function applyPipeline(pipeline, cfg) {
    const { ctx, nodes } = pipeline;
    const active = cfg.enabled;

    setParam(nodes.low.gain, active ? cfg.lowShelfDb : 0);
    setParam(nodes.pres.gain, active ? cfg.presenceDb : 0);
    setParam(nodes.high.gain, active ? cfg.highShelfDb : 0);
    setParam(nodes.comp.threshold, active ? cfg.thresholdDb : 0);
    setParam(nodes.comp.ratio, active ? cfg.ratio : 1);
    
    setParam(nodes.loudness.gain, active ? cfg.loudness : 1);
    setParam(nodes.gain.gain, active ? dbToLinear(cfg.gainDb) : 1);
  }

  function createAudioContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    return AC ? new AC({ latencyHint: 'interactive', sampleRate: 48000 }) : null;
  }

  function build(stream) {
    const ctx = createAudioContext();
    if (!ctx || !stream.getAudioTracks().length) return stream;

    const source = ctx.createMediaStreamSource(stream);
    const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 200;
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3000; pres.Q.value = 1.2;
    const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 6000;
    
    const comp = ctx.createDynamicsCompressor();
    const loudness = ctx.createGain();
    const gain = ctx.createGain();

    const dst = ctx.createMediaStreamDestination();

    source.connect(low);
    low.connect(pres);
    pres.connect(high);
    high.connect(comp);
    comp.connect(loudness);
    loudness.connect(gain);
    gain.connect(dst);

    const pipeline = { ctx, nodes: { low, pres, high, comp, loudness, gain } };
    applyPipeline(pipeline, currentConfig);
    pipelines.add(pipeline);

    if (ctx.state !== 'running') ctx.resume().catch(() => {});

    const outTracks = dst.stream.getAudioTracks();
    return new MediaStream([...outTracks, ...stream.getTracks().filter(t => t.kind !== 'audio')]);
  }

  const origMD = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if (origMD) {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await origMD(constraints);
      if (!currentConfig.enabled || !constraints?.audio) return stream;
      try { return build(stream); } catch (_) { return stream; }
    };
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.type !== 'VB_CONFIG') return;
    currentConfig = { ...DEFAULTS, ...event.data.payload };
    for (const p of pipelines) applyPipeline(p, currentConfig);
  });

  window.postMessage({ type: 'VB_READY' }, '*');
})();
