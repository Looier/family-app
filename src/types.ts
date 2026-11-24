export type Child = string;
export const CHILDREN: Child[] = ['Phoebe', 'Jocelyn']; // fallback only; live list comes from members
export interface MedDose { name: string; dose: string; time: string }
export type Appetite = 'good' | 'ok' | 'poor' | 'none';
export const APPETITE_OPTS: { id: Appetite; label: string }[] = [
  { id: 'good', label: 'Good' }, { id: 'ok', label: 'OK' }, { id: 'poor', label: 'Poor' }, { id: 'none', label: 'None' },
];
export interface HealthEntry {
  id: string; child: Child; date: string; // YYYY-MM-DD; child is the person's name
  ts: number; mood: number | null; pain: number | null; /* null = nothing reported */ painLocs: string[];
  sleep?: Sleep | null; tired?: boolean; emotional?: boolean; nauseous?: boolean;
  rash: boolean; rashWhere: string; rashLocs: string[]; constipated: boolean;
  meds: string[]; notes: string; author?: string; updatedAt: number; deleted?: boolean;
  // v2.2 additive fields (absent on older records)
  memberId?: string;
  fever?: boolean; temp?: number | null;
  tummy?: boolean; cough?: boolean; runnyNose?: boolean;
  appetite?: Appetite | null;
  medDoses?: MedDose[];
  /** true when pain was logged, even if no severity number was given */
  hasPain?: boolean;
  /** Free-text pain detail, e.g. 'knee, not sure which' */
  painDetail?: string;
}
/** Legacy body-map labels; kept so older entries still display. */
export const BODY_LOCS = ['Left knee','Right knee','Left hand','Right hand','Left elbow','Right elbow','Left hip','Right hip','Left leg & foot','Right leg & foot','Headache','Neck','Shoulders','Tummy'];
/** Quick-pick pain locations (plus free-text detail on the form). */
export const PAIN_LOCS = ['Head', 'Throat', 'Ear', 'Tummy', 'Back', 'Knee', 'Leg', 'Arm', 'Other', 'Not sure where'];
export function isPainOn(e: { hasPain?: boolean; pain?: number | null; painLocs?: string[]; painDetail?: string }) {
  return !!(e.hasPain || (e.pain != null && e.pain > 0) || (e.painLocs && e.painLocs.length) || (e.painDetail || '').trim());
}
export function painLocOptions(current: string[] = []) {
  const extra = current.filter(x => x && !PAIN_LOCS.includes(x));
  return [...PAIN_LOCS, ...extra];
}
export const DEFAULT_MEDS = ['Telfast','Adco Zetafen','Allergex','Allerway','MTX','Folate','Melatonin','Nurofen','Panado','Stilpaine','Voltaren','Vitamin D Drops','Iron Drops','Avamist','Iliadin'];
export type Sleep = 'Good' | 'Woke up once' | 'Woke up multiple times' | 'Woke up with pain';
export const SLEEP_OPTS: Sleep[] = ['Good', 'Woke up once', 'Woke up multiple times', 'Woke up with pain'];
export interface MedList { meds: string[]; updatedAt: number }
