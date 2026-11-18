export type Nav = { tab?: string; view?: string; id?: string };
export interface Module {
  tabs: () => [string, string][]; tab: () => string; setTab: (t: string) => void;
  render: () => string;
  click: (b: HTMLElement) => Promise<boolean> | boolean;
  submit?: (f: HTMLFormElement) => Promise<void>;
  change?: (t: HTMLInputElement) => Promise<boolean> | boolean;
  nav?: () => Nav;
  applyNav?: (n: Nav) => void;
}
