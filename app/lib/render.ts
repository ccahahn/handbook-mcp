import type { Entry } from "./schema";

export function renderEntryMarkdown(entry: Entry): string {
  const savedDate = new Date(entry.created_at).toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(`# ${entry.decision}`);
  lines.push(`*Filing year ${entry.filing_year} · saved ${savedDate}*`);
  lines.push("");

  lines.push("## Rationale");
  lines.push(entry.rationale);
  lines.push("");

  if (entry.alternatives && entry.alternatives.trim().length > 0) {
    lines.push("## Alternatives considered");
    lines.push(entry.alternatives);
    lines.push("");
  }

  if (entry.sources && entry.sources.length > 0) {
    lines.push("## Sources");
    for (const source of entry.sources) {
      lines.push(`- ${source}`);
    }
    lines.push("");
  }

  if (entry.transcript_blob_key) {
    lines.push("## Source conversation");
    lines.push(`[See full conversation](${entry.transcript_blob_key})`);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
