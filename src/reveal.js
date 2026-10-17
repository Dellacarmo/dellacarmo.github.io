// Cada seção revela as suas partes uma vez. Sem script, nada fica escondido (ver html.js no CSS).
export function initReveal() {
  const targets = document.querySelectorAll('[data-reveal], [data-lines], .board, [data-pop], [data-slide], .blocks, .person');
  const show = (el) => el.classList.add('is-in');
  if (!('IntersectionObserver' in window)) { targets.forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target);
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  targets.forEach((el) => io.observe(el));
  // rede de segurança: o que estiver na tela aparece mesmo se o observador não disparar
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) show(el);
    });
  }, 2600));
}
