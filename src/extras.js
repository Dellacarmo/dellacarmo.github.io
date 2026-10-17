import { reduceMotion, finePointer, clamp, createLoop } from './util.js';

/* ---------- equipe: os retratos inclinam na direção do ponteiro e giram como moeda no toque ---------- */
export function initTeam() {
  if (reduceMotion.matches) return;
  for (const person of document.querySelectorAll('.person')) {
    const face = person.querySelector('.person__face');
    if (!face) continue;
    if (finePointer.matches) {
      person.addEventListener('pointermove', (e) => {
        const r = face.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) / r.width, -1, 1);
        const dy = clamp((e.clientY - (r.top + r.height / 2)) / r.height, -1, 1);
        face.style.setProperty('--rx', `${(-dy * 16).toFixed(1)}deg`);
        face.style.setProperty('--ry', `${(dx * 16).toFixed(1)}deg`);
        face.style.setProperty('--s', '1.03');
      });
      person.addEventListener('pointerleave', () => {
        face.style.setProperty('--rx', '0deg');
        face.style.setProperty('--ry', '0deg');
        face.style.setProperty('--s', '1');
      });
    }
    face.addEventListener('click', () => {
      face.animate(
        [{ transform: 'perspective(800px) rotateY(0deg)' }, { transform: 'perspective(800px) rotateY(360deg)' }],
        { duration: 900, easing: 'cubic-bezier(0.76, 0, 0.24, 1)' },
      );
    });
  }
}

/* ---------- 2025: o número rola até os dias desde que a organização nasceu ---------- */
export function initYear() {
  const tile = document.querySelector('.tile--year');
  const figure = tile?.querySelector('.tile__figure');
  const caption = tile?.querySelector('.tile__caption');
  if (!tile || !figure || !caption) return;
  const born = new Date(2025, 11, 9);
  const today = new Date();
  const days = Math.max(0, Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(2025, 11, 9)) / 86400000));
  const views = [
    { value: '2025', caption: caption.textContent },
    { value: String(days), caption: `dias desde ${born.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}, quando a organização nasceu no GitHub` },
  ];
  let view = 0;
  let busy = false;

  figure.textContent = '';
  const mask = document.createElement('span');
  mask.className = 'roll';
  const text = document.createElement('span');
  text.className = 'roll__text';
  text.textContent = views[0].value;
  mask.append(text);
  figure.append(mask);

  const countUp = (to) => {
    const start = performance.now();
    const loop = createLoop((t) => {
      const k = clamp((t - start) / 900);
      text.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      return k < 1;
    });
    loop.kick();
  };

  const flip = () => {
    if (busy) return;
    view = 1 - view;
    const next = views[view];
    tile.setAttribute('aria-pressed', String(view === 1));
    caption.textContent = next.caption;
    if (reduceMotion.matches) { text.textContent = next.value; return; }
    busy = true;
    const out = text.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-105%)', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' });
    out.onfinish = () => {
      text.textContent = view === 1 ? '0' : next.value;
      text.animate([{ transform: 'translateY(105%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      if (view === 1) countUp(days);
      busy = false;
    };
  };

  tile.tabIndex = 0;
  tile.setAttribute('role', 'button');
  tile.setAttribute('aria-pressed', 'false');
  tile.setAttribute('aria-label', 'Alternar entre o ano de fundação e os dias desde então');
  if (finePointer.matches) {
    tile.addEventListener('pointerenter', () => { if (view === 0) flip(); });
    tile.addEventListener('pointerleave', () => { if (view === 1) flip(); });
  } else tile.addEventListener('click', flip);
  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
  });
}

/* ---------- propósito: as palavras acendem conforme a leitura avança com a rolagem ---------- */
export function initScrub() {
  const p = document.querySelector('.purpose__body');
  if (!p || reduceMotion.matches) return;
  const words = p.textContent.split(/(\s+)/);
  p.replaceChildren(...words.map((w) => {
    if (!w.trim()) return document.createTextNode(w);
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    return s;
  }));
  const spans = [...p.querySelectorAll('.w')];
  p.classList.add('is-scrubbing');
  let lit = -1;
  const loop = createLoop(() => {
    const r = p.getBoundingClientRect();
    const vh = window.innerHeight;
    const k = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.3));
    const n = Math.round(k * spans.length);
    if (n !== lit) {
      spans.forEach((s, i) => s.classList.toggle('is-lit', i < n));
      lit = n;
    }
    return false;
  });
  window.addEventListener('scroll', loop.kick, { passive: true });
  loop.kick();
}

/* ---------- contato: copiar o e-mail, com as letras fazendo uma onda ---------- */
export function initCopy() {
  const btn = document.querySelector('.contact__copy');
  const text = document.querySelector('.contact__row--email .contact__text');
  if (!btn || !text) return;
  btn.hidden = false;
  const email = 'dellacarmo19@gmail.com';
  let letters = null;
  const split = () => {
    if (letters) return letters;
    for (const node of [...text.childNodes]) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      const group = document.createElement('span');
      group.className = 'lgroup';
      for (const ch of node.nodeValue) {
        const s = document.createElement('span');
        s.className = 'l';
        s.textContent = ch;
        group.append(s);
      }
      node.replaceWith(group);
    }
    letters = [...text.querySelectorAll('.l')];
    return letters;
  };
  let timer;
  btn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(email); ok = true; } catch { ok = false; }
    btn.textContent = ok ? 'copiado' : 'copie à mão';
    btn.classList.toggle('is-done', ok);
    clearTimeout(timer);
    timer = setTimeout(() => { btn.textContent = 'copiar'; btn.classList.remove('is-done'); }, 2200);
    if (reduceMotion.matches) return;
    split().forEach((l, i) => l.animate(
      [{ transform: 'none' }, { transform: 'translateY(-0.28em)', offset: 0.4 }, { transform: 'none' }],
      { duration: 520, delay: i * 26, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
    ));
  });
}
