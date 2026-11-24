/** Idempotent, family-wide starter content. Fixed ids + a synced config/seeds doc
 *  mean both phones can run this and never create duplicates or resurrect a
 *  recipe the family already deleted. */
import * as S from '../store';
import type { Recipe } from './meals';

export const RECIPE_SEED_VERSION = 1;

interface SeedDoc { id: string; recipes?: number }

const STARTER_RECIPES: { id: string; title: string; tag: string }[] = [
  { id: 'seed-chicken-wraps', title: 'Chicken wraps', tag: 'Everyday' },
  { id: 'seed-sick-soup', title: 'Sick soup', tag: 'Everyday' },
  { id: 'seed-soup', title: 'Soup', tag: 'Everyday' },
  { id: 'seed-meatballs', title: 'Meatballs', tag: 'Everyday' },
  { id: 'seed-spaghetti-bolognese', title: 'Spaghetti Bolognese', tag: 'Everyday' },
  { id: 'seed-chicken-with-brown-sauce', title: 'Chicken with brown sauce', tag: 'Everyday' },
  { id: 'seed-bacon-and-eggs', title: 'Bacon and eggs', tag: 'Everyday' },
  { id: 'seed-take-aways', title: 'Take aways', tag: 'Everyday' },
  { id: 'seed-burgers', title: 'Burgers', tag: 'Everyday' },
  { id: 'seed-stew', title: 'Stew', tag: 'Everyday' },
  { id: 'seed-pizza', title: 'Pizza', tag: 'Everyday' },
  { id: 'seed-hotdogs', title: 'Hotdogs', tag: 'Everyday' },
  { id: 'seed-steak', title: 'Steak', tag: 'Braai' },
  { id: 'seed-wors', title: 'Wors', tag: 'Braai' },
  { id: 'seed-chops', title: 'Chops', tag: 'Braai' },
  { id: 'seed-chicken-espetada', title: 'Chicken espetada', tag: 'Braai' },
  { id: 'seed-chicken-wings', title: 'Chicken wings', tag: 'Braai' },
  { id: 'seed-ribs', title: 'Ribs', tag: 'Braai' },
];

let inflight: Promise<void> | null = null;

export async function ensureStarterRecipes() {
  if (inflight) return inflight;
  inflight = (async () => {
    const marker = S.getAny<SeedDoc>('config', 'seeds');
    if ((marker?.recipes ?? 0) >= RECIPE_SEED_VERSION) return;
    for (const r of STARTER_RECIPES) {
      // Skip if this seed id already exists, including a soft-deleted copy —
      // the family has already seen it and we must not bring it back.
      if (S.getAny('recipes', r.id)) continue;
      await S.save<Recipe>('recipes', {
        id: r.id,
        title: r.title,
        ingredients: [],
        steps: '',
        tags: [r.tag],
        servings: 0,
      } as Recipe);
    }
    await S.save<SeedDoc>('config', { ...(marker || {}), id: 'seeds', recipes: RECIPE_SEED_VERSION });
  })();
  try { await inflight; } finally { inflight = null; }
}
