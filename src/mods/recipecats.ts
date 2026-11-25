import * as S from '../store';
export interface RecipeCat { id: string; name: string; order: number }
export const DEFAULT_RECIPE_CATS: RecipeCat[] = [
  { id: 'rc-quick', name: 'Quick', order: 0 },
  { id: 'rc-kids', name: "Kids' favourites", order: 1 },
  { id: 'rc-braai', name: 'Braai', order: 2 },
  { id: 'rc-everyday', name: 'Everyday', order: 3 },
  { id: 'rc-other', name: 'Other', order: 4 },
];
export const recipeCats = () => S.list<RecipeCat>('recipeCats').sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
export async function ensureRecipeCats() {
  if (!S.listAll('recipeCats').length) for (const c of DEFAULT_RECIPE_CATS) await S.seedDefault('recipeCats', { ...c, updatedAt: 1 } as any);
  else for (const c of DEFAULT_RECIPE_CATS) if (!(S.listAll('recipeCats') as RecipeCat[]).some(x => x.id === c.id)) await S.seedDefault('recipeCats', { ...c, updatedAt: 1 } as any);
}
export async function addRecipeCat(name: string) {
  const n = name.trim(); if (!n) return;
  const exist = recipeCats().find(c => c.name.toLowerCase() === n.toLowerCase());
  if (exist) return exist;
  const order = recipeCats().reduce((m, c) => Math.max(m, c.order + 1), 0);
  return S.save<RecipeCat>('recipeCats', { name: n, order } as RecipeCat);
}
/** Map legacy free-text tags onto the shared category names. */
export function normTag(t: string) {
  const x = t.trim().toLowerCase();
  if (x === 'kids' || x === "kid" || x === "kids'") return "Kids' favourites";
  if (x === 'quick') return 'Quick';
  if (x === 'braai') return 'Braai';
  const hit = recipeCats().find(c => c.name.toLowerCase() === x);
  return hit?.name || t.trim();
}

export async function renameRecipeCat(id: string, name: string) {
  const c = recipeCats().find(x => x.id === id); if (!c) return;
  const n = name.trim(); if (!n) return c;
  if (n.toLowerCase() === c.name.toLowerCase()) return await S.save('recipeCats', { ...c, name: n });
  const clash = recipeCats().find(x => x.id !== id && x.name.toLowerCase() === n.toLowerCase());
  if (clash) return clash;
  return S.save('recipeCats', { ...c, name: n });
}
export const defaultMealCat = () => {
  const cats = recipeCats();
  return cats.find(c => c.id === 'rc-everyday' || c.name === 'Everyday')?.name || cats[0]?.name || '';
};
