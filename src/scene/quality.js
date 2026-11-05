/*
 * Two quality levels.
 *   High          — soft shadows (2048), tilt-shift post effects, up to 2× pixel ratio.
 *   Battery saver — no post effects, smaller shadow map (1024), up to 1.5× pixel ratio.
 * "Auto" picks by device, then watches the frame rate for the first seconds and steps down if needed.
 */
export function detectQuality() {
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (mem <= 4 || cores <= 4) return 'saver';
  if (coarse && cores <= 6) return 'saver';
  return 'high';
}

export const QUALITY = {
  high: { post: true, shadow: 2048, soft: true, maxDpr: 2 },
  saver: { post: false, shadow: 1024, soft: false, maxDpr: 1.5 }
};

/* Rolling frame-rate meter used by the auto mode and the ?fps debug overlay. */
export function fpsMeter() {
  const times = [];
  return {
    tick(now) { times.push(now); while (times.length && now - times[0] > 2000) times.shift(); },
    get fps() { return times.length > 1 ? ((times.length - 1) * 1000) / (times.at(-1) - times[0]) : 60; }
  };
}
