import { reduceMotion } from './util.js';

// A fusão de nomes: escolha uma palavra de cada nome e as letras voam até o resultado.
// Quando o fim de uma palavra é o começo da outra, as letras repetidas pousam no mesmo lugar.
export function initFuse() {
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
  const shuffleBtn = tools.querySelector('[data-fuse="shuffle"]');
  const editBtn = tools.querySelector('[data-fuse="edit"]');
  const resetBtn = tools.querySelector('[data-fuse="reset"]');
  const send = tools.querySelector('[data-fuse="send"]');

  const plain = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const tidy = (s) => s.replace(/[^\p{L}\p{M}'\- ]/gu, ' ').replace(/\s+/g, ' ').trim();
  const words = (name) => tidy(name).split(' ').filter(Boolean);
  const selectable = (w) => !PARTICLES.has(plain(w));
  const cap = (w) => w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1).toLocaleLowerCase('pt-BR');
  const low = (w) => w.toLocaleLowerCase('pt-BR');

  const fuse = (a, b) => {
    const left = low(a);
    const B = low(b);
    for (let k = Math.min(3, left.length - 1, B.length - 1); k >= 1; k--) {
      if (plain(left).endsWith(plain(B.slice(0, k)))) return { left, right: B.slice(k), overlap: k };
    }
    return { left, right: B, overlap: 0 };
  };

  // o mesmo critério que gerou o nome: a segunda palavra do primeiro nome, a última do segundo
  const defaultPick = (list, which) => {
    const idx = list.map((w, i) => (selectable(w) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return -1;
    return which === 0 ? (idx[1] ?? idx[0]) : idx[idx.length - 1];
  };

  const state = { names: [...DEFAULTS], pick: [1, 4] };

  /* ---------- letras em voo ---------- */
  const glyphs = (el, text) => {
    el.replaceChildren(...[...text].map((ch) => {
      const s = document.createElement('span');
      s.className = 'g';
      s.textContent = ch;
      return s;
    }));
  };

  const lettersOf = (chip) => {
    const node = chip?.querySelector('.chip__t')?.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return [];
    const range = document.createRange();
    const rects = [];
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      rects.push(range.getBoundingClientRect());
    }
    return rects;
  };

  const fly = (chipA, chipB, left, overlap) => {
    if (reduceMotion.matches || !chipA || !chipB) return;
    const targets = [...out.querySelectorAll('.g')];
    if (!targets.length) return;
    const dest = targets.map((t) => t.getBoundingClientRect());
    const destSize = parseFloat(getComputedStyle(out).fontSize);
    const layer = document.createElement('div');
    layer.className = 'fly-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
    const lands = new Array(targets.length).fill(0);
    let last = 0;

    const launch = (chip, toIndex, first) => {
      const size = parseFloat(getComputedStyle(chip).fontSize);
      const text = chip.textContent;
      lettersOf(chip).forEach((rect, i) => {
        const j = toIndex(i);
        const d = dest[j];
        if (!d || !rect.width) return;
        const ghost = document.createElement('span');
        ghost.className = 'fly';
        ghost.textContent = text[i];
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        ghost.style.fontSize = `${size}px`;
        layer.append(ghost);
        const scale = destSize / size;
        const dx = d.left - rect.left;
        const dy = d.top - rect.top;
        const lift = -Math.min(150, 50 + Math.abs(dx) * 0.14);
        const delay = (first + i) * 26;
        const duration = 780 + (i % 3) * 80;
        ghost.animate([
          { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + lift}px) scale(${(1 + scale) / 2}) rotate(${i % 2 ? 9 : -9}deg)`, offset: 0.55 },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)` },
        ], { duration, delay, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'forwards' });
        lands[j] = Math.max(lands[j], delay + duration);
        last = Math.max(last, delay + duration);
      });
    };

    targets.forEach((t) => { t.style.opacity = '0'; });
    chipA.classList.add('is-flying');
    chipB.classList.add('is-flying');
    launch(chipA, (i) => i, 0);
    launch(chipB, (i) => (i < overlap ? left.length - overlap + i : left.length + i - overlap), 3);
    targets.forEach((t, j) => setTimeout(() => { t.style.opacity = ''; }, lands[j]));
    setTimeout(() => {
      layer.remove();
      chipA.classList.remove('is-flying');
      chipB.classList.remove('is-flying');
    }, last + 80);
  };

  /* ---------- linhas de nomes ---------- */
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
      const t = document.createElement('span');
      t.className = 'chip__t';
      t.textContent = w;
      b.append(t);
      b.setAttribute('aria-pressed', String(i === state.pick[r]));
      b.addEventListener('click', () => {
        state.pick[r] = i;
        renderRow(r);
        renderResult(true);
        rows[r].children[i]?.focus();
      });
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

  const pressed = (r) => rows[r].querySelector('.chip[aria-pressed="true"]');

  const renderResult = (animate) => {
    const a = words(state.names[0])[state.pick[0]];
    const b = words(state.names[1])[state.pick[1]];
    if (!a || !b) {
      sum.textContent = 'Falta uma palavra';
      glyphs(partA, '…');
      glyphs(partB, '');
      send.hidden = true;
      return;
    }
    const { left, right, overlap } = fuse(a, b);
    const word = left + right;
    sum.textContent = `${cap(a)} + ${cap(b)} =`;
    glyphs(partA, left);
    glyphs(partB, right);
    out.setAttribute('aria-label', word);
    if (animate) fly(pressed(0), pressed(1), left, overlap);
    const isDefault = state.names[0] === DEFAULTS[0] && state.names[1] === DEFAULTS[1] && state.pick[0] === 1 && state.pick[1] === 4;
    resetBtn.hidden = isDefault;
    send.hidden = isDefault;
    send.href = `mailto:dellacarmo19@gmail.com?subject=${encodeURIComponent(`Fusão: ${word}`)}&body=${encodeURIComponent(`Juntei ${cap(a)} + ${cap(b)} na página de vocês e deu ${word}.`)}`;
  };

  /* ---------- ferramentas ---------- */
  const randomPick = (r) => {
    const idx = words(state.names[r]).map((w, i) => (selectable(w) ? i : -1)).filter((i) => i >= 0);
    if (idx.length < 2) return idx[0] ?? -1;
    let i;
    do { i = idx[Math.floor(Math.random() * idx.length)]; } while (i === state.pick[r]);
    return i;
  };

  shuffleBtn.addEventListener('click', () => {
    state.pick = [randomPick(0), randomPick(1)];
    renderRow(0);
    renderRow(1);
    renderResult(true);
  });

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
    renderRow(0);
    renderRow(1);
    renderResult(true);
    editBtn.focus();
  });

  editBtn.setAttribute('aria-expanded', 'false');
  tools.hidden = false;
  renderRow(0);
  renderRow(1);
  renderResult(false);

  // quando a seção aparece, as duas metades do resultado se encontram uma vez
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      setTimeout(merge, 250);
    }, { threshold: 0.55 });
    io.observe(root);
  }
}
