import { reduceMotion, createLoop } from './util.js';
import { LOGOS } from './logos.js';

// Bandejas de logos: as ferramentas de cada área caem quando a seção aparece, empilham
// e podem ser pegas, arremessadas ou tocadas. Em repouso ficam em preto; sob o ponteiro
// ganham a cor da marca e a lista ao lado mostra quem traz cada uma.
const GRAVITY = 0.62;
const BOUNCE = 0.34;

export function initTrays() {
  const trays = [...document.querySelectorAll('.tray')].map(setup).filter(Boolean);
  return { layout() { trays.forEach((t) => t.layout()); } };
}

function setup(tray) {
  const area = tray.closest('.area');
  const scale = parseFloat(tray.dataset.scale) || 1;
  const tip = document.createElement('span');
  tip.className = 'tray__tip';
  tray.append(tip);

  const bodies = tray.dataset.logos.split(',').map((id) => id.trim()).filter((id) => LOGOS[id]).map((id) => {
    const logo = LOGOS[id];
    const el = document.createElement('span');
    el.className = `tray__body${logo.word ? ' tray__body--word' : ''}${logo.lines ? ' tray__body--long' : ''}`;
    if (logo.lines) el.replaceChildren(...logo.lines.map((line) => Object.assign(document.createElement('span'), { textContent: line })));
    else if (logo.word) el.textContent = logo.word;
    else el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${logo.path}"/></svg>`;
    if (logo.hex) el.style.setProperty('--brand', `#${logo.hex}`);
    tray.append(el);
    const tech = area.querySelector(`.tech[data-logo="${id}"]`);
    return { id, el, word: logo.word, label: tech?.textContent || logo.word || id, x: 0, y: 0, vx: 0, vy: 0, a: 0, r: 40, active: false, drag: null };
  });
  if (!bodies.length) return null;

  let W = 0;
  let H = 0;
  let started = false;
  let calm = 0;
  let hot = null;
  let last = 0;
  let xMin = 0;
  let xMax = 0;
  const phrase = area.querySelector('.area__phrase');
  const mirror = area.classList.contains('area--mirror');

  // a frase grande da área é uma parede: as logos só ocupam o espaço livre ao lado dela
  const bounds = (radius) => {
    xMin = 0;
    xMax = W;
    if (!phrase) return;
    const tr = tray.getBoundingClientRect();
    const range = document.createRange();
    let left = Infinity;
    let right = -Infinity;
    for (const line of phrase.querySelectorAll('.ln > span')) {
      range.selectNodeContents(line);
      const r = range.getBoundingClientRect();
      if (!r.width || r.bottom < tr.top - r.height || r.top > tr.bottom + r.height) continue;
      left = Math.min(left, r.left - tr.left);
      right = Math.max(right, r.right - tr.left);
    }
    if (right === -Infinity) return;
    const gap = 28;
    if (mirror) xMax = Math.min(W, left - gap);
    else xMin = Math.max(0, right + gap);
    if (xMax - xMin < radius * 6) { xMin = 0; xMax = W; }
  };

  /* ---------- desenho ---------- */
  const place = (b) => {
    b.el.style.transform = `translate(${(b.x - b.r).toFixed(1)}px, ${(b.y - b.r).toFixed(1)}px) rotate(${b.a.toFixed(3)}rad)`;
  };
  const placeTip = () => {
    if (!hot) return;
    // a etiqueta fica dentro da bandeja mesmo quando a logo encosta numa borda
    const half = tip.offsetWidth / 2;
    const x = Math.max(half, Math.min(W - half, hot.x));
    tip.style.transform = `translate(${x.toFixed(1)}px, ${(hot.y - hot.r - 10).toFixed(1)}px) translate(-50%, -100%)`;
  };
  const setHot = (b, notify = true) => {
    if (hot === b) return;
    hot?.el.classList.remove('is-hot');
    hot = b;
    if (b) {
      b.el.classList.add('is-hot');
      tip.textContent = b.label;
      tip.classList.add('is-on');
      placeTip();
    } else tip.classList.remove('is-on');
    if (notify) area.dispatchEvent(new CustomEvent('tray:hover', { detail: { id: b?.id || null } }));
  };

  // sem movimento: as logos ficam arrumadas em fileiras no fundo da bandeja
  const stack = () => {
    let x = xMin;
    let y = H;
    let rowR = 0;
    for (const b of bodies) {
      if (x + b.r * 2 > xMax) { x = xMin; y -= rowR * 2 + 6; rowR = 0; }
      b.x = x + b.r;
      b.y = y - b.r;
      x += b.r * 2 + 6;
      rowR = Math.max(rowR, b.r);
      b.active = true;
      b.el.classList.add('is-in');
      place(b);
    }
  };

  /* ---------- física ---------- */
  const collide = () => {
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.active) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.active) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 < 0.0001) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const ia = a.drag ? 0 : 1;
        const ib = b.drag ? 0 : 1;
        const sum = ia + ib;
        if (!sum) continue;
        const push = (min - d) / sum;
        a.x -= nx * push * ia; a.y -= ny * push * ia;
        b.x += nx * push * ib; b.y += ny * push * ib;
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn >= 0) continue;
        const jn = (-(1 + BOUNCE) * vn) / sum;
        a.vx -= jn * nx * ia; a.vy -= jn * ny * ia;
        b.vx += jn * nx * ib; b.vy += jn * ny * ib;
        // atrito tangencial: as peças rolam em vez de escorregar
        const tx = -ny;
        const ty = nx;
        const jt = (-(rvx * tx + rvy * ty) * 0.12) / sum;
        a.vx -= jt * tx * ia; a.vy -= jt * ty * ia;
        b.vx += jt * tx * ib; b.vy += jt * ty * ib;
      }
    }
  };

  const step = () => {
    for (const b of bodies) {
      if (!b.active) continue;
      if (b.drag) {
        b.vx = (b.drag.tx - b.x) * 0.35;
        b.vy = (b.drag.ty - b.y) * 0.35;
      } else {
        b.vy += GRAVITY;
        b.vx *= 0.996;
        b.vy *= 0.998;
      }
      b.vx = Math.max(-38, Math.min(38, b.vx));
      b.vy = Math.max(-38, Math.min(38, b.vy));
      b.x += b.vx;
      b.y += b.vy;
      b.a += b.vx / b.r;
      // rolam enquanto andam e se endireitam quando quase param, para a logo ficar legível
      b.a = (((b.a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      if (!b.drag && Math.abs(b.vx) < 0.7 && Math.abs(b.vy) < 0.7) b.a *= 0.88;
      if (b.x < xMin + b.r) { b.x = xMin + b.r; b.vx = Math.abs(b.vx) * BOUNCE; }
      if (b.x > xMax - b.r) { b.x = xMax - b.r; b.vx = -Math.abs(b.vx) * BOUNCE; }
      if (b.y < b.r && b.drag) b.y = b.r;
      if (b.y > H - b.r) {
        b.y = H - b.r;
        if (b.vy > 0) b.vy = b.vy > 1.4 ? -b.vy * BOUNCE : 0;
        b.vx *= 0.9;
      }
    }
    for (let k = 0; k < 4; k++) collide();
  };

  const loop = createLoop((t) => {
    const frames = last ? Math.min(3, Math.max(1, Math.round((t - last) / 16.7))) : 1;
    last = t;
    for (let f = 0; f < frames; f++) step();
    let fastest = 0;
    for (const b of bodies) {
      if (!b.active) continue;
      place(b);
      fastest = Math.max(fastest, Math.abs(b.vx), Math.abs(b.vy));
    }
    placeTip();
    const busy = bodies.some((b) => b.drag) || bodies.some((b) => !b.active);
    calm = !busy && fastest < 0.08 ? calm + 1 : 0;
    if (calm > 40) { last = 0; return false; }
    return true;
  });
  const wake = () => { calm = 0; loop.kick(); };

  const start = () => {
    if (started) return;
    started = true;
    if (!W) layout();
    if (reduceMotion.matches) { stack(); return; }
    bodies.forEach((b, i) => {
      b.x = xMin + b.r + Math.random() * Math.max(1, xMax - xMin - b.r * 2);
      b.y = b.r + Math.random() * H * 0.12;
      b.vx = (Math.random() - 0.5) * 5;
      b.vy = 1 + Math.random() * 3;
      b.a = (Math.random() - 0.5) * 1.2;
      place(b);
      setTimeout(() => { b.active = true; b.el.classList.add('is-in'); wake(); }, 120 + i * 110);
    });
    wake();
  };

  /* ---------- mãos ---------- */
  const local = (e) => {
    const r = tray.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const bodyOf = (target) => bodies.find((b) => b.el === target?.closest?.('.tray__body'));

  if (!reduceMotion.matches) {
    tray.addEventListener('pointerdown', (e) => {
      const b = bodyOf(e.target);
      if (!b || !b.active || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      try { tray.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
      const p = local(e);
      b.drag = { id: e.pointerId, ox: p.x - b.x, oy: p.y - b.y, tx: b.x, ty: b.y, moved: 0, t0: performance.now() };
      setHot(b);
      tray.classList.add('is-grabbing');
      wake();
    });
    tray.addEventListener('pointermove', (e) => {
      const b = bodies.find((x) => x.drag && x.drag.id === e.pointerId);
      if (b) {
        const p = local(e);
        const tx = Math.max(xMin + b.r, Math.min(xMax - b.r, p.x - b.drag.ox));
        const ty = Math.max(b.r, Math.min(H - b.r, p.y - b.drag.oy));
        b.drag.moved += Math.hypot(tx - b.drag.tx, ty - b.drag.ty);
        b.drag.tx = tx;
        b.drag.ty = ty;
        wake();
        return;
      }
      if (e.pointerType === 'mouse') {
        const over = bodyOf(e.target);
        setHot(over?.active ? over : null);
      }
    });
    const release = (e) => {
      const b = bodies.find((x) => x.drag && x.drag.id === e.pointerId);
      if (!b) return;
      const tap = b.drag.moved < 6 && performance.now() - b.drag.t0 < 320;
      b.drag = null;
      tray.classList.remove('is-grabbing');
      if (tap) { b.vy = -11 - Math.random() * 4; b.vx = (Math.random() - 0.5) * 6; }
      if (e.pointerType !== 'mouse') setTimeout(() => setHot(null), 900);
      wake();
    };
    tray.addEventListener('pointerup', release);
    tray.addEventListener('pointercancel', release);
    tray.addEventListener('lostpointercapture', release);
    tray.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !bodies.some((b) => b.drag)) setHot(null);
    });

    // a lista ao lado cutuca a logo correspondente
    area.addEventListener('tech:hover', (e) => {
      const b = bodies.find((x) => x.id === e.detail.id);
      setHot(b?.active ? b : null, false);
      if (!b?.active || b.drag) return;
      b.vy = -9 - Math.random() * 3;
      b.vx += (Math.random() - 0.5) * 3;
      wake();
    });
  }

  const layout = () => {
    W = tray.clientWidth;
    H = tray.clientHeight;
    const base = Math.max(25, Math.min(44, W * 0.062)) * scale;
    bounds(base);
    for (const b of bodies) {
      b.r = base;
      b.el.style.width = `${b.r * 2}px`;
      b.el.style.height = `${b.r * 2}px`;
      b.x = Math.max(xMin + b.r, Math.min(xMax - b.r, b.x || xMin + b.r));
      b.y = Math.max(b.r, Math.min(H - b.r, b.y || b.r));
      if (b.active) place(b);
    }
    if (started && reduceMotion.matches) stack();
    else if (started) wake();
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start();
    }, { threshold: 0.25 });
    io.observe(tray);
  } else start();

  return { layout };
}
