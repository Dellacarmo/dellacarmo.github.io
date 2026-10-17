// "Quem traz isso": passar o ponteiro, focar ou tocar numa tecnologia mostra de quem ela vem.
// Uma etiqueta só por área, num trilho logo abaixo da lista. A lista e a bandeja de logos
// conversam: a logo sob o ponteiro acende o item da lista, e o item da lista cutuca a logo.
export function initAreas() {
  const faceOf = (who) => document.querySelector(`.person--${who} .person__face img`);
  const people = { felipe: ['felipe'], enzo: ['enzo'], ambos: ['felipe', 'enzo'] };
  const names = { felipe: 'Felipe', enzo: 'Enzo', ambos: 'Felipe e Enzo' };

  for (const box of document.querySelectorAll('.area__text')) {
    const area = box.closest('.area');
    const techs = [...box.querySelectorAll('.tech')];
    if (!techs.length) continue;
    const stack = box.querySelector('.area__stack');
    const hint = box.querySelector('.area__hint');
    const tag = document.createElement('div');
    tag.className = 'blame';
    tag.setAttribute('aria-hidden', 'true');
    const live = document.createElement('p');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    box.append(tag, live);
    let current = null;

    const show = (btn, fromTray = false) => {
      if (current === btn) return;
      current?.classList.remove('is-blamed');
      current = btn;
      btn.classList.add('is-blamed');
      const by = people[btn.dataset.by] ? btn.dataset.by : 'ambos';
      const faces = people[by].map((who) => {
        const ring = document.createElement('span');
        ring.className = `blame__face blame__face--${who}`;
        const img = document.createElement('img');
        const src = faceOf(who);
        img.src = src?.currentSrc || src?.src || '';
        img.alt = '';
        ring.append(img);
        return ring;
      });
      const label = document.createElement('span');
      label.className = 'blame__who';
      label.textContent = names[by];
      tag.replaceChildren(...faces, label);
      // a etiqueta corre num trilho logo abaixo da lista, alinhada ao item, sem cobrir nenhum outro
      const x = Math.max(0, Math.min(btn.offsetLeft, box.clientWidth - tag.offsetWidth));
      tag.style.setProperty('--bx', `${x}px`);
      tag.style.setProperty('--by', `${stack.offsetTop + stack.offsetHeight + 14}px`);
      tag.classList.add('is-on');
      hint?.classList.add('is-done');
      live.textContent = `${btn.textContent}: ${names[by]}`;
      if (!fromTray && btn.dataset.logo) area.dispatchEvent(new CustomEvent('tech:hover', { detail: { id: btn.dataset.logo } }));
    };
    const hide = () => {
      current?.classList.remove('is-blamed');
      current = null;
      tag.classList.remove('is-on');
    };

    techs.forEach((btn) => {
      btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(btn); });
      btn.addEventListener('focus', () => show(btn));
      btn.addEventListener('click', () => { current = null; show(btn); });
    });
    box.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
    box.addEventListener('focusout', (e) => { if (!box.contains(e.relatedTarget)) hide(); });
    document.addEventListener('pointerdown', (e) => { if (!area.contains(e.target)) hide(); });

    // a bandeja avisa qual logo está sob o ponteiro (ou na mão)
    area.addEventListener('tray:hover', (e) => {
      const btn = e.detail.id ? box.querySelector(`.tech[data-logo="${e.detail.id}"]`) : null;
      if (btn) show(btn, true);
      else hide();
    });
  }
}
