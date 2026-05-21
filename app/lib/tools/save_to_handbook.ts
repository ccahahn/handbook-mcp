import { EntryInputSchema, type Entry, type EntryInput } from "../schema";
import { putEntry } from "../db";
import { putTranscript } from "../blob";
import { renderEntryMarkdown } from "../render";

export interface SaveResult {
  entry: Entry;
  markdown: string;
  transcript_url: string | null;
}

export async function saveToHandbook(input: EntryInput): Promise<SaveResult> {
  const validated = EntryInputSchema.parse(input);
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  let transcript_blob_key: string | null = null;
  if (validated.transcript && validated.transcript.trim().length > 0) {
    transcript_blob_key = await putTranscript(id, validated.transcript);
  }

  const entry: Entry = {
    id,
    decision: validated.decision,
    filing_year: validated.filing_year,
    rationale: validated.rationale,
    alternatives: validated.alternatives ?? "",
    sources: validated.sources ?? [],
    transcript_blob_key,
    created_at,
  };

  await putEntry(entry);
  const markdown = renderEntryMarkdown(entry);

  return { entry, markdown, transcript_url: transcript_blob_key };
}
