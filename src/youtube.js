// Vídeo do YouTube com capa leve: o player do YouTube só carrega quando a pessoa aperta o play.
// O vídeo vem de data-youtube, que aceita o código do vídeo ou o link inteiro (youtu.be, watch?v=,
// shorts ou embed). Vazio, fica a capa com o aviso de "em breve".
const idFrom = (value) => {
  const v = (value || '').trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/);
  return m ? m[1] : '';
};

export function initPlayers() {
  for (const box of document.querySelectorAll('.player[data-youtube]')) {
    const id = idFrom(box.dataset.youtube);
    const play = box.querySelector('.player__play');
    if (!id || !play) continue;
    const label = box.dataset.label || 'Vídeo';
    box.querySelector('.player__soon')?.setAttribute('hidden', '');
    box.classList.add('is-ready');
    play.disabled = false;
    play.setAttribute('aria-label', `${label}: assistir`);

    let frame = null;
    play.addEventListener('click', () => {
      frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
      frame.title = label;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; web-share';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      box.append(frame);
      box.classList.add('is-playing');
      frame.focus();
    });

    // a página do projeto fechou: o vídeo para junto (um iframe escondido continuaria tocando)
    box.closest('.case')?.addEventListener('case:close', () => {
      if (!frame) return;
      frame.remove();
      frame = null;
      box.classList.remove('is-playing');
    });
  }
}
