import { listEntries } from "@/lib/db";
import { Dashboard } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const entries = await listEntries();
  return <Dashboard entries={entries} />;
}
