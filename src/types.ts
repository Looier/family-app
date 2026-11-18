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
}
export const BODY_LOCS = ['Left knee','Right knee','Left hand','Right hand','Left elbow','Right elbow','Left hip','Right hip','Left leg & foot','Right leg & foot','Headache','Neck','Shoulders','Tummy'];
export const DEFAULT_MEDS = ['Telfast','Adco Zetafen','Allergex','Allerway','MTX','Folate','Melatonin','Nurofen','Panado','Stilpaine','Voltaren','Vitamin D Drops','Iron Drops','Avamist','Iliadin'];
export type Sleep = 'Good' | 'Woke up once' | 'Woke up multiple times' | 'Woke up with pain';
export const SLEEP_OPTS: Sleep[] = ['Good', 'Woke up once', 'Woke up multiple times', 'Woke up with pain'];
export interface MedList { meds: string[]; updatedAt: number }
