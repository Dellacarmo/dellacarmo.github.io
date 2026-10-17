import { reduceMotion } from './util.js';

// O histórico deste site: os últimos commits do repositório público da organização,
// lidos ao vivo da API do GitHub (sem chave). Se a API falhar, fica a lista do HTML.
const API = 'https://api.github.com/repos/Dellacarmo/dellacarmo.github.io/commits?per_page=5';
const CACHE = 'dellacarmo:log';
const PEOPLE = {
  'felipe-dpmedeiros': { who: 'felipe', name: 'Felipe' },
  EnzoHessel: { who: 'enzo', name: 'Enzo' },
  eduhessel: { who: 'eduardo', name: 'Eduardo' },
};

const relative = (iso) => {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const steps = [[60, 'second'], [3600, 'minute'], [86400, 'hour'], [604800, 'day'], [2629800, 'week'], [31557600, 'month'], [Infinity, 'year']];
  const sizes = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 };
  for (const [limit, unit] of steps) {
    if (Math.abs(diff) < limit) return rtf.format(Math.round(diff / sizes[unit]), unit);
  }
  return '';
};

const load = async () => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE) || 'null');
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.data;
  } catch { /* sem cache */ }
  const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = (await res.json()).map((c) => ({
    sha: c.sha,
    url: c.html_url,
    message: (c.commit?.message || '').split('\n')[0],
    date: c.commit?.author?.date,
    login: c.author?.login || '',
    avatar: c.author?.avatar_url || '',
  }));
  try { sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), data })); } catch { /* armazenamento cheio ou bloqueado */ }
  return data;
};

export function initLog() {
  const box = document.querySelector('.log');
  const list = box?.querySelector('.log__list');
  if (!list) return;
  const faceOf = (who) => {
    const img = document.querySelector(`.person--${who} .person__face img`);
    return img?.currentSrc || img?.src || '';
  };

  // a lista entra quando aparece: o ramo cresce e os commits sobem um a um
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    box.classList.add('is-waiting');
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      box.classList.add('is-in');
    }, { threshold: 0.2 });
    io.observe(box);
  }

  load().then((commits) => {
    if (!commits.length) return;
    list.replaceChildren(...commits.map((c, i) => {
      const person = PEOPLE[c.login];
      const li = document.createElement('li');
      li.className = 'log__item';
      li.dataset.who = person?.who || 'outro';
      li.style.setProperty('--i', i);
      const a = document.createElement('a');
      a.className = 'log__link';
      a.href = c.url;
      a.rel = 'noopener';
      const node = document.createElement('span');
      node.className = 'log__node';
      const src = person ? faceOf(person.who) : c.avatar;
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.width = 510;
        img.height = 510;
        node.append(img);
      }
      const msg = document.createElement('span');
      msg.className = 'log__msg';
      msg.textContent = c.message;
      const meta = document.createElement('span');
      meta.className = 'log__meta';
      meta.textContent = `${person?.name || c.login || 'alguém'}, ${relative(c.date)}`;
      a.append(node, msg, meta);
      li.append(a);
      return li;
    }));
  }).catch(() => { /* sem rede ou limite da API: fica a lista que veio no HTML */ });
}
