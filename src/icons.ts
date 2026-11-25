import { PCOL } from './util';
const P: Record<string, string> = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  health: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8 11h2l1-2 2 4 1-2h2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.4"/>',
  meals: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4"/>',
  todos: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/>',
  shopping: '<path d="M3 4h2l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', chev: '<path d="M9 6l6 6-6 6"/>',
  sliders: '<path d="M4 8h16M4 16h16M10 6v4M16 14v4"/>',
  plan: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3M13 14h3M8 17h8"/>',
  more: '<circle cx="6" cy="6" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="6" r="1.7" fill="currentColor" stroke="none"/><circle cx="18" cy="6" r="1.7" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="6" cy="18" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="1.7" fill="currentColor" stroke="none"/><circle cx="18" cy="18" r="1.7" fill="currentColor" stroke="none"/>',
  notes: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  wishes: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11v10M7 11c0-3 2.5-5 5-2 2.5-3 5-1 5 2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',

};
export const icon = (n: string, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] ?? ''}</svg>`;
export const avatar = (name: string, cls = '') => {
  const n = name || 'Unassigned';
  const col = PCOL[n] ?? '#8a8078';
  const letter = n === 'Family' || n === 'Both' ? '★' : n === 'Unassigned' ? '?' : n.slice(0, 1);
  return `<span class="av av-${n.replace(/[^A-Za-z0-9_-]/g, '')} ${cls}" style="--pc:${col}" aria-hidden="true">${letter}</span>`;
};

export const MOOD_FACE = ['😭', '😢', '😟', '🙁', '😐', '🙂', '😊', '😄', '😁', '🤩'];
export const CAT_ICON: Record<string, string> = { 'Fruit & veg': '🥦', 'Meat & fish': '🥩', 'Dairy & eggs': '🧀', Bakery: '🥖', Pantry: '🥫', Frozen: '🧊', Drinks: '🧃', Snacks: '🍪', 'Baby & kids': '🧸', 'Health & pharmacy': '💊', 'Household & cleaning': '🧽', Toiletries: '🧴', Other: '🛍️' };
