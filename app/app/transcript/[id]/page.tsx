import { notFound } from "next/navigation";
import Link from "next/link";
import { getEntry } from "@/lib/db";
import type { Entry } from "@/lib/schema";

// Transcripts are immutable per design — once saved, the conversation is
// frozen. Cache the page forever; each unique [id] gets statically rendered
// on first visit and served from cache thereafter.
export const revalidate = false;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function parseTranscript(text: string): { speaker: string; text: string }[] {
  const matches = [
    ...text.matchAll(
      /\[(User|Claude)\]\s*([\s\S]*?)(?=\[(?:User|Claude)\]|$)/g,
    ),
  ];
  return matches.map((m) => ({ speaker: m[1], text: m[2].trim() }));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default async function TranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) notFound();

  if (!entry.transcript_blob_key) {
    return <TranscriptShell entry={entry} body={<NoTranscript />} />;
  }

  let transcript = "";
  let fetchOk = true;
  try {
    const res = await fetch(entry.transcript_blob_key, { cache: "force-cache" });
    if (!res.ok) {
      fetchOk = false;
    } else {
      transcript = await res.text();
    }
  } catch {
    fetchOk = false;
  }

  if (!fetchOk) {
    return <TranscriptShell entry={entry} body={<FetchFailed />} />;
  }

  const turns = parseTranscript(transcript);
  const body =
    turns.length === 0 ? (
      <article className="transcript-body">
        <div className="turn">
          <div className="turn-text">{transcript}</div>
        </div>
      </article>
    ) : (
      <article className="transcript-body">
        {turns.map((t, i) => (
          <div key={i} className={`turn ${t.speaker.toLowerCase()}`}>
            <div className="turn-speaker">{t.speaker}</div>
            <div className="turn-text">{t.text}</div>
          </div>
        ))}
      </article>
    );

  return (
    <TranscriptShell
      entry={entry}
      body={body}
      downloadHref={entry.transcript_blob_key}
      downloadName={`${slugify(entry.decision)}.txt`}
    />
  );
}

function TranscriptShell({
  entry,
  body,
  downloadHref,
  downloadName,
}: {
  entry: Entry;
  body: React.ReactNode;
  downloadHref?: string;
  downloadName?: string;
}) {
  return (
    <main className="page">
      <Link href="/" className="transcript-back">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 3L4 6l3 3" />
        </svg>
        Decisions
      </Link>

      <div className="transcript-header">
        <div className="transcript-title-block">
          <h1>{entry.decision}</h1>
          <div className="transcript-meta">
            Filing year {entry.filing_year} · saved{" "}
            {formatDate(entry.created_at)}
          </div>
        </div>
        {downloadHref && (
          <a
            className="transcript-download"
            href={downloadHref}
            download={downloadName}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2v6m-3-3l3 3 3-3M2 10h8" />
            </svg>
            Download .txt
          </a>
        )}
      </div>

      {body}
    </main>
  );
}

function NoTranscript() {
  return (
    <div className="transcript-error">
      No transcript was saved for this decision.
    </div>
  );
}

function FetchFailed() {
  return (
    <div className="transcript-error">
      Couldn&apos;t load the transcript right now. Try refreshing the page.
    </div>
  );
}
