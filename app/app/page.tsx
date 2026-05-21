import { listEntries } from "@/lib/db";
import type { Entry } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function HandbookDashboard() {
  const entries = await listEntries();

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32 }}>Handbook</h1>
        <p
          style={{
            color: "var(--muted)",
            marginTop: 8,
            fontSize: 17,
            marginBottom: 0,
          }}
        >
          A reasoning-memory layer for financial decisions. Saved entries
          appear here as Claude captures them.
        </p>
      </header>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <section
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </section>
      )}

      <footer
        style={{
          marginTop: 64,
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        <a
          href="https://github.com/ccahahn/handbook-mcp"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--muted)" }}
        >
          ccahahn/handbook-mcp
        </a>
      </footer>
    </main>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 40,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        textAlign: "center",
        color: "var(--muted)",
      }}
    >
      No entries yet. Add the connector to Claude and save one through a
      conversation.
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const savedDate = new Date(entry.created_at).toISOString().slice(0, 10);
  return (
    <article
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 28,
      }}
    >
      <h2 style={{ fontSize: 22 }}>{entry.decision}</h2>
      <div
        style={{
          color: "var(--muted)",
          fontSize: 13,
          marginTop: 6,
          marginBottom: 20,
        }}
      >
        Filing year {entry.filing_year} · saved {savedDate}
      </div>

      <Section label="Rationale">
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{entry.rationale}</p>
      </Section>

      {entry.alternatives && entry.alternatives.trim().length > 0 && (
        <Section label="Alternatives considered">
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {entry.alternatives}
          </p>
        </Section>
      )}

      {entry.sources && entry.sources.length > 0 && (
        <Section label="Sources">
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            {entry.sources.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      {entry.transcript_blob_key && (
        <div style={{ marginTop: 16 }}>
          <a
            href={entry.transcript_blob_key}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 14 }}
          >
            See full conversation →
          </a>
        </div>
      )}
    </article>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h3
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          color: "var(--muted)",
          marginBottom: 6,
        }}
      >
        {label}
      </h3>
      {children}
    </section>
  );
}
