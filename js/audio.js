// 간단한 효과음 — 종소리, 밤 바람/풀벌레, 투표 똑딱
let ctx = null, master = null, nightGain = null;
export function initAudio() {
  if (ctx) { ctx.resume && ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  // 밤 배경: 바람(필터 노이즈) + 풀벌레(빠른 진폭 변조 사인)
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  nightGain = ctx.createGain(); nightGain.gain.value = 0;
  src.connect(lp).connect(nightGain).connect(master); src.start();
  const cr = ctx.createOscillator(); cr.frequency.value = 4400; const crG = ctx.createGain(); crG.gain.value = 0;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 22; const lfoG = ctx.createGain(); lfoG.gain.value = 0.012;
  lfo.connect(lfoG).connect(crG.gain); cr.connect(crG).connect(nightGain); cr.start(); lfo.start();
}
export function setNightSound(k) { if (nightGain) nightGain.gain.setTargetAtTime(0.5 * k, ctx.currentTime, 0.8); }
function tone(f, t0, dur, type = 'sine', vol = 0.3) {
  if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
export function bell(kind = 'day') {
  if (!ctx) return; const t = ctx.currentTime;
  if (kind === 'night') { [392, 311, 262].forEach((f, i) => { tone(f, t + i * 0.35, 1.6, 'sine', 0.22); tone(f * 2.01, t + i * 0.35, 0.8, 'sine', 0.05); }); }
  else if (kind === 'bad') { tone(110, t, 1.2, 'sawtooth', 0.12); tone(82, t + 0.1, 1.4, 'sine', 0.3); }
  else if (kind === 'win') { [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.12, 0.6, 'triangle', 0.2)); }
  else { [523, 659, 784].forEach((f, i) => { tone(f, t + i * 0.18, 1.2, 'sine', 0.2); tone(f * 2.76, t + i * 0.18, 0.5, 'sine', 0.04); }); }
}
export function tick() { if (ctx) tone(1200, ctx.currentTime, 0.05, 'square', 0.05); }
export function pop() { if (ctx) tone(660, ctx.currentTime, 0.12, 'triangle', 0.15); }
