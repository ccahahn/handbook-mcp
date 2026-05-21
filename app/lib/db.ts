import { neon } from "@neondatabase/serverless";
import type { Entry } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const namespace = process.env.HANDBOOK_NAMESPACE || "default";

export async function ensureSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      namespace TEXT NOT NULL DEFAULT 'default',
      decision TEXT NOT NULL,
      filing_year TEXT NOT NULL,
      rationale TEXT NOT NULL,
      alternatives TEXT NOT NULL DEFAULT '',
      sources JSONB NOT NULL DEFAULT '[]'::jsonb,
      transcript_blob_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS entries_ns_created_idx ON entries (namespace, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS entries_ns_year_idx ON entries (namespace, filing_year)`;
}

type EntryRow = {
  id: string;
  decision: string;
  filing_year: string;
  rationale: string;
  alternatives: string;
  sources: string[];
  transcript_blob_key: string | null;
  created_at: string | Date;
};

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    decision: row.decision,
    filing_year: row.filing_year,
    rationale: row.rationale,
    alternatives: row.alternatives,
    sources: row.sources,
    transcript_blob_key: row.transcript_blob_key,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export async function putEntry(entry: Entry): Promise<void> {
  await sql`
    INSERT INTO entries (id, namespace, decision, filing_year, rationale, alternatives, sources, transcript_blob_key, created_at)
    VALUES (
      ${entry.id},
      ${namespace},
      ${entry.decision},
      ${entry.filing_year},
      ${entry.rationale},
      ${entry.alternatives},
      ${JSON.stringify(entry.sources)}::jsonb,
      ${entry.transcript_blob_key},
      ${entry.created_at}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function getEntry(id: string): Promise<Entry | null> {
  const rows = (await sql`
    SELECT id, decision, filing_year, rationale, alternatives, sources, transcript_blob_key, created_at
    FROM entries
    WHERE id = ${id} AND namespace = ${namespace}
  `) as EntryRow[];
  if (!rows.length) return null;
  return rowToEntry(rows[0]);
}

export async function listEntries(): Promise<Entry[]> {
  const rows = (await sql`
    SELECT id, decision, filing_year, rationale, alternatives, sources, transcript_blob_key, created_at
    FROM entries
    WHERE namespace = ${namespace}
    ORDER BY created_at DESC
  `) as EntryRow[];
  return rows.map(rowToEntry);
}

export async function searchEntries(query: string): Promise<Entry[]> {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q}%`;
  const rows = (await sql`
    SELECT id, decision, filing_year, rationale, alternatives, sources, transcript_blob_key, created_at
    FROM entries
    WHERE namespace = ${namespace}
      AND (decision ILIKE ${like} OR rationale ILIKE ${like} OR alternatives ILIKE ${like})
    ORDER BY created_at DESC
  `) as EntryRow[];
  return rows.map(rowToEntry);
}
