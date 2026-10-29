import { reduceMotion } from './util.js';

// Uma página por projeto, sem sair do site. O link "#projetos/<nome>" abre o <article class="case">
// de mesmo id no lugar da home, e "voltar" devolve a home na rolagem em que ela estava.
// Onde o navegador tem view transitions, a imagem do card cresce até virar o topo do projeto.
// Sem script, o mesmo endereço abre o projeto por :target (ver style.css).
const SHARED = 'case-media';

export function initRouter({ onHome } = {}) {
  const root = document.documentElement;
  const cases = [...document.querySelectorAll('.case')];
  if (!cases.length) return { isCase: () => false };

  const homeTitle = document.title;
  const warmed = new WeakSet();
  let current = null;
  let homeScroll = null; // a rolagem da home quando um projeto foi aberto a partir dela
  let skipPop = false;

  const caseOf = (hash) => {
    let id = (hash || '').slice(1);
    try { id = decodeURIComponent(id); } catch { /* fica como veio */ }
    return id ? cases.find((c) => c.id === id) || null : null;
  };
  const cardOf = (c) => document.querySelector(`.project__link[href="#${c.id}"]`);
  const mediaOf = (el) => el?.querySelector('[data-case-media]') || null;
  const inView = (el) => {
    const r = el?.getBoundingClientRect();
    return !!r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  };
  const smooth = () => (reduceMotion.matches ? 'auto' : 'smooth');
  const scrollToHash = (hash) => {
    const el = hash && hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (el) el.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  };

  const show = (next) => {
    if (next === current) return;
    const prev = current;
    current = next;
    prev?.classList.remove('is-current');
    if (next) {
      next.classList.add('is-current');
      root.dataset.view = 'case';
    } else delete root.dataset.view;
    document.title = next?.dataset.title || homeTitle;
    prev?.dispatchEvent(new CustomEvent('case:close'));
    if (next) next.dispatchEvent(new CustomEvent('case:open'));
    else onHome?.();
  };

  // a troca de página; quando as duas pontas estão na tela, a imagem passa de uma para a outra
  const swap = (update, from, findTo) => {
    if (!document.startViewTransition || reduceMotion.matches || document.visibilityState !== 'visible') {
      update();
      return;
    }
    const shared = inView(from) ? from : null;
    let to = null;
    if (shared) shared.style.viewTransitionName = SHARED;
    const vt = document.startViewTransition(async () => {
      if (shared) shared.style.viewTransitionName = '';
      update();
      to = shared ? findTo() : null;
      if (!to || !inView(to)) { to = null; return; }
      to.style.viewTransitionName = SHARED;
      // a imagem do outro lado precisa estar pronta, senão a transição pousa num quadro vazio
      const img = to.querySelector('img');
      if (img) {
        img.loading = 'eager';
        await Promise.race([img.decode().catch(() => {}), new Promise((done) => setTimeout(done, 450))]);
      }
    });
    vt.ready.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
    vt.finished.finally(() => {
      if (shared) shared.style.viewTransitionName = '';
      if (to) to.style.viewTransitionName = '';
    });
  };

  const open = (next, link) => {
    const from = current ? mediaOf(current) : mediaOf(link?.closest('.project__link') || cardOf(next));
    if (!current) homeScroll = window.scrollY;
    swap(() => {
      history.pushState({ case: next.id }, '', `#${next.id}`);
      show(next);
      window.scrollTo(0, 0);
      next.querySelector('h1')?.focus({ preventScroll: true });
    }, from, () => mediaOf(next));
  };

  const leave = (hash, link) => {
    const leaving = current;
    // se o projeto foi aberto daqui, "voltar" anda para trás no histórico, como o botão do navegador
    const back = link?.hasAttribute('data-back') && homeScroll !== null && history.state?.case === leaving.id;
    const y = homeScroll;
    swap(() => {
      if (back) {
        skipPop = true;
        history.back();
      } else history.pushState(null, '', hash);
      show(null);
      homeScroll = null;
      if (back) window.scrollTo(0, y);
      else scrollToHash(hash);
      if (link?.hasAttribute('data-back')) cardOf(leaving)?.focus({ preventScroll: true });
    }, mediaOf(leaving), () => mediaOf(cardOf(leaving)));
  };

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest?.('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    const next = caseOf(hash);
    if (next) {
      e.preventDefault();
      if (next === current) window.scrollTo({ top: 0, behavior: smooth() });
      else open(next, link);
      return;
    }
    if (!current) return; // na home, as âncoras seguem normais
    e.preventDefault();
    const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    // dentro do projeto aberto a âncora só rola até a seção, e "Voltar ao topo" volta ao topo dele
    if (hash === '#topo' || (target && current.contains(target))) {
      if (target && hash !== '#topo') target.scrollIntoView({ behavior: smooth(), block: 'start' });
      else window.scrollTo({ top: 0, behavior: smooth() });
      return;
    }
    leave(hash, link);
  });

  // voltar e avançar do navegador: troca na hora, e o navegador devolve a rolagem de cada entrada
  window.addEventListener('popstate', () => {
    if (skipPop) { skipPop = false; return; }
    const next = caseOf(location.hash);
    if (next === current) return;
    if (next && !current) homeScroll = window.scrollY;
    show(next);
    if (next) window.scrollTo(0, 0);
    else {
      if (homeScroll !== null) window.scrollTo(0, homeScroll);
      else scrollToHash(location.hash);
      homeScroll = null;
    }
  });

  // quem passa o ponteiro ou foca num card já começa a carregar a página do projeto
  const warm = (e) => {
    const link = e.target.closest?.('a[href^="#"]');
    const c = link && caseOf(link.getAttribute('href'));
    if (!c || warmed.has(c)) return;
    warmed.add(c);
    c.dispatchEvent(new CustomEvent('case:warm'));
  };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('touchstart', warm, { passive: true });
  document.addEventListener('focusin', warm);

  root.classList.add('is-routed');
  const first = caseOf(location.hash);
  if (first) show(first);

  return { isCase: () => !!current };
}
