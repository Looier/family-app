import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, collection, doc, setDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { stripUndefined } from './util';
import { firebaseConfig, FAMILY_ID } from './firebase-config';
import type { SyncAdapter, SyncDoc } from './sync';
import type { HealthEntry, MedList } from './types';
// NOTE: no firebase/analytics import on purpose – no tracking of medical data.
export class FirebaseAdapter implements SyncAdapter {
  name = 'Firebase';
  private auth: Auth; private fs: Firestore;
  constructor() {
    const app = initializeApp(firebaseConfig);
    this.auth = getAuth(app);
    this.fs = initializeFirestore(app, { localCache: persistentLocalCache(), ignoreUndefinedProperties: true });
    // Complete a redirect sign-in if we fell back from a blocked popup.
    getRedirectResult(this.auth).catch(() => { /* no pending redirect */ });
  }
  user() { return this.auth.currentUser?.email ?? null; }
  onAuth(cb: (e: string | null) => void) { onAuthStateChanged(this.auth, u => cb(u?.email ?? null)); }
  async signInGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(this.auth, provider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      // Only fall back when the popup cannot open. A user closing it is not a block.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(this.auth, provider);
        return;
      }
      throw err;
    }
  }
  async signInEmail(email: string, pw: string, create = false) {
    if (create) await createUserWithEmailAndPassword(this.auth, email, pw); else await signInWithEmailAndPassword(this.auth, email, pw);
  }
  async signOut() { await signOut(this.auth); }
  private entries() { return collection(this.fs, 'families', FAMILY_ID, 'healthEntries'); }
  private medsDoc() { return doc(this.fs, 'families', FAMILY_ID, 'config', 'meds'); }
  subscribe(onE: (r: HealthEntry[]) => void, onM: (m: MedList) => void, onErr: (e: unknown) => void) {
    const a = onSnapshot(this.entries(), s => onE(s.docChanges().map(c => ({ ...c.doc.data(), id: c.doc.id }) as HealthEntry)), onErr);
    const b = onSnapshot(this.medsDoc(), s => { if (s.exists()) onM(s.data() as MedList); }, onErr);
    return () => { a(); b(); };
  }
  async pushEntry(e: HealthEntry) { await setDoc(doc(this.entries(), e.id), stripUndefined(JSON.parse(JSON.stringify(e)))); }
  async pushMeds(m: MedList) { await setDoc(this.medsDoc(), stripUndefined(JSON.parse(JSON.stringify(m)))); }
  subscribeCol(col: string, onRows: (r: SyncDoc[]) => void, onErr: (e: unknown) => void) {
    return onSnapshot(collection(this.fs, 'families', FAMILY_ID, col), s => onRows(s.docChanges().map(c => ({ ...c.doc.data(), id: c.doc.id }) as SyncDoc)), onErr);
  }
  async pushDoc(col: string, d: SyncDoc) { await setDoc(doc(this.fs, 'families', FAMILY_ID, col, d.id), stripUndefined(JSON.parse(JSON.stringify(d)))); }
}
