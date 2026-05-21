import type { Entry } from "./schema";

export type Strength = "strong" | "solid" | "light";

export interface StrengthSignals {
  hasAlternatives: boolean;
  hasSources: boolean;
  hasTranscript: boolean;
}

export function signalsFor(entry: Entry): StrengthSignals {
  return {
    hasAlternatives:
      !!entry.alternatives && entry.alternatives.trim().length > 0,
    hasSources: (entry.sources?.length ?? 0) >= 1,
    hasTranscript: !!entry.transcript_blob_key,
  };
}

export function entryStrength(entry: Entry): Strength {
  const s = signalsFor(entry);
  const score =
    (s.hasAlternatives ? 1 : 0) +
    (s.hasSources ? 1 : 0) +
    (s.hasTranscript ? 1 : 0);
  if (score >= 3) return "strong";
  if (score >= 2) return "solid";
  return "light";
}

export const STRENGTH_LABEL: Record<Strength, string> = {
  strong: "Strong",
  solid: "Solid",
  light: "Light",
};

export const STRENGTH_FILL: Record<Strength, number> = {
  strong: 3,
  solid: 2,
  light: 1,
};

export const STRENGTH_RANK: Record<Strength, number> = {
  strong: 3,
  solid: 2,
  light: 1,
};
