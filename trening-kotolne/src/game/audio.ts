/** Web Audio — odomkne sa na prvom ťuku. Žiadne súbory, ide offline. */

type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let enabled = true;
let pumpOsc: OscillatorNode | null = null;
let pumpGain: GainNode | null = null;

function AC(): Ctor {
  return window.AudioContext || (window as unknown as { webkitAudioContext: Ctor }).webkitAudioContext;
}

export function unlockAudio() {
  if (!ctx) {
    ctx = new (AC())({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    master.gain.value = enabled ? 0.55 : 0;
    sfx.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setSoundOn(on: boolean) {
  enabled = on;
  if (master && ctx) {
    master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.03);
  }
  if (!on) stopPump();
}

function bus() {
  if (!ctx || !sfx) return null;
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, sfx };
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.12, slide = 0) {
  const b = bus();
  if (!b || !enabled) return;
  const t = b.ctx.currentTime;
  const o = b.ctx.createOscillator();
  const g = b.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(b.sfx);
  o.start(t);
  o.stop(t + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

export function sfxTap() {
  beep(420, 0.07, "square", 0.05);
}

export function sfxIgnite() {
  beep(180, 0.22, "sawtooth", 0.1, 220);
  beep(90, 0.28, "triangle", 0.08, 40);
}

export function sfxSuccess() {
  beep(523, 0.14, "sine", 0.1);
  setTimeout(() => beep(659, 0.14, "sine", 0.1), 90);
  setTimeout(() => beep(784, 0.22, "sine", 0.11), 180);
}

export function sfxFail() {
  beep(220, 0.28, "triangle", 0.1, -80);
}

export function sfxAlarm() {
  beep(880, 0.16, "square", 0.07);
  setTimeout(() => beep(660, 0.16, "square", 0.07), 170);
}

export function sfxFill() {
  beep(240, 0.08, "sine", 0.04, 30);
}

export function startPump() {
  const b = bus();
  if (!b || !enabled || pumpOsc) return;
  const o = b.ctx.createOscillator();
  const g = b.ctx.createGain();
  o.type = "sine";
  o.frequency.value = 52;
  g.gain.value = 0.0001;
  g.gain.setTargetAtTime(0.035, b.ctx.currentTime, 0.08);
  o.connect(g);
  g.connect(b.sfx);
  o.start();
  pumpOsc = o;
  pumpGain = g;
}

export function stopPump() {
  if (!ctx || !pumpOsc || !pumpGain) return;
  const o = pumpOsc;
  const g = pumpGain;
  pumpOsc = null;
  pumpGain = null;
  g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
  const stopAt = ctx.currentTime + 0.2;
  o.stop(stopAt);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

export function resumeAudioIfNeeded() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}
