import { listEntries } from "@/lib/db";
import { Dashboard } from "@/components/Dashboard";

// Cached page. Backstop revalidate of 1 hour; explicit revalidatePath("/") in
// save_to_handbook and /api/init busts the cache as soon as the entry list
// actually changes.
export const revalidate = 3600;

export default async function Page() {
  const entries = await listEntries();
  return <Dashboard entries={entries} />;
}
