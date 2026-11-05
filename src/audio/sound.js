/*
 * Sound + haptics, all synthesized with Web Audio (no audio files to download).
 * Nothing plays until the first tap (browsers require it, and it's polite). One mute toggle.
 */
export function createSound(settings) {
  let ctx = null, master = null, rainGain = null, unlocked = false;
  const enabled = () => settings.sound !== false;

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = enabled() ? 0.55 : 0; master.connect(ctx.destination);
      startRain();
    } catch (e) { ctx = null; }
  }
  function now() { return ctx.currentTime; }
  function tone(freq, dur, { type = 'sine', gain = 0.3, to = null, delay = 0, attack = 0.005 } = {}) {
    if (!ctx || !enabled()) return;
    const t = now() + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function burst(dur, { gain = 0.3, freq = 800, q = 0.8, delay = 0, type = 'bandpass' } = {}) {
    if (!ctx || !enabled()) return;
    const t = now() + delay;
    const src = ctx.createBufferSource(); src.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }
  function startRain() {
    const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    rainGain = ctx.createGain(); rainGain.gain.value = 0;
    src.connect(f); f.connect(rainGain); rainGain.connect(master);
    src.start();
  }
  function buzz(pattern) {
    if (!enabled()) return;
    try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { /* not supported */ }
  }

  const fx = {
    pop() { tone(520, 0.12, { to: 1100, gain: 0.25 }); buzz(8); },
    coin() { tone(1320, 0.12, { type: 'triangle', gain: 0.2 }); tone(1760, 0.25, { type: 'triangle', gain: 0.18, delay: 0.07 }); },
    thud() { tone(140, 0.28, { to: 55, gain: 0.5 }); burst(0.18, { freq: 300, gain: 0.25 }); buzz([12, 40, 12]); },
    birds() { for (let i = 0; i < 4; i++) tone(2600 + Math.random() * 900, 0.09, { to: 3600, gain: 0.08, delay: i * 0.16 }); },
    firework() { burst(0.5, { freq: 900, q: 0.4, gain: 0.35 }); for (let i = 0; i < 6; i++) burst(0.05, { freq: 3000, gain: 0.08, delay: 0.25 + i * 0.05 }); buzz(15); },
    whistle() { tone(784, 0.5, { type: 'triangle', gain: 0.18 }); tone(988, 0.5, { type: 'triangle', gain: 0.14 }); tone(784, 0.35, { type: 'triangle', gain: 0.16, delay: 0.6 }); tone(988, 0.35, { type: 'triangle', gain: 0.12, delay: 0.6 }); },
    chime() { [660, 880, 1100].forEach((f, i) => tone(f, 0.4, { type: 'triangle', gain: 0.14, delay: i * 0.09 })); buzz([10, 30, 10]); },
    tap() { buzz(5); }
  };
  return {
    unlock,
    ...fx,
    setRain(level) {
      if (!ctx || !rainGain) return;
      rainGain.gain.setTargetAtTime(enabled() ? Math.max(0, level) * 0.22 : 0, ctx.currentTime, 0.4);
    },
    setEnabled(on) {
      settings.sound = on;
      if (master) master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.05);
    },
    get unlocked() { return unlocked; }
  };
}
