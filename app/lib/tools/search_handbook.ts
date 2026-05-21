import { searchEntries } from "../kv";
import type { Entry } from "../schema";

export async function searchHandbook(query: string): Promise<Entry[]> {
  const q = query.trim();
  if (!q) return [];
  return searchEntries(q);
}
