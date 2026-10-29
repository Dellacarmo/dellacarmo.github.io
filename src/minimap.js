import { reduceMotion, clamp, createLoop } from './util.js';

// O mapa do merge: um ramo de git preso à borda direita, com um commit por seção.
// Ele enche conforme a rolagem, mostra o nome da seção sob o ponteiro e leva até ela no clique.
// A tinta troca conforme o campo de cor que passa por baixo.
const SECTIONS = [
  ['#nome', 'o nome'],
  ['#proposito', 'propósito'],
  ['#areas', 'áreas'],
  ['#projetos', 'projetos'],
  ['#equipe', 'equipe'],
  ['#processo', 'processo'],
  ['#contato', 'contato'],
];

export function initMinimap() {
  const hero = document.querySelector('.hero');
  const targets = SECTIONS.map(([sel, label]) => ({ el: document.querySelector(sel), sel, label })).filter((t) => t.el);
  if (!targets.length) return { layout() {} };

  const nav = document.createElement('nav');
  nav.className = 'map';
  nav.setAttribute('aria-label', 'Mapa da página');
  const lane = document.createElement('span');
  lane.className = 'map__lane';
  const fill = document.createElement('span');
  fill.className = 'map__fill';
  lane.append(fill);
  nav.append(lane);
  const nodes = targets.map((t) => {
    const a = document.createElement('a');
    a.className = 'map__node';
    a.href = t.sel;
    const label = document.createElement('span');
    label.className = 'map__label';
    label.textContent = t.label;
    const dot = document.createElement('span');
    dot.className = 'map__dot';
    a.append(label, dot);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      t.el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
    nav.append(a);
    return a;
  });
  document.body.append(nav);

  let tops = [];
  const measure = () => { tops = targets.map((t) => t.el.getBoundingClientRect().top + window.scrollY); };

  // claro ou escuro: o que está pintado embaixo do mapa, no meio da tela
  const toneUnder = () => {
    const x = window.innerWidth - 18;
    const y = window.innerHeight / 2;
    for (const el of document.elementsFromPoint(x, y)) {
      if (nav.contains(el)) continue;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const [r, g, b, a = 1] = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if (a < 0.5) continue;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? 'dark' : 'light';
      }
      break;
    }
    return 'light';
  };

  const state = { active: -2, tone: '', on: null };
  const loop = createLoop(() => {
    const y = window.scrollY + window.innerHeight * 0.5;
    let active = -1;
    tops.forEach((t, i) => { if (y >= t) active = i; });
    const on = hero ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.35 : true;
    if (on !== state.on) { nav.classList.toggle('is-on', on); state.on = on; }

    let p = 0;
    if (active >= tops.length - 1) p = 1;
    else if (active >= 0) p = (active + clamp((y - tops[active]) / (tops[active + 1] - tops[active]))) / (tops.length - 1);
    fill.style.transform = `scaleY(${p.toFixed(4)})`;

    if (active !== state.active) {
      state.active = active;
      nodes.forEach((n, i) => {
        n.classList.toggle('is-active', i === active);
        n.classList.toggle('is-past', i < active);
        if (i === active) n.setAttribute('aria-current', 'location');
        else n.removeAttribute('aria-current');
      });
    }
    const tone = toneUnder();
    if (tone !== state.tone) { nav.dataset.tone = tone; state.tone = tone; }
    return false;
  });
  window.addEventListener('scroll', loop.kick, { passive: true });

  return { layout() { measure(); loop.kick(); } };
}
