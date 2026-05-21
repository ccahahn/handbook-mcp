import { listEntries } from "@/lib/db";
import { DecisionsTable } from "@/components/DecisionsTable";

export const dynamic = "force-dynamic";

export default async function Page() {
  const entries = await listEntries();
  return (
    <main className="page">
      <header className="page-header">
        <h1 className="page-title">
          Decisions
          <span className="page-title-count">{entries.length} saved</span>
        </h1>
        <p className="page-subtitle">
          Filing choices you saved while talking them through, open one to see
          the reasoning.
        </p>
      </header>

      <div className="card">
        <DecisionsTable entries={entries} />
      </div>

      <footer className="page-footer">
        <a
          href="https://github.com/ccahahn/handbook-mcp"
          target="_blank"
          rel="noopener noreferrer"
        >
          ccahahn/handbook-mcp
        </a>
      </footer>
    </main>
  );
}
