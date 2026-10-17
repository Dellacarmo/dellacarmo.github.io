const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const SVG = 'http://www.w3.org/2000/svg';
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/* ---------- entradas: cada seção revela as suas partes uma vez ---------- */
(() => {
  const targets = document.querySelectorAll('[data-reveal], [data-lines], .board, [data-pop], [data-slide], .stages, .blocks, .person');
  const show = (el) => el.classList.add('is-in');
  if (!('IntersectionObserver' in window)) { targets.forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target);
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  targets.forEach((el) => io.observe(el));
  // rede de segurança: nada fica escondido se o observador não disparar
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) show(el);
    });
  }, 2600));
})();

/* ---------- hero: o nome ocupa a largura do painel e o grafo do merge é desenhado sobre ele ---------- */
const panel = document.querySelector('.hero__panel');
const svg = panel?.querySelector('.graph');
const mark = panel?.querySelector('.mark');
const della = mark?.querySelector('.mark__della');
const carmo = mark?.querySelector('.mark__carmo');
const faceA = panel?.querySelector('.node--felipe .node__face');
const faceB = panel?.querySelector('.node--enzo .node__face');

const fitMark = () => {
  if (!mark) return;
  const avail = panel.clientWidth - mark.offsetLeft * 2;
  const used = della.offsetWidth + carmo.offsetWidth;
  const size = parseFloat(getComputedStyle(mark).fontSize);
  if (used > 0 && avail > 0) mark.style.fontSize = `${(size * avail) / used}px`;
};

let probe;
const baselineOf = () => {
  if (!probe) {
    probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    mark.querySelector('.mark__line').append(probe);
  }
  return mark.offsetTop + probe.offsetTop;
};

const xHeightOf = (size) => {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `700 ${size}px "League Spartan"`;
  const m = ctx.measureText('x');
  return m.actualBoundingBoxAscent || size * 0.5;
};

const centreOf = (el) => {
  const p = panel.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - p.left + r.width / 2, y: r.top - p.top + r.height / 2, r: r.width / 2 };
};

const el = (name, attrs) => {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

let drawn = false;
const buildGraph = () => {
  if (!svg) return;
  const W = panel.clientWidth;
  const H = panel.clientHeight;
  const lane = Math.max(9, Math.min(24, W * 0.018));
  const size = parseFloat(getComputedStyle(mark).fontSize);
  const seam = mark.offsetLeft + della.offsetLeft + della.offsetWidth;
  const top = baselineOf() - xHeightOf(size);
  const R = lane * 1.35;
  const nodeY = top - lane * 1.1 - R;
  const stemEnd = top - lane * 0.75;
  const a = centreOf(faceA);
  const b = centreOf(faceB);

  const bendA = a.x + a.r + (seam - a.x - a.r) * 0.2;
  const bendB = b.x - b.r - (b.x - b.r - seam) * 0.2;
  const pathA = `M ${-lane} ${a.y} L ${bendA} ${a.y} C ${bendA + (seam - bendA) * 0.62} ${a.y} ${seam} ${a.y + (nodeY - a.y) * 0.42} ${seam} ${nodeY}`;
  const pathB = `M ${W + lane} ${b.y} L ${bendB} ${b.y} C ${bendB - (bendB - seam) * 0.62} ${b.y} ${seam} ${b.y + (nodeY - b.y) * 0.42} ${seam} ${nodeY}`;
  const stem = `M ${seam} ${nodeY} L ${seam} ${stemEnd}`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.replaceChildren();

  const lanes = [
    [pathA, css('--lemon'), 0],
    [pathB, css('--cornflower'), 140],
    [stem, css('--mint'), 1050],
  ];
  for (const [d, colour, delay] of lanes) {
    const p = el('path', { d, stroke: colour, 'stroke-width': lane });
    svg.append(p);
    p.style.setProperty('--len', `${Math.ceil(p.getTotalLength()) + 2}`);
    p.style.setProperty('--delay', `${delay}ms`);
  }

  // commits anteriores em cada ramo: o detalhe que só aparece na segunda olhada
  const commit = (x, y, colour) => {
    const g = el('g', { class: 'merge-node' });
    g.append(el('circle', { cx: x, cy: y, r: lane * 0.95, fill: colour }));
    g.append(el('circle', { cx: x, cy: y, r: lane * 0.42, fill: css('--bg') }));
    svg.append(g);
  };
  commit((a.x - a.r) * 0.48, a.y, css('--lemon'));
  commit(W - (W - b.x - b.r) * 0.48, b.y, css('--cornflower'));

  // o nó do merge, exatamente acima da junção entre "della" e "carmo"
  const node = el('g', { class: 'merge-node' });
  node.append(el('circle', { cx: seam, cy: nodeY, r: R, fill: css('--mint') }));
  node.append(el('circle', { cx: seam, cy: nodeY, r: R * 0.42, fill: css('--bg') }));
  svg.append(node);

  if (drawn || reduceMotion.matches) { svg.classList.add('is-drawn'); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => { svg.classList.add('is-drawn'); drawn = true; }));
  // em aba de fundo o requestAnimationFrame não roda: garante o desenho mesmo assim
  setTimeout(() => { svg.classList.add('is-drawn'); drawn = true; }, 900);
};

