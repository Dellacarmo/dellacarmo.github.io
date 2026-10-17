import { reduceMotion, clamp, createLoop } from './util.js';

// O processo como um grafo de git que se desenha com a rolagem:
// um commit, o protótipo, o branch que se abre, as revisões cruzadas e o merge.
export function initProcess() {
  const story = document.querySelector('.story');
  if (!story) return { layout() {} };

  // os rostos do grafo usam as mesmas fotos da equipe (com os caminhos finais do build)
  for (const img of story.querySelectorAll('image[data-face]')) {
    const src = document.querySelector(`.person--${img.dataset.face} .person__face img`);
    if (src) img.setAttribute('href', src.currentSrc || src.src);
  }
  if (reduceMotion.matches) return { layout() {} };

  story.classList.add('is-scrolly');
  const lines = [...story.querySelectorAll('[data-from]')].map((el) => ({ el, from: +el.dataset.from, to: +el.dataset.to, len: 0 }));
  const nodes = [...story.querySelectorAll('[data-at]')].map((el) => ({ el, at: +el.dataset.at }));
  const steps = [...story.querySelectorAll('.step')];
  const jumps = [...story.querySelectorAll('.story__jump')];
  let active = -1;

  const progress = () => {
    const r = story.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    return span > 0 ? clamp(-r.top / span) : 0;
  };

  const loop = createLoop(() => {
    const p = progress();
    for (const l of lines) l.el.style.strokeDashoffset = `${l.len * (1 - clamp((p - l.from) / (l.to - l.from)))}`;
    for (const n of nodes) n.el.classList.toggle('is-on', p >= n.at);
    const i = Math.min(steps.length - 1, Math.floor(p * steps.length));
    if (i !== active) {
      active = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      jumps.forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.setAttribute('aria-current', k === i ? 'step' : 'false');
      });
    }
    return false;
  });

  window.addEventListener('scroll', loop.kick, { passive: true });
  jumps.forEach((b, k) => b.addEventListener('click', () => {
    const top = story.getBoundingClientRect().top + window.scrollY;
    const span = story.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((k + 0.55) / steps.length), behavior: 'smooth' });
  }));

  return {
    layout() {
      for (const l of lines) {
        l.len = l.el.getTotalLength();
        l.el.style.strokeDasharray = `${l.len} ${l.len}`;
      }
      loop.kick();
    },
  };
}
