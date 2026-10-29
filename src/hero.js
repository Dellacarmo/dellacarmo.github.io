import { reduceMotion, finePointer, cssVar, clamp, svgEl, offsetIn, createLoop } from './util.js';

// O grafo do merge: o ramo do Felipe e o do Enzo terminam num nó sobre a junção de "della" e "carmo".
// Os rostos podem ser arrastados: os ramos esticam, o nome se separa e, ao soltar,
// uma mola leva tudo de volta e o merge acontece de novo, com um pulso no nó.
export function initHero() {
  const panel = document.querySelector('.hero__panel');
  if (!panel) return { layout() {} };

  const svg = panel.querySelector('.graph');
  const mark = panel.querySelector('.mark');
  const halfA = mark.querySelector('.mark__della');
  const halfB = mark.querySelector('.mark__carmo');
  const hint = panel.querySelector('.hero__hint');
  const nodes = [...panel.querySelectorAll('.node__body')].map((body) => ({
    body,
    face: body.querySelector('.node__face'),
    rest: { x: 0, y: 0, r: 0 },
    x: 0, y: 0, vx: 0, vy: 0,
    drag: null,
  }));
  const [A, B] = nodes;
  const g = { W: 0, H: 0, lane: 12, size: 100, seam: 0, nodeY: 0, stemEnd: 0, R: 16 };
  const state = { split: 0, splitV: 0, scrollSplit: 0, live: false, merged: true, pointer: null, built: false, intro: 0 };
  const parts = {};

  if (hint && !reduceMotion.matches) hint.hidden = false;

  /* ---------- medidas ---------- */
  const fitMark = () => {
    mark.style.fontSize = '';
    const avail = panel.clientWidth - mark.offsetLeft * 2;
    const used = halfA.offsetWidth + halfB.offsetWidth;
    const size = parseFloat(getComputedStyle(mark).fontSize);
    if (used > 0 && avail > 0) mark.style.fontSize = `${(size * avail) / used}px`;
  };

  let probe;
  const baseline = () => {
    if (!probe) {
      probe = document.createElement('span');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      mark.querySelector('.mark__line').append(probe);
    }
    return mark.offsetTop + probe.offsetTop;
  };

  const xHeight = (size) => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `700 ${size}px "League Spartan"`;
    return ctx.measureText('x').actualBoundingBoxAscent || size * 0.5;
  };

  // O texto do topo e as legendas dos rostos (acima dos nós, a meia altura) disputam o mesmo espaço em janelas
  // baixas. Se a legenda encostar no texto, o painel cresce só o bastante para ela ficar abaixo dele.
  const intro = panel.querySelector('.hero__intro');
  const clearIntro = () => {
    panel.style.minHeight = '';
    if (!intro) return;
    const bottom = offsetIn(intro, panel).y + intro.offsetHeight;
    const left = intro.offsetLeft;
    const right = left + intro.offsetWidth;
    let short = 0;
    for (const n of nodes) {
      const tag = n.body.querySelector('.node__tag');
      const o = offsetIn(tag, panel);
      if (o.x + tag.offsetWidth <= left || o.x >= right) continue;
      short = Math.max(short, bottom + 16 - o.y);
    }
    if (short <= 0 || !panel.clientHeight) return;
    // os nós ficam numa fração fixa da altura, então cada pixel que o painel ganha empurra a legenda só por essa fração
    const lane = (offsetIn(A.face, panel).y + A.face.offsetHeight / 2) / panel.clientHeight;
    panel.style.minHeight = `${Math.ceil(panel.clientHeight + short / lane)}px`;
  };

  const measure = () => {
    g.W = panel.clientWidth;
    g.H = panel.clientHeight;
    g.lane = Math.max(9, Math.min(24, g.W * 0.018));
    g.size = parseFloat(getComputedStyle(mark).fontSize);
    g.seam = mark.offsetLeft + halfA.offsetLeft + halfA.offsetWidth;
    const top = baseline() - xHeight(g.size);
    g.R = g.lane * 1.35;
    g.nodeY = top - g.lane * 1.1 - g.R;
    g.stemEnd = top - g.lane * 0.75;
    for (const n of nodes) {
      const o = offsetIn(n.face, panel);
      n.rest = { x: o.x + n.face.offsetWidth / 2, y: o.y + n.face.offsetHeight / 2, r: n.face.offsetWidth / 2 };
    }
  };

  /* ---------- desenho ---------- */
  const build = () => {
    const bg = cssVar('--bg');
    svg.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`);
    svg.setAttribute('width', g.W);
    svg.setAttribute('height', g.H);
    svg.replaceChildren();
    const lane = (colour, delay) => {
      const p = svgEl('path', { stroke: colour, 'stroke-width': g.lane });
      p.style.setProperty('--delay', `${delay}ms`);
      svg.append(p);
      return p;
    };
    const commit = (colour, r, extra = '') => {
      const grp = svgEl('g', { class: `merge-node ${extra}`.trim() });
      const outer = svgEl('circle', { r, fill: colour });
      const hole = svgEl('circle', { r: r * 0.44, fill: bg });
      grp.append(outer, hole);
      svg.append(grp);
      return { grp, outer, hole };
    };
    parts.laneA = lane(cssVar('--lemon'), 0);
    parts.laneB = lane(cssVar('--cornflower'), 140);
    parts.stem = lane(cssVar('--mint'), 1050);
    parts.dotA = commit(cssVar('--lemon'), g.lane * 0.95);
    parts.dotB = commit(cssVar('--cornflower'), g.lane * 0.95);
    // pontas soltas, visíveis só quando o nome se separa
    parts.endA = commit(cssVar('--lemon'), g.lane * 1.05, 'graph__end');
    parts.endB = commit(cssVar('--cornflower'), g.lane * 1.05, 'graph__end');
    parts.node = commit(cssVar('--mint'), g.R);
    state.built = true;
  };

  const setD = (p, d) => p.setAttribute('d', d);
  const place = (c, x, y) => {
    for (const el of [c.outer, c.hole]) { el.setAttribute('cx', x); el.setAttribute('cy', y); }
  };
  const mid = (p0, p1, p2, p3) => (p0 + 3 * p1 + 3 * p2 + p3) / 8;

  const ripple = () => {
    if (reduceMotion.matches || !state.built) return;
    const c = svgEl('circle', {
      cx: g.seam, cy: g.nodeY, r: g.R, fill: 'none',
      stroke: cssVar('--mint'), 'stroke-width': g.lane * 0.45, class: 'graph__ripple',
    });
    svg.append(c);
    const anim = c.animate(
      [{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(3.6)', opacity: 0 }],
      { duration: 950, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
    anim.onfinish = () => c.remove();
  };

  const render = () => {
    if (!state.built) return;
    const { W, nodeY, lane, seam } = g;
    const s = state.split;
    const sA = seam - s;
    const sB = seam + s;
    const a = { x: A.rest.x + A.x, y: A.rest.y + A.y };
    const b = { x: B.rest.x + B.x, y: B.rest.y + B.y };

    // ramo do Felipe: entra pela borda esquerda, passa pelo rosto e desce até a junção
    const a0x = -lane; const a0y = A.rest.y;
    const a1x = a.x * 0.45; const a1y = A.rest.y;
    const a2x = a.x - Math.max(30, a.x * 0.3); const a2y = a.y;
    setD(parts.laneA, `M ${a0x} ${a0y} C ${a1x} ${a1y} ${a2x} ${a2y} ${a.x} ${a.y} C ${a.x + (sA - a.x) * 0.62} ${a.y} ${sA} ${a.y + (nodeY - a.y) * 0.42} ${sA} ${nodeY}`);
    place(parts.dotA, mid(a0x, a1x, a2x, a.x), mid(a0y, a1y, a2y, a.y));

    // ramo do Enzo: o espelho, vindo da borda direita
    const b0x = W + lane; const b0y = B.rest.y;
    const b1x = W - (W - b.x) * 0.45; const b1y = B.rest.y;
    const b2x = b.x + Math.max(30, (W - b.x) * 0.3); const b2y = b.y;
    setD(parts.laneB, `M ${b0x} ${b0y} C ${b1x} ${b1y} ${b2x} ${b2y} ${b.x} ${b.y} C ${b.x - (b.x - sB) * 0.62} ${b.y} ${sB} ${b.y + (nodeY - b.y) * 0.42} ${sB} ${nodeY}`);
    place(parts.dotB, mid(b0x, b1x, b2x, b.x), mid(b0y, b1y, b2y, b.y));

    setD(parts.stem, `M ${seam} ${nodeY} L ${seam} ${g.stemEnd}`);
    place(parts.node, seam, nodeY);
    place(parts.endA, sA, nodeY);
    place(parts.endB, sB, nodeY);

    const m = 1 - clamp((s - 3) / 26);
    if (state.live) {
      parts.node.grp.style.opacity = m;
      parts.node.grp.style.transform = `scale(${0.5 + 0.5 * m})`;
      parts.stem.style.opacity = m;
      if (state.merged && m < 0.3) state.merged = false;
      else if (!state.merged && m > 0.97) { state.merged = true; ripple(); }
    }
    parts.endA.grp.style.opacity = 1 - m;
    parts.endB.grp.style.opacity = 1 - m;
    halfA.style.transform = s > 0.05 ? `translateX(${-s}px)` : '';
    halfB.style.transform = s > 0.05 ? `translateX(${s}px)` : '';
    for (const n of nodes) n.body.style.transform = n.x || n.y ? `translate(${n.x}px, ${n.y}px)` : '';
  };

  /* ---------- física ---------- */
  const STIFF = 0.13;
  const DAMP = 0.72;
  const loop = createLoop(() => {
    let active = false;
    for (const n of nodes) {
      if (n.drag) { active = true; continue; }
      let tx = 0;
      let ty = 0;
      if (state.pointer) {
        // em repouso, os rostos se inclinam de leve na direção do ponteiro
        const dx = state.pointer.x - n.rest.x;
        const dy = state.pointer.y - n.rest.y;
        const d = Math.hypot(dx, dy);
        if (d > 1 && d < g.W * 0.45) {
          const pull = Math.min(16, d * 0.05);
          tx = (dx / d) * pull;
          ty = (dy / d) * pull;
        }
      }
      n.vx = (n.vx + (tx - n.x) * STIFF) * DAMP;
      n.vy = (n.vy + (ty - n.y) * STIFF) * DAMP;
      n.x += n.vx;
      n.y += n.vy;
      if (Math.abs(n.vx) + Math.abs(n.vy) + Math.abs(tx - n.x) + Math.abs(ty - n.y) > 0.05) active = true;
      else { n.x = tx; n.y = ty; n.vx = 0; n.vy = 0; }
    }
    // quanto mais longe um rosto é puxado, mais os sobrenomes se separam
    const pulled = Math.max(...nodes.map((n) => clamp((Math.hypot(n.x, n.y) - 22) * 0.24, 0, g.size * 0.36)));
    const target = Math.max(pulled, state.scrollSplit);
    state.splitV = (state.splitV + (target - state.split) * 0.16) * 0.7;
    state.split += state.splitV;
    if (Math.abs(target - state.split) + Math.abs(state.splitV) > 0.05) active = true;
    else { state.split = target; state.splitV = 0; }
    render();
    return active;
  });

  const goLive = () => {
    if (state.live || reduceMotion.matches) return;
    state.live = true;
    clearTimeout(state.intro);
    svg.classList.add('is-drawn', 'is-live');
    render();
  };

  /* ---------- mãos ---------- */
  const toPanel = (e) => {
    const r = panel.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  if (!reduceMotion.matches) {
    for (const n of nodes) {
      n.face.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        goLive();
        e.preventDefault();
        try { n.face.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético ou já liberado */ }
        const p = toPanel(e);
        n.drag = { id: e.pointerId, ox: p.x - (n.rest.x + n.x), oy: p.y - (n.rest.y + n.y) };
        panel.classList.add('is-dragging');
        loop.kick();
      });
      n.face.addEventListener('pointermove', (e) => {
        if (!n.drag || n.drag.id !== e.pointerId) return;
        const p = toPanel(e);
        const x = clamp(p.x - n.drag.ox - n.rest.x, n.rest.r - n.rest.x, g.W - n.rest.r - n.rest.x);
        const y = clamp(p.y - n.drag.oy - n.rest.y, n.rest.r - n.rest.y, g.H - n.rest.r - n.rest.y);
        n.vx = x - n.x;
        n.vy = y - n.y;
        n.x = x;
        n.y = y;
        loop.kick();
      });
      const release = (e) => {
        if (!n.drag || n.drag.id !== e.pointerId) return;
        n.drag = null;
        panel.classList.remove('is-dragging');
        hint?.classList.add('is-done');
        loop.kick();
      };
      n.face.addEventListener('pointerup', release);
      n.face.addEventListener('pointercancel', release);
      n.face.addEventListener('lostpointercapture', release);
    }

    if (finePointer.matches) {
      panel.addEventListener('pointermove', (e) => {
        if (!state.live) return;
        state.pointer = toPanel(e);
        loop.kick();
      });
      panel.addEventListener('pointerleave', () => { state.pointer = null; loop.kick(); });
    }

    // ao rolar para fora do topo, o nome se desfaz nos dois sobrenomes da próxima seção
    window.addEventListener('scroll', () => {
      if (!state.live) return;
      const r = panel.getBoundingClientRect();
      if (!r.height) return; // a home está escondida atrás de uma página de projeto
      if (r.bottom < 0 && state.scrollSplit > 0) return;
      state.scrollSplit = clamp(-r.top / (r.height * 0.9)) * g.size * 0.26;
      loop.kick();
    }, { passive: true });
  }

  /* ---------- montagem ---------- */
  let first = true;
  const layout = () => {
    fitMark();
    clearIntro();
    measure();
    build();
    if (state.live) svg.classList.add('is-drawn', 'is-live');
    render();
    for (const p of [parts.laneA, parts.laneB, parts.stem]) p.style.setProperty('--len', `${Math.ceil(p.getTotalLength()) + 2}`);
    if (!first) return;
    first = false;
    if (reduceMotion.matches) { svg.classList.add('is-drawn'); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('is-drawn')));
    // em aba de fundo o requestAnimationFrame não roda: garante o desenho mesmo assim
    setTimeout(() => svg.classList.add('is-drawn'), 900);
    state.intro = setTimeout(() => { ripple(); goLive(); }, 1500);
  };

  return { layout };
}
