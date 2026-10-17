import { reduceMotion, finePointer, createLoop } from './util.js';
import heroSource from './hero.js?raw';
import fuseSource from './fuse.js?raw';
import traySource from './tray.js?raw';

// O fundo da equipe é o código desta própria página, bem apagado. Um clique (ou toque)
// solta uma onda que atravessa o código como água; o ponteiro deixa um rastro leve.
const FONT_PX = 13;
const LINE = 19;
const BASE = 0.1;
const SPEED = 0.62; // px por ms
const WAVE = 84; // comprimento de onda em px
const AMP = 15;
const LIFE = 2600;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'; // taste-skill-ignore: o fundo desenha o código-fonte real desta página, e código se escreve em monoespaçada

export function initCodeWater() {
  const section = document.querySelector('.team');
  if (!section) return { layout() {} };

  const canvas = document.createElement('canvas');
  canvas.className = 'codewater';
  canvas.setAttribute('aria-hidden', 'true');
  section.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const font = `${FONT_PX}px ${MONO}`;
  const lines = [heroSource, fuseSource, traySource].join('\n').split('\n')
    .map((l) => l.replace(/\t/g, '  ').replace(/\s+$/, ''));

  let W = 0;
  let H = 0;
  let dpr = 1;
  let cw = 8;
  let cells = [];
  let ripples = [];
  let atlas = null;
  const slot = new Map();

  // cada caractere é desenhado uma vez num atlas; o quadro só copia pedaços dele
  const buildAtlas = () => {
    const chars = [...new Set(cells.map((c) => c.ch))];
    const sw = Math.ceil(cw * dpr) + 2;
    const sh = Math.ceil(LINE * dpr);
    atlas = document.createElement('canvas');
    atlas.width = sw * chars.length;
    atlas.height = sh;
    const a = atlas.getContext('2d');
    a.font = `${FONT_PX * dpr}px ${MONO}`;
    a.fillStyle = getComputedStyle(section).color || '#0a0a0a';
    a.textBaseline = 'alphabetic';
    slot.clear();
    chars.forEach((ch, i) => {
      a.fillText(ch, i * sw + 1, sh * 0.74);
      slot.set(ch, { x: i * sw, w: sw, h: sh });
    });
  };

  const glyph = (ch, x, y) => {
    const s = slot.get(ch);
    if (s) ctx.drawImage(atlas, s.x, 0, s.w, s.h, x, y, s.w / dpr, s.h / dpr);
  };

  const draw = (now) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ripples = ripples.filter((r) => now - r.t0 < r.life);
    ctx.globalAlpha = BASE;
    const lit = [];
    for (const cell of cells) {
      let dx = 0;
      let dy = 0;
      let boost = 0;
      for (const r of ripples) {
        const t = now - r.t0;
        const ox = cell.x - r.x;
        const oy = cell.y - r.y;
        const d = Math.hypot(ox, oy) || 1;
        const phase = d - t * SPEED;
        if (phase > WAVE * 1.6 || phase < -WAVE * 2.4) continue;
        const fade = 1 - t / r.life;
        const env = Math.exp(-(phase * phase) / (WAVE * WAVE * 0.9)) * fade * fade * r.amp;
        const push = Math.sin((phase / WAVE) * Math.PI * 2) * AMP * env;
        dx += (ox / d) * push;
        dy += (oy / d) * push;
        boost += env;
      }
      if (boost > 0.03) lit.push([cell.ch, cell.x + dx, cell.y + dy, boost]);
      else glyph(cell.ch, cell.x, cell.y);
    }
    for (const [ch, x, y, b] of lit) {
      ctx.globalAlpha = Math.min(0.75, BASE + b * 0.6);
      glyph(ch, x, y);
    }
    ctx.globalAlpha = 1;
    return ripples.length > 0;
  };

  const loop = createLoop((t) => draw(t));

  const layout = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = section.clientWidth;
    H = section.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.font = font;
    cw = ctx.measureText('M').width || 7.8;
    const pad = 16;
    const cols = Math.floor((W - pad * 2) / cw);
    const rows = Math.ceil(H / LINE);
    // em telas largas o código vira colunas lado a lado, como um editor dividido
    const groups = Math.max(1, Math.ceil(cols / 110));
    const span = Math.floor(cols / groups);
    cells = [];
    for (let g = 0; g < groups; g++) {
      for (let r = 0; r < rows; r++) {
        const line = lines[(g * rows + r) % lines.length];
        for (let k = 0; k < Math.min(span - 3, line.length); k++) {
          const ch = line[k];
          if (ch !== ' ') cells.push({ ch, x: pad + (g * span + k) * cw, y: r * LINE });
        }
      }
    }
    buildAtlas();
    draw(performance.now());
  };

  const splash = (x, y, amp = 1, life = LIFE) => {
    ripples.push({ x, y, t0: performance.now(), amp, life });
    if (ripples.length > 9) ripples.shift();
    loop.kick();
  };
  const local = (e) => {
    const r = section.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  if (!reduceMotion.matches) {
    const hint = section.querySelector('.team__hint');
    if (hint) {
      hint.hidden = false;
      if (!finePointer.matches) hint.textContent = 'Toque no fundo: o código desta página vira água.';
    }
    section.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button')) return;
      const p = local(e);
      splash(p.x, p.y);
    });
    if (finePointer.matches) {
      // o ponteiro passando deixa um rastro leve, como um dedo na água
      let lastSplash = 0;
      let lx = 0;
      let ly = 0;
      section.addEventListener('pointermove', (e) => {
        const p = local(e);
        const now = performance.now();
        if (now - lastSplash < 130 || Math.hypot(p.x - lx, p.y - ly) < 48) return;
        lastSplash = now;
        lx = p.x;
        ly = p.y;
        splash(p.x, p.y, 0.32, 1500);
      });
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setTimeout(() => splash(W * 0.5, H * 0.42), 650);
      }, { threshold: 0.35 });
      io.observe(section);
    }
  }

  return { layout };
}
