import { initReveal } from './reveal.js';
import { initHero } from './hero.js';
import { initFuse } from './fuse.js';
import { initAreas } from './areas.js';
import { initProcess } from './process.js';
import { initBlocks } from './blocks.js';
import { initMagnetic } from './magnetic.js';

const hero = initHero();
const blocks = initBlocks();
const story = initProcess();
initFuse();
initAreas();
initMagnetic();
initReveal();

const layout = () => {
  hero.layout();
  blocks.fit();
  story.layout();
};

const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
ready.then(layout);

let timer;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    // no celular a barra do navegador muda só a altura: não precisa refazer o hero
    if (Math.abs(window.innerWidth - lastWidth) < 2) { story.layout(); return; }
    lastWidth = window.innerWidth;
    layout();
  }, 140);
});
