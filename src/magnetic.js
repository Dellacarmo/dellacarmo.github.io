import { reduceMotion, finePointer } from './util.js';

// Botões que puxam de leve na direção do ponteiro e afundam ao clicar.
export function initMagnetic() {
  if (!finePointer.matches || reduceMotion.matches) return;
  document.querySelectorAll('.magnetic').forEach((btn) => {
    btn.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), background-color 200ms ease';
    let pull = '';
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      pull = `translate(${(dx * 7).toFixed(1)}px, ${(dy * 5).toFixed(1)}px)`;
      btn.style.transform = pull;
    });
    btn.addEventListener('pointerleave', () => { pull = ''; btn.style.transform = ''; });
    btn.addEventListener('pointerdown', () => { btn.style.transform = `${pull} scale(0.95)`; });
    btn.addEventListener('pointerup', () => { btn.style.transform = pull; });
  });
}