/* ---------- rodapé: os blocos ocupam a largura toda ---------- */
const blocks = document.querySelector('.blocks');
const fitBlocks = () => {
  if (!blocks) return;
  const letters = [...blocks.children];
  const size = parseFloat(getComputedStyle(blocks).fontSize);
  const gaps = (letters.length - 1) * 4;
  // largura natural de cada letra (sem o crescimento do flex)
  letters.forEach((b) => { b.style.flexGrow = '0'; });
  const used = letters.reduce((sum, b) => sum + b.offsetWidth, 0);
  letters.forEach((b) => { b.style.flexGrow = ''; });
  const avail = blocks.clientWidth - gaps;
  if (used > 0) {
    const byWidth = (size * avail * 0.94) / used;
    const byHeight = (blocks.clientHeight * 0.64) / 0.52; // a letra baixa mais alta cabe no bloco mais baixo
    blocks.style.fontSize = `${Math.min(byWidth, byHeight)}px`;
  }
};

const layout = () => { fitMark(); buildGraph(); fitBlocks(); };
const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
ready.then(layout);
let resizeTimer;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (Math.abs(window.innerWidth - lastWidth) < 2 && panel) { buildGraph(); return; }
    lastWidth = window.innerWidth;
    if (mark) mark.style.fontSize = '';
    if (blocks) blocks.style.fontSize = '';
    layout();
  }, 140);
});

