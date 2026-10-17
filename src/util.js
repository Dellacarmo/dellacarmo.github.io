export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

const SVG_NS = 'http://www.w3.org/2000/svg';

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const svgEl = (name, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

// posição de um elemento dentro de um ancestral posicionado, sem contar transforms
export const offsetIn = (el, ancestor) => {
  let x = 0;
  let y = 0;
  for (let n = el; n && n !== ancestor; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
};

// um laço de animação que só roda enquanto alguma coisa ainda se mexe
export const createLoop = (step) => {
  let id = 0;
  const tick = (t) => {
    id = 0;
    if (step(t)) id = requestAnimationFrame(tick);
  };
  return {
    kick() { if (!id) id = requestAnimationFrame(tick); },
  };
};
