/** Hash-based history for the Android back button / gesture and in-app back arrows. */
export type Route = { mod: string; tab: string; view: string; id: string; more: boolean; qa: boolean };

export const DEFAULT_TAB: Record<string, string> = {
  home: '', settings: '', notes: '', wishes: '', shopping: '',
  plan: 'week', calendar: 'month', meals: 'week', todos: 'all', health: 'entry',
};
const TABS: Record<string, string[]> = {
  plan: ['week', 'plan', 'summary'],
  calendar: ['month', 'agenda'],
  meals: ['week', 'book'],
  todos: ['all', 'mine', 'other', 'overdue'],
  health: ['entry', 'day', 'week', 'month'],
};
const VIEWS = ['new', 'edit', 'detail', 'manage', 'pick', 'play', 'act', 'supper', 'event'];
const ALIAS: Record<string, string> = { shop: 'shopping', recipes: 'meals', agenda: 'calendar', weekly: 'plan' };
const MODS = ['home', 'plan', 'calendar', 'shopping', 'health', 'meals', 'todos', 'notes', 'wishes', 'settings'];

export function emptyRoute(mod = 'home'): Route {
  return { mod, tab: DEFAULT_TAB[mod] ?? '', view: '', id: '', more: false, qa: false };
}

export function normalize(r: Route): Route {
  const mod = ALIAS[r.mod] || r.mod || 'home';
  const tab = r.tab || DEFAULT_TAB[mod] || '';
  return { mod, tab, view: r.view || '', id: r.id || '', more: !!r.more, qa: !!r.qa };
}

export function toHash(r: Route): string {
  r = normalize(r);
  const parts = [r.mod];
  if (r.tab && r.tab !== (DEFAULT_TAB[r.mod] || '')) parts.push(r.tab);
  if (r.view) parts.push(r.view);
  if (r.id) parts.push(encodeURIComponent(r.id));
  let h = '#/' + parts.join('/');
  const q = new URLSearchParams();
  if (r.more) q.set('more', '1');
  if (r.qa) q.set('qa', '1');
  const qs = q.toString();
  return qs ? h + '?' + qs : h;
}

export function equal(a: Route, b: Route) {
  a = normalize(a); b = normalize(b);
  return a.mod === b.mod && a.tab === b.tab && a.view === b.view && a.id === b.id && a.more === b.more && a.qa === b.qa;
}

/** True when `deep` is the same screen as `base` plus an overlay, form, or detail. */
export function isDeeper(deep: Route, base: Route) {
  deep = normalize(deep); base = normalize(base);
  if (deep.mod !== base.mod) return false;
  if (deep.tab !== base.tab) return false;
  if (deep.more && !base.more && !deep.qa && !deep.view && !base.view && !base.qa) return true;
  if (deep.qa && !base.qa && deep.more === base.more && deep.view === base.view && deep.id === base.id) return true;
  if (deep.view && !base.view && !base.qa && !base.more && deep.more === base.more) return true;
  if (deep.view && base.view && deep.view !== base.view && !base.qa && deep.id) return true; // detail → edit
  if (deep.id && !base.id && deep.view === base.view && !base.qa) return true; // plan day, or edit id
  return false;
}

const LEGACY: Record<string, Partial<Route>> = {
  'demo-home': { mod: 'home' },
  'demo-more': { mod: 'home', more: true },
  'demo-shopping': { mod: 'shopping' },
  'demo-todos': { mod: 'todos' },
  'demo-plan': { mod: 'plan', tab: 'week' },
  'demo-planmode': { mod: 'plan', tab: 'plan' },
  'plansummary': { mod: 'plan', tab: 'summary' },
  'demo-recipes': { mod: 'meals', tab: 'book' },
  'demo-notes': { mod: 'notes' },
  'demo-wishes': { mod: 'wishes' },
  'demo-quick': { mod: 'home', qa: true },
  'demo-event': { mod: 'calendar', view: 'edit' },
  'demo-pain-entry': { mod: 'health', tab: 'entry' },
  'demo-entry': { mod: 'health', tab: 'entry' },
  'demo-settings': { mod: 'settings' },
  'demo-agenda': { mod: 'calendar', tab: 'agenda' },
};