/* ---------- fusão de nomes ---------- */
(() => {
  const root = document.querySelector('.fuse__machine');
  if (!root) return;

  const DEFAULTS = ['Felipe Della Paschoa Medeiros', 'Enzo Hessel Araujo do Carmo'];
  const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'du', 'van', 'von', 'der', 'y']);
  const rows = [...root.querySelectorAll('.fuse__row')];
  const form = root.querySelector('.fuse__form');
  const inputs = [...form.querySelectorAll('.fuse__input')];
  const sum = root.querySelector('.fuse__sum');
  const out = root.querySelector('.fuse__word output');
  const partA = out.querySelector('.fuse__a');
  const partB = out.querySelector('.fuse__b');
  const tools = root.querySelector('.fuse__tools');
  const editBtn = tools.querySelector('[data-fuse="edit"]');
  const resetBtn = tools.querySelector('[data-fuse="reset"]');
  const send = tools.querySelector('[data-fuse="send"]');

  const plain = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const tidy = (s) => s.replace(/[^\p{L}\p{M}'\- ]/gu, ' ').replace(/\s+/g, ' ').trim();
  const words = (name) => tidy(name).split(' ').filter(Boolean);
  const selectable = (w) => !PARTICLES.has(plain(w));
  const cap = (w) => w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1).toLocaleLowerCase('pt-BR');
  const low = (w) => w.toLocaleLowerCase('pt-BR');

  // Della + Carmo = dellacarmo. Quando o fim de uma palavra é o começo da outra, as letras se sobrepõem.
  const fuse = (a, b) => {
    const A = low(a);
    const B = low(b);
    for (let k = Math.min(3, A.length - 1, B.length - 1); k >= 1; k--) {
      if (plain(A).endsWith(plain(B.slice(0, k)))) return [A, B.slice(k)];
    }
    return [A, B];
  };

  // o mesmo critério que gerou o nome: a segunda palavra do primeiro nome, a última do segundo
  const defaultPick = (list, which) => {
    const idx = list.map((w, i) => (selectable(w) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return -1;
    return which === 0 ? (idx[1] ?? idx[0]) : idx[idx.length - 1];
  };

  const state = { names: [...DEFAULTS], pick: [1, 4] };

  const renderRow = (r) => {
    const row = rows[r];
    const list = words(state.names[r]);
    row.replaceChildren();
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', r === 0 ? 'Palavras do primeiro nome' : 'Palavras do segundo nome');
    if (!list.length) {
      const empty = document.createElement('span');
      empty.className = 'fuse__particle';
      empty.textContent = 'escreva um nome';
      row.append(empty);
      return;
    }
    list.forEach((w, i) => {
      if (!selectable(w)) {
        const s = document.createElement('span');
        s.className = 'fuse__particle';
        s.textContent = w;
        row.append(s);
        return;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = w;
      b.setAttribute('aria-pressed', String(i === state.pick[r]));
      b.addEventListener('click', () => { state.pick[r] = i; renderRow(r); renderResult(true); rows[r].children[i]?.focus(); });
      row.append(b);
    });
  };

  const merge = () => {
    if (reduceMotion.matches) return;
    for (const part of [partA, partB]) {
      part.classList.remove('is-merging');
      void part.offsetWidth;
      part.classList.add('is-merging');
    }
  };

  const renderResult = (animate) => {
    const a = words(state.names[0])[state.pick[0]];
    const b = words(state.names[1])[state.pick[1]];
    if (!a || !b) { sum.textContent = 'Falta uma palavra'; partA.textContent = '…'; partB.textContent = ''; send.hidden = true; return; }
    const [left, right] = fuse(a, b);
    const word = left + right;
    sum.textContent = `${cap(a)} + ${cap(b)} =`;
    partA.textContent = left;
    partB.textContent = right;
    out.setAttribute('aria-label', word);
    if (animate) merge();
    const isDefault = state.names[0] === DEFAULTS[0] && state.names[1] === DEFAULTS[1] && state.pick[0] === 1 && state.pick[1] === 4;
    resetBtn.hidden = isDefault;
    send.hidden = isDefault;
    send.href = `mailto:dellacarmo19@gmail.com?subject=${encodeURIComponent(`Fusão: ${word}`)}&body=${encodeURIComponent(`Juntei ${cap(a)} + ${cap(b)} na página de vocês e deu ${word}.`)}`;
  };

  editBtn.addEventListener('click', () => {
    const opening = form.hidden;
    form.hidden = !opening;
    editBtn.textContent = opening ? 'Fechar os campos' : 'Testar com outros nomes';
    editBtn.setAttribute('aria-expanded', String(opening));
    if (opening) inputs[0].focus();
  });

  inputs.forEach((input, r) => {
    input.addEventListener('input', () => {
      state.names[r] = input.value;
      state.pick[r] = defaultPick(words(input.value), r);
      renderRow(r);
      renderResult(false);
    });
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  resetBtn.addEventListener('click', () => {
    state.names = [...DEFAULTS];
    state.pick = [1, 4];
    inputs.forEach((input, r) => { input.value = DEFAULTS[r]; });
    form.hidden = true;
    editBtn.textContent = 'Testar com outros nomes';
    editBtn.setAttribute('aria-expanded', 'false');
    renderRow(0); renderRow(1); renderResult(true);
    editBtn.focus();
  });

  editBtn.setAttribute('aria-expanded', 'false');
  tools.hidden = false;
  renderRow(0); renderRow(1); renderResult(false);

  // quando a seção aparece, as duas metades do resultado se encontram uma vez
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { merge(); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(out);
  }
})();

/* ---------- processo: sanfona ---------- */
(() => {
  const stages = [...document.querySelectorAll('.stage')];
  stages.forEach((stage) => {
    stage.querySelector('.stage__tab').addEventListener('click', () => {
      stages.forEach((s) => {
        const on = s === stage;
        s.classList.toggle('is-open', on);
        s.querySelector('.stage__tab').setAttribute('aria-expanded', String(on));
      });
    });
  });
})();

/* ---------- botões magnéticos: puxam de leve na direção do ponteiro ---------- */
(() => {
  if (!finePointer.matches || reduceMotion.matches) return;
  document.querySelectorAll('.magnetic').forEach((btn) => {
    btn.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), background-color 200ms ease';
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      btn.style.transform = `translate(${(dx * 6).toFixed(1)}px, ${(dy * 4).toFixed(1)}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    btn.addEventListener('pointerdown', () => { btn.style.transform += ' scale(0.96)'; });
    btn.addEventListener('pointerup', () => { btn.style.transform = btn.style.transform.replace(' scale(0.96)', ''); });
  });
})();

/* ---------- vídeo: pausa fora da tela e sob movimento reduzido ---------- */
(() => {
  for (const v of document.querySelectorAll('video[autoplay]')) {
    const sync = () => {
      if (reduceMotion.matches) { v.removeAttribute('autoplay'); v.pause(); return; }
      v.play().catch(() => {});
    };
    sync();
    reduceMotion.addEventListener('change', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (reduceMotion.matches) continue;
          if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
        }
      }).observe(v);
    }
  }
})();
