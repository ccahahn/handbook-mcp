import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import seeds from "@/data/seed_entries.json";
import { putEntry, getEntry, ensureSchema } from "@/lib/db";
import { putTranscript } from "@/lib/blob";
import type { Entry } from "@/lib/schema";

export const dynamic = "force-dynamic";

const SeedEntrySchema = z.object({
  id: z.string(),
  decision: z.string(),
  filing_year: z.string(),
  rationale: z.string(),
  alternatives: z.string(),
  sources: z.array(z.string()),
  transcript: z.string().optional(),
  created_at: z.string(),
});

// Public POST. The route only loads bundled synthetic seeds and is idempotent
// (already-seeded ids are skipped). No user data can be injected from outside,
// so no auth check in v1. Revisit if seed loading ever grows destructive modes.
export async function POST() {
  await ensureSchema();
  const parsedSeeds = z.array(SeedEntrySchema).parse(seeds);
  const results: {
    id: string;
    status: string;
    transcript_url: string | null;
  }[] = [];

  for (const seed of parsedSeeds) {
    const existing = await getEntry(seed.id);
    if (existing) {
      results.push({
        id: seed.id,
        status: "skipped (already exists)",
        transcript_url: existing.transcript_blob_key,
      });
      continue;
    }

    let transcript_blob_key: string | null = null;
    if (seed.transcript && seed.transcript.trim().length > 0) {
      transcript_blob_key = await putTranscript(seed.id, seed.transcript);
    }

    const entry: Entry = {
      id: seed.id,
      decision: seed.decision,
      filing_year: seed.filing_year,
      rationale: seed.rationale,
      alternatives: seed.alternatives,
      sources: seed.sources,
      transcript_blob_key,
      created_at: seed.created_at,
    };
    await putEntry(entry);
    results.push({
      id: seed.id,
      status: "seeded",
      transcript_url: transcript_blob_key,
    });
  }

  revalidatePath("/");
  return NextResponse.json({ count: parsedSeeds.length, results });
}