export function parse(hash: string): Route {
  const raw = (hash || '').replace(/^#/, '');
  const [pathPart, queryPart] = raw.split('?');
  const q = new URLSearchParams(queryPart || '');
  const more = q.get('more') === '1';
  const qa = q.get('qa') === '1' || pathPart === 'quick' || /(^|\/)quick$/.test(pathPart);
  const key = pathPart.replace(/^\//, '');
  if (LEGACY[key]) return normalize({ ...emptyRoute(), ...LEGACY[key], more: more || !!LEGACY[key].more, qa: qa || !!LEGACY[key].qa } as Route);
  if (key === 'demo' || key === 'demo/') return emptyRoute('home');
  // #planmode / #demo-planmode already in LEGACY; also contain-based
  if (/planmode/.test(key) && !key.includes('/')) return normalize({ ...emptyRoute('plan'), tab: 'plan', more, qa });
  if (/plansummary/.test(key) && !key.includes('/')) return normalize({ ...emptyRoute('plan'), tab: 'summary', more, qa });

  const parts = key.split('/').filter(Boolean).map(p => decodeURIComponent(p));
  if (!parts.length) return emptyRoute('home');
  // skip leading "demo"
  if (parts[0] === 'demo') parts.shift();
  if (!parts.length) return emptyRoute('home');
  let mod = ALIAS[parts[0]] || parts[0];
  if (mod === 'quick') return normalize({ ...emptyRoute('home'), qa: true, more });
  if (!MODS.includes(mod)) return emptyRoute('home');
  const rest = parts.slice(1);
  let tab = '', view = '', id = '';
  if (rest[0] && (TABS[mod] || []).includes(rest[0])) tab = rest.shift()!;
  if (rest[0] && VIEWS.includes(rest[0])) view = rest.shift()!;
  if (rest.length) id = rest.join('/');
  if (!view && id) {
    if (['wishes', 'notes', 'todos', 'shopping', 'calendar'].includes(mod)) view = 'edit';
    else if (mod === 'meals' && (tab || DEFAULT_TAB.meals) === 'book') view = 'detail';
  }
  if (view === 'event') view = 'edit';
  return normalize({ mod, tab, view, id, more, qa });
}

export function parent(r: Route): Route {
  r = normalize(r);
  if (r.qa) return { ...r, qa: false };
  if (r.more) return { ...r, more: false };
  if (r.view === 'edit' && r.mod === 'meals' && r.id) return { ...r, view: 'detail' };
  if (r.view) {
    const keepId = r.mod === 'plan' && r.tab === 'plan' && /^\d{4}-\d{2}-\d{2}/.test(r.id) ? r.id.split('_')[0] : '';
    return { ...r, view: '', id: keepId };
  }
  if (r.id && !(r.mod === 'plan' && r.tab === 'plan')) return { ...r, id: '' };
  return r;
}

type Cfg = {
  snapshot: () => Route;
  apply: (r: Route) => void | Promise<void>;
  render: () => void;
  dirty: () => boolean;
};
let cfg: Cfg | null = null;
let applying = false;

export const isApplying = () => applying;

export function initRouter(c: Cfg) {
  cfg = c;
  window.addEventListener('popstate', onPop);
}

export function boot(r: Route) {
  r = normalize(r);
  history.replaceState({ app: 'family', depth: 0, route: r, scroll: window.scrollY || 0 }, '', toHash(r));
}

function saveScroll() {
  const s = history.state;
  if (s && s.app === 'family') history.replaceState({ ...s, scroll: window.scrollY }, '', location.hash || toHash(s.route || emptyRoute()));
}

export function syncFromUi() {
  if (applying || !cfg) return;
  const next = normalize(cfg.snapshot());
  const cur = parse(location.hash);
  if (equal(next, cur)) return;
  saveScroll();
  if (isDeeper(cur, next)) {
    const depth = history.state?.app === 'family' ? (history.state.depth ?? 0) : 0;
    if (depth > 0) {
      applying = true;
      history.back();
      return;
    }
    history.replaceState({ app: 'family', depth: 0, route: next, scroll: 0 }, '', toHash(next));
    return;
  }
  const depth = (history.state?.app === 'family' ? (history.state.depth ?? 0) : 0) + 1;
  history.pushState({ app: 'family', depth, route: next, scroll: 0 }, '', toHash(next));
}

/** In-app back (Cancel, ‹, close sheet). Same path as the system back button. */
export function dismiss() {
  if (!cfg) return;
  if (history.state?.app === 'family' && (history.state.depth ?? 0) > 0) {
    history.back();
    return;
  }
  const p = parent(cfg.snapshot());
  applying = true;
  Promise.resolve(cfg.apply(p)).then(() => {
    history.replaceState({ app: 'family', depth: 0, route: normalize(p), scroll: 0 }, '', toHash(p));
    cfg!.render();
    applying = false;
  });
}

function onPop(ev: PopStateEvent) {
  if (!cfg) return;
  if (cfg.dirty() && !confirm('Discard unsaved changes?')) {
    const now = normalize(cfg.snapshot());
    const depth = (ev.state?.depth ?? 0) + 1;
    history.pushState({ app: 'family', depth, route: now, scroll: 0 }, '', toHash(now));
    return;
  }
  const r = ev.state?.route ? normalize(ev.state.route) : parse(location.hash);
  const scroll = ev.state?.scroll ?? 0;
  applying = true;
  Promise.resolve(cfg.apply(r)).then(() => {
    cfg!.render();
    requestAnimationFrame(() => window.scrollTo(0, scroll));
    applying = false;
  });
}

export function formSnap(f: HTMLFormElement | null) {
  if (!f) return '';
  const fd = new FormData(f);
  const out: string[] = [];
  fd.forEach((v, k) => { if (typeof v === 'string') out.push(k + '=' + v); });
  return out.sort().join('&');
}
