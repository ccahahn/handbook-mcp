import { listEntries } from "@/lib/db";
import { Dashboard } from "@/components/Dashboard";

// Always fresh. listEntries is one cheap Postgres query; for a sparse-traffic
// demo this is far simpler than juggling cache invalidation from the MCP tool.
export const dynamic = "force-dynamic";

export default async function Page() {
  const entries = await listEntries();
  return <Dashboard entries={entries} />;
}
