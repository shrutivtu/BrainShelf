let ctx = null;
let noiseBuffer = null;
let lastPlayTime = 0;
let rainSource = null;
let rainGain = null;

const MIN_INTERVAL = 30;
const STORAGE_KEY = 'bs_writing_sound';

const PENCIL_SAMPLE_PATHS = [
  '/sounds/pencil/pencil-1.mp3',
  '/sounds/pencil/pencil-2.mp3',
  '/sounds/pencil/pencil-3.mp3',
  '/sounds/pencil/pencil-4.mp3',
  '/sounds/pencil/pencil-5.mp3',
  '/sounds/pencil/pencil-6.mp3',
];
let pencilBuffers = [];
let pencilLoadPromise = null;
let lastPencilIndex = -1;

export const SOUND_OPTIONS = [
  { id: 'off',        label: 'Off',          icon: '🔇', ambient: false },
  { id: 'pencil',     label: 'Pencil',       icon: '✏️', ambient: false },
  { id: 'typewriter', label: 'Typewriter',   icon: '⌨️', ambient: false },
  { id: 'fountain',   label: 'Fountain pen', icon: '🖊️', ambient: false },
  { id: 'soft-tap',   label: 'Soft tap',     icon: '🤫', ambient: false },
  { id: 'rain',       label: 'Rain',         icon: '🌧️', ambient: true },
];

let userSound = (() => {
  try { return localStorage.getItem(STORAGE_KEY) || 'pencil'; }
  catch { return 'pencil'; }
})();
let forcedSound = null;

function effectiveSound() {
  return forcedSound ?? userSound;
}

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const size = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function ensurePencilSamplesLoaded() {
  if (pencilLoadPromise) return pencilLoadPromise;
  pencilLoadPromise = (async () => {
    const ac = getContext();
    const results = await Promise.all(
      PENCIL_SAMPLE_PATHS.map(async (path) => {
        try {
          const res = await fetch(path);
          if (!res.ok) return null;
          const arr = await res.arrayBuffer();
          return await ac.decodeAudioData(arr);
        } catch {
          return null;
        }
      })
    );
    pencilBuffers = results.filter(Boolean);
  })();
  return pencilLoadPromise;
}

function playNoiseBurst({ freqCenter, freqRange, Q, hpFreq, vol, attack, decay }) {
  const ac = getContext();
  const source = ac.createBufferSource();
  source.buffer = noiseBuffer;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freqCenter + Math.random() * freqRange;
  bp.Q.value = Q[0] + Math.random() * (Q[1] - Q[0]);

  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = hpFreq;

  const gain = ac.createGain();
  const t = ac.currentTime;
  const v = vol[0] + Math.random() * (vol[1] - vol[0]);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(v, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, t + decay + Math.random() * 0.015);

  source.connect(bp);
  bp.connect(hp);
  hp.connect(gain);
  gain.connect(ac.destination);

  const dur = decay + 0.03;
  source.start(t);
  source.stop(t + dur);
}

function playPencilSynth() {
  playNoiseBurst({
    freqCenter: 2800, freqRange: 1800,
    Q: [0.6, 1.0], hpFreq: 1200,
    vol: [0.06, 0.09], attack: 0.005, decay: 0.03,
  });
}

function playPencilSample() {
  if (pencilBuffers.length === 0) {
    ensurePencilSamplesLoaded();
    playPencilSynth();
    return;
  }
  const ac = getContext();
  let idx = Math.floor(Math.random() * pencilBuffers.length);
  if (pencilBuffers.length > 1 && idx === lastPencilIndex) {
    idx = (idx + 1) % pencilBuffers.length;
  }
  lastPencilIndex = idx;
  const buf = pencilBuffers[idx];
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const gain = ac.createGain();
  gain.gain.value = 0.45 + Math.random() * 0.2;
  src.connect(gain);
  gain.connect(ac.destination);
  src.start();
}

function playTypewriter() {
  const ac = getContext();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 1800 + Math.random() * 600;

  const oscGain = ac.createGain();
  oscGain.gain.setValueAtTime(0.08, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  osc.connect(oscGain);
  oscGain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.025);

  playNoiseBurst({
    freqCenter: 4000, freqRange: 1000,
    Q: [1.5, 2.5], hpFreq: 2000,
    vol: [0.04, 0.06], attack: 0.001, decay: 0.015,
  });
}

function playFountain() {
  playNoiseBurst({
    freqCenter: 1400, freqRange: 800,
    Q: [0.3, 0.6], hpFreq: 400,
    vol: [0.04, 0.07], attack: 0.008, decay: 0.05,
  });
}

function playSoftTap() {
  const ac = getContext();
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 200 + Math.random() * 100;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.05 + Math.random() * 0.02, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.035);
}

function startRain() {
  if (rainSource) return;
  try {
    const ac = getContext();
    rainSource = ac.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;

    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    bp.Q.value = 0.3;

    rainGain = ac.createGain();
    rainGain.gain.value = 0;
    rainGain.gain.linearRampToValueAtTime(0.08, ac.currentTime + 1.5);

    rainSource.connect(lp);
    lp.connect(bp);
    bp.connect(rainGain);
    rainGain.connect(ac.destination);
    rainSource.start();
  } catch {
    rainSource = null;
  }
}

function stopRain() {
  if (!rainSource) return;
  try {
    if (rainGain && ctx) {
      rainGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1);
    }
    const src = rainSource;
    setTimeout(() => { try { src.stop(); } catch {} }, 1200);
  } catch {}
  rainSource = null;
  rainGain = null;
}

const KEYSTROKE_PLAYERS = {
  pencil: playPencilSample,
  typewriter: playTypewriter,
  fountain: playFountain,
  'soft-tap': playSoftTap,
};

function applySoundTransition(oldEff, newEff) {
  if (oldEff === newEff) return;
  if (newEff === 'rain') startRain();
  else if (oldEff === 'rain') stopRain();
  if (newEff === 'pencil') ensurePencilSamplesLoaded();
}

export function playKeystroke() {
  const sound = effectiveSound();
  if (sound === 'off' || sound === 'rain') return;

  const now = performance.now();
  if (now - lastPlayTime < MIN_INTERVAL) return;
  lastPlayTime = now;

  try {
    const player = KEYSTROKE_PLAYERS[sound];
    if (player) player();
  } catch {}
}

export function setActiveWritingSound(id) {
  const oldEff = effectiveSound();
  userSound = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  applySoundTransition(oldEff, effectiveSound());
}

export function getActiveWritingSound() {
  return userSound;
}

export function setForcedSound(id) {
  if (forcedSound === id) return;
  const oldEff = effectiveSound();
  forcedSound = id;
  applySoundTransition(oldEff, effectiveSound());
}

export function clearForcedSound() {
  if (forcedSound === null) return;
  const oldEff = effectiveSound();
  forcedSound = null;
  applySoundTransition(oldEff, effectiveSound());
}

export function cleanupSounds() {
  clearForcedSound();
  stopRain();
}
