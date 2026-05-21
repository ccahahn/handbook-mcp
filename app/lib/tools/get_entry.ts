import { getEntry } from "../kv";
import type { Entry } from "../schema";

export async function getHandbookEntry(id: string): Promise<Entry | null> {
  return getEntry(id);
}
