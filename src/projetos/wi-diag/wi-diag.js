import { siApple, siLinux } from 'simple-icons';
import { reduceMotion, clamp, createLoop } from '../../util.js';

// A página do WI//DIAG liga como o app: o espaço 3D roda ao fundo, o nome se decodifica,
// o 17 conta as redes no ar, o espectro deixa trocar de canal e o terminal roda enquanto aparece.
const SCRAMBLE = 'ABCDEF0123456789#%&*+=/<>';
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const calm = () => reduceMotion.matches;

export function initWiDiag() {
  const page = document.querySelector('.case--wi');
  if (!page) return;

  icons(page);
  copy(page);
  const hero = heroLoop(page);
  const term = terminal(page);
  const air = airCount(page);
  const fix = channelFix(page);
  const intro = [...page.querySelectorAll('.wi-hero [data-decode]')].map(decoder);
  if (calm()) page.querySelector('.wi-flow')?.pauseAnimations?.();

  // quem passa o ponteiro no card já baixa a fonte e a imagem do topo
  page.addEventListener('case:warm', () => {
    for (const w of [400, 700, 800]) document.fonts?.load?.(`${w} 1em "JetBrains Mono"`).catch(() => {});
    const still = page.querySelector('.wi-hero__still');
    if (still) still.loading = 'eager';
  });
  page.addEventListener('case:open', () => {
    hero.start();
    if (!calm()) setTimeout(() => intro.forEach((d) => d.run()), 160);
  });
  page.addEventListener('case:close', () => {
    hero.stop();
    term.stop();
    air.reset();
    fix.reset();
  });
}

/* ---------- texto que se decodifica, caractere por caractere (a fonte é mono: nada pula) ---------- */
function decoder(el) {
  const nodes = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push({ node: n, text: n.nodeValue });
  const total = nodes.reduce((sum, x) => sum + x.text.length, 0) || 1;
  let start = 0;
  const loop = createLoop((t) => {
    if (!start) start = t;
    const k = clamp((t - start) / 780);
    let i = 0;
    for (const item of nodes) {
      let out = '';
      for (const ch of item.text) {
        const settle = 0.25 + (i++ / total) * 0.75;
        out += k >= settle || ch === ' ' ? ch : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
      }
      item.node.nodeValue = out;
    }
    return k < 1;
  });
  return { run() { start = 0; loop.kick(); } };
}

/* ---------- o espaço 3D de fundo: um loop curto que só roda com a página aberta e à vista ---------- */
function heroLoop(page) {
  const hero = page.querySelector('.wi-hero');
  const video = page.querySelector('.wi-hero__loop');
  if (!hero || !video) return { start() {}, stop() {} };
  let open = false;
  let visible = true;
  const allowed = () => !calm() && !navigator.connection?.saveData;
  const sync = () => {
    if (open && visible && allowed()) {
      video.preload = 'auto';
      video.play()?.catch(() => {});
    } else video.pause();
  };
  video.addEventListener('playing', () => video.classList.add('is-on'));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(hero);
  }
  return {
    start() { open = true; sync(); },
    stop() { open = false; sync(); },
  };
}

/* ---------- o terminal toca enquanto está na tela; o botão pausa (e sem movimento ele começa parado) ---------- */
function terminal(page) {
  const video = page.querySelector('.wi-window__video');
  const toggle = page.querySelector('.wi-window__toggle');
  if (!video || !toggle) return { stop() {} };
  let paused = calm();
  let visible = false;
  const sync = () => {
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Tocar a animação do terminal' : 'Pausar a animação do terminal');
    if (!paused && visible) {
      video.preload = 'auto';
      video.play()?.catch(() => {});
    } else video.pause();
  };
  toggle.hidden = false;
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  video.addEventListener('playing', () => video.classList.add('is-on'));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.25 }).observe(video);
  }
  sync();
  return { stop() { visible = false; sync(); } };
}

