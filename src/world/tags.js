import * as THREE from 'three';

/* Floating HTML labels and task bubbles pinned to points in the 3D world. */
export function createTags(root) {
  const tags = [];
  const v = new THREE.Vector3();
  function add(html, pos, cls = '', opts = {}) {
    const el = document.createElement('div');
    el.className = 'tag ' + cls;
    el.innerHTML = `<div class="card">${html}</div>`;
    root.appendChild(el);
    const t = { el, pos: pos.clone(), bubble: !!opts.bubble, wideOnly: !!opts.wideOnly, hidden: false };
    tags.push(t);
    return t;
  }
  function remove(t, fade = true) {
    if (!t) return;
    const i = tags.indexOf(t);
    if (i >= 0) tags.splice(i, 1);
    if (fade) { t.el.classList.add('gone'); setTimeout(() => t.el.remove(), 320); } else t.el.remove();
  }
  function setHtml(t, html) { t.el.querySelector('.card').innerHTML = html; }
  function place(camera, minY = 170) {
    const w = innerWidth, h = innerHeight;
    for (const t of tags) {
      v.copy(t.pos).project(camera);
      const vis = !t.hidden && v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.2 && v.y < 1.2 && !(t.wideOnly && w < 560);
      if (t.vis !== vis) { t.el.style.display = vis ? '' : 'none'; t.vis = vis; }
      if (!vis) continue;
      const rx = ((v.x + 1) / 2) * w, ry = ((1 - v.y) / 2) * h;
      const px = t.bubble ? rx : THREE.MathUtils.clamp(rx, 100, w - 150);
      const py = t.bubble ? ry : Math.max(ry, minY);
      t.el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
  return { add, remove, setHtml, place, all: tags };
}
