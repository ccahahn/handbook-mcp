import { Redis } from "@upstash/redis";
import type { Entry } from "./schema";

const redis = Redis.fromEnv();
const namespace = process.env.HANDBOOK_NAMESPACE || "default";

const k = {
  entry: (id: string) => `${namespace}:entry:${id}`,
  byCreatedAt: () => `${namespace}:entries:by_created_at`,
  byYear: (year: string) => `${namespace}:entries:by_filing_year:${year}`,
};

export async function putEntry(entry: Entry): Promise<void> {
  await redis.set(k.entry(entry.id), entry);
  const score = new Date(entry.created_at).getTime();
  await redis.zadd(k.byCreatedAt(), { score, member: entry.id });
  await redis.sadd(k.byYear(entry.filing_year), entry.id);
}

export async function getEntry(id: string): Promise<Entry | null> {
  const entry = await redis.get<Entry>(k.entry(id));
  return entry ?? null;
}

export async function listEntries(): Promise<Entry[]> {
  const ids = (await redis.zrange<string[]>(k.byCreatedAt(), 0, -1, {
    rev: true,
  })) as string[];
  if (!ids?.length) return [];
  const entries = await Promise.all(ids.map((id) => getEntry(id)));
  return entries.filter((e): e is Entry => e !== null);
}

export async function searchEntries(query: string): Promise<Entry[]> {
  const all = await listEntries();
  const q = query.toLowerCase();
  return all.filter((e) =>
    [e.decision, e.rationale, e.alternatives].some((field) =>
      field.toLowerCase().includes(q),
    ),
  );
}
