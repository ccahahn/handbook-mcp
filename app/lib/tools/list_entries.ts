import { listEntries } from "../kv";
import type { Entry } from "../schema";

export async function listHandbookEntries(): Promise<Entry[]> {
  return listEntries();
}
