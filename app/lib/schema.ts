import { z } from "zod";

export const EntryInputSchema = z.object({
  decision: z.string().min(1, "decision must not be empty"),
  filing_year: z.string().regex(/^\d{4}$/, "filing_year must be a 4-digit year"),
  rationale: z.string().min(1, "rationale must not be empty"),
  alternatives: z.string().default(""),
  sources: z.array(z.string()).default([]),
  transcript: z.string().optional(),
});
export type EntryInput = z.infer<typeof EntryInputSchema>;

export const EntrySchema = z.object({
  id: z.string(),
  decision: z.string(),
  filing_year: z.string(),
  rationale: z.string(),
  alternatives: z.string(),
  sources: z.array(z.string()),
  transcript_blob_key: z.string().nullable(),
  created_at: z.string(),
});
export type Entry = z.infer<typeof EntrySchema>;
