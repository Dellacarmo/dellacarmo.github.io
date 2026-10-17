import { initReveal } from './reveal.js';
import { initHero } from './hero.js';
import { initFuse } from './fuse.js';
import { initAreas } from './areas.js';
import { initTrays } from './tray.js';
import { initProcess } from './process.js';
import { initBlocks } from './blocks.js';
import { initMagnetic } from './magnetic.js';
import { initMinimap } from './minimap.js';
import { initCodeWater } from './codewater.js';
import { initTeam, initYear, initScrub, initCopy } from './extras.js';
import { initLog } from './log.js';

const hero = initHero();
const blocks = initBlocks();
const story = initProcess();
const trays = initTrays();
const map = initMinimap();
const water = initCodeWater();
initFuse();
initAreas();
initTeam();
initYear();
initScrub();
initCopy();
initLog();
initMagnetic();
initReveal();

const layout = () => {
  hero.layout();
  blocks.fit();
  story.layout();
  trays.layout();
  water.layout();
  map.layout();
};

const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
ready.then(layout);

let timer;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    // no celular a barra do navegador muda só a altura: não precisa refazer o hero
    if (Math.abs(window.innerWidth - lastWidth) < 2) { story.layout(); map.layout(); return; }
    lastWidth = window.innerWidth;
    layout();
  }, 140);
});

// fotos que carregam depois mudam a altura das seções: o mapa e o fundo de código se reajustam
if ('ResizeObserver' in window) {
  let pending = 0;
  const team = document.querySelector('.team');
  let teamHeight = team?.offsetHeight || 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      map.layout();
      if (team && Math.abs(team.offsetHeight - teamHeight) > 2) { teamHeight = team.offsetHeight; water.layout(); }
    });
  }).observe(document.body);
}
