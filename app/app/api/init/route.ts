import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import seeds from "@/data/seed_entries.json";
import { putEntry, getEntry } from "@/lib/kv";
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

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  if (!process.env.INIT_SECRET || provided !== process.env.INIT_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({ count: parsedSeeds.length, results });
}
