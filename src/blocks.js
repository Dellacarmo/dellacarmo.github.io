import { reduceMotion, createLoop } from './util.js';

// O nome do rodapé em blocos que respondem ao ponteiro como um equalizador.
// Tocar ou clicar num bloco dá um impulso que sobe até o topo e assenta de novo.
export function initBlocks() {
  const band = document.querySelector('.blocks');
  if (!band) return { fit() {} };
  const items = [...band.querySelectorAll('.block')].map((el) => ({
    el, h: (parseFloat(el.style.getPropertyValue('--h')) || 100) / 100, s: 1, v: 0, kick: 0, cx: 0,
  }));

  const fit = () => {
    band.style.fontSize = '';
    const size = parseFloat(getComputedStyle(band).fontSize);
    const gaps = (items.length - 1) * 4;
    items.forEach((b) => { b.el.style.flexGrow = '0'; });
    const used = items.reduce((sum, b) => sum + b.el.offsetWidth, 0);
    items.forEach((b) => { b.el.style.flexGrow = ''; });
    const avail = band.clientWidth - gaps;
    if (used > 0) {
      const byWidth = (size * avail * 0.94) / used;
      const byHeight = (band.clientHeight * 0.64) / 0.52; // a letra baixa mais alta cabe no bloco mais baixo
      band.style.fontSize = `${Math.min(byWidth, byHeight)}px`;
    }
    items.forEach((b) => { b.cx = b.el.offsetLeft + b.el.offsetWidth / 2; });
  };

  if (reduceMotion.matches) return { fit };

  let px = null;
  const loop = createLoop(() => {
    const W = band.clientWidth || 1;
    let moving = false;
    for (const b of items) {
      const full = 1 / b.h; // escala que leva o bloco até o topo da faixa
      let target = 1;
      if (px !== null) {
        const d = (px - b.cx) / W;
        target = 1 + (full - 1) * 0.85 * Math.exp(-(d * d) / 0.006);
      }
      if (b.kick > 0.002) {
        target = Math.max(target, 1 + (full - 1) * b.kick);
        b.kick *= 0.9;
        moving = true;
      } else b.kick = 0;
      b.v = (b.v + (target - b.s) * 0.18) * 0.68;
      b.s += b.v;
      if (Math.abs(target - b.s) + Math.abs(b.v) > 0.0008) moving = true;
      else { b.s = target; b.v = 0; }
      b.el.style.setProperty('--s', b.s.toFixed(4));
    }
    return moving;
  });

  const local = (e) => e.clientX - band.getBoundingClientRect().left;
  band.addEventListener('pointermove', (e) => { px = local(e); loop.kick(); });
  band.addEventListener('pointerleave', () => { px = null; loop.kick(); });
  band.addEventListener('pointerdown', (e) => {
    const x = local(e);
    let best = items[0];
    for (const b of items) if (Math.abs(b.cx - x) < Math.abs(best.cx - x)) best = b;
    best.kick = 1;
    loop.kick();
  });

  return { fit };
}
