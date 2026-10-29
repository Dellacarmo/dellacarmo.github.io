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
import { initPlayers } from './youtube.js';
import { initRouter } from './router.js';
import { initWiDiag } from './projetos/wi-diag/wi-diag.js';

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
initPlayers();
initWiDiag();

// com um projeto aberto a home fica escondida: as medidas dela esperam até ela voltar
let homeStale = false;
const router = initRouter({
  onHome: () => {
    if (!homeStale) return;
    homeStale = false;
    layout();
  },
});

const layout = () => {
  blocks.fit();
  if (router.isCase()) { homeStale = true; return; }
  hero.layout();
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
    if (Math.abs(window.innerWidth - lastWidth) < 2) {
      if (router.isCase()) homeStale = true;
      else { story.layout(); map.layout(); }
      return;
    }
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
      if (router.isCase()) return;
      map.layout();
      if (team && Math.abs(team.offsetHeight - teamHeight) > 2) { teamHeight = team.offsetHeight; water.layout(); }
    });
  }).observe(document.body);
}
