// decision.ts contains interfaces for the core data structures used
// throughout the app. Using strong TypeScript types helps catch bugs
// early and makes the code easier to understand.

export interface Criterion {
  id: string;
  name: string;
  weight: number;
  score: number;
}

export interface DecisionOption {
  id: string;
  name: string;
  notes?: string;
  criteria: Criterion[];
  finalScore: number;
}

export interface Decision {
  id: string;
  category: string;
  title: string;
  options: DecisionOption[];
  finalScore: number;
  bestOptionName: string;
}
