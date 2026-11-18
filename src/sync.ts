import type { HealthEntry, MedList } from './types';
export interface SyncDoc { id: string; updatedAt: number; deleted?: boolean }
/** Pluggable sync backend. Swap Firebase for Supabase/self-hosted by implementing this. */
export interface SyncAdapter {
  readonly name: string;
  /** Current signed-in user email or null */
  user(): string | null;
  onAuth(cb: (email: string | null) => void): void;
  signInGoogle(): Promise<void>;
  signInEmail(email: string, pw: string, create?: boolean): Promise<void>;
  signOut(): Promise<void>;
  /** Start live listening; called with remote changes */
  subscribe(onEntries: (rows: HealthEntry[]) => void, onMeds: (m: MedList) => void, onError: (e: unknown) => void): () => void;
  pushEntry(e: HealthEntry): Promise<void>;
  pushMeds(m: MedList): Promise<void>;
  /** generic collections under the family space (events, recipes, mealPlan, todoLists, todos, shopLists, shopItems) */
  subscribeCol(col: string, onRows: (rows: SyncDoc[]) => void, onError: (e: unknown) => void): () => void;
  pushDoc(col: string, d: SyncDoc): Promise<void>;
}
export async function loadAdapter(): Promise<SyncAdapter | null> {
  const { isFirebaseConfigured } = await import('./firebase-config');
  if (!isFirebaseConfigured()) return null;
  const { FirebaseAdapter } = await import('./sync-firebase');
  return new FirebaseAdapter();
}