/* ---------- 17 redes no ar: o número conta quando aparece, uma vez por visita ---------- */
function airCount(page) {
  const num = page.querySelector('.wi-air__num');
  if (!num || calm() || !('IntersectionObserver' in window)) return { reset() {} };
  const to = Number(num.dataset.count) || 0;
  let done = false;
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || done) return;
    done = true;
    const start = performance.now();
    createLoop((t) => {
      const k = clamp((t - start) / 1400);
      num.textContent = k < 0.35 ? SCRAMBLE[(Math.random() * 16) | 0] + SCRAMBLE[(Math.random() * 16) | 0] : String(Math.round(to * easeOut((k - 0.35) / 0.65)));
      return k < 1;
    }).kick();
  }, { threshold: 0.5 });
  io.observe(num);
  return { reset() { done = false; num.textContent = String(to); } };
}

/* ---------- do canal 6 ao 11: a curva do seu roteador salta para o canal livre e o link melhora ---------- */
function channelFix(page) {
  const panel = page.querySelector('.wi-fix__panel');
  const go = panel?.querySelector('.wi-fix__go');
  if (!go) return { reset() {} };
  const ch = panel.querySelector('.wi-fix__ch');
  const verdict = panel.querySelector('.wi-fix__verdict span');
  const nums = [...panel.querySelectorAll('[data-from]')].map((el) => ({ el, from: Number(el.dataset.from), to: Number(el.dataset.to), loop: null }));
  const labels = { busy: go.textContent, verdict: verdict.textContent };
  let fixed = false;

  const tween = (n, from, to) => {
    if (calm()) { n.el.textContent = String(to); return; }
    const start = performance.now();
    n.loop = createLoop((t) => {
      const k = clamp((t - start) / 1300);
      n.el.textContent = String(Math.round(from + (to - from) * easeOut(k)));
      return k < 1;
    });
    n.loop.kick();
  };
  const set = (next, animate = true) => {
    fixed = next;
    panel.classList.toggle('is-fixed', fixed);
    go.textContent = fixed ? 'Voltar para o canal 6' : labels.busy;
    ch.textContent = fixed ? '11' : '6';
    verdict.textContent = fixed ? '▸ Link excelente' : labels.verdict;
    for (const n of nums) {
      if (animate) tween(n, fixed ? n.from : n.to, fixed ? n.to : n.from);
      else n.el.textContent = String(fixed ? n.to : n.from);
    }
    panel.classList.remove('is-hopping');
    if (fixed && animate && !calm()) {
      void panel.offsetWidth; // reinicia a animação do salto
      panel.classList.add('is-hopping');
    }
  };

  go.hidden = false;
  go.addEventListener('click', () => set(!fixed));
  return { reset() { if (fixed) set(false, false); } };
}

/* ---------- ícones das plataformas ---------- */
function icons(page) {
  const svg = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
  const ICONS = {
    apple: svg(`<path d="${siApple.path}"/>`),
    linux: svg(`<path d="${siLinux.path}"/>`),
    windows: svg('<path d="M3 5.4 10.4 4.4v7.1H3zm8.4-1.1L21 3v8.5h-9.6zM3 12.5h7.4v7.1L3 18.6zm8.4 0H21V21l-9.6-1.3z"/>'),
    demo: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 12 18.4 5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="16.2" cy="9.4" r="1.5"/>'),
  };
  for (const el of page.querySelectorAll('[data-icon]')) el.innerHTML = ICONS[el.dataset.icon] || '';
}

/* ---------- copiar os comandos do terminal ---------- */
function copy(page) {
  const btn = page.querySelector('.wi-copy');
  if (!btn || !navigator.clipboard) return;
  const text = [...page.querySelectorAll('.wi-term__line[data-cmd]')].map((line) => line.dataset.cmd).join('\n');
  let timer;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = false; }
    btn.textContent = ok ? 'copiado' : 'copie à mão';
    btn.classList.toggle('is-done', ok);
    clearTimeout(timer);
    timer = setTimeout(() => { btn.textContent = 'copiar'; btn.classList.remove('is-done'); }, 2200);
  });
}
