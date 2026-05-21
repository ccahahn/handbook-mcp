"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Entry } from "@/lib/schema";

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

type EntryState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "ready"; entry: Entry };

type BodyState =
  | { status: "skip" } // entry has no transcript
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; text: string };

export function TranscriptClient({ id }: { id: string }) {
  const [entryState, setEntryState] = useState<EntryState>({
    status: "loading",
  });
  const [bodyState, setBodyState] = useState<BodyState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  // 1. Resolve the entry: sessionStorage first, then API.
  useEffect(() => {
    let cancelled = false;

    const stashed =
      typeof window !== "undefined"
        ? sessionStorage.getItem(`handbook:entry:${id}`)
        : null;
    if (stashed) {
      try {
        const entry = JSON.parse(stashed) as Entry;
        setEntryState({ status: "ready", entry });
        return;
      } catch {
        // fall through to API fetch
      }
    }

    fetch(`/api/entry/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((entry: Entry) => {
        if (!cancelled) setEntryState({ status: "ready", entry });
      })
      .catch(() => {
        if (!cancelled) setEntryState({ status: "not-found" });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 2. Once we have an entry, fetch the transcript text from Blob.
  useEffect(() => {
    if (entryState.status !== "ready") return;
    const { entry } = entryState;
    if (!entry.transcript_blob_key) {
      setBodyState({ status: "skip" });
      return;
    }

    let cancelled = false;
    setBodyState({ status: "loading" });
    fetch(entry.transcript_blob_key)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setBodyState({ status: "ready", text });
      })
      .catch(() => {
        if (!cancelled) setBodyState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [entryState]);

  if (entryState.status === "not-found") {
    return (
      <main className="page">
        <Link href="/" className="transcript-back">
          <BackArrow /> Decisions
        </Link>
        <div className="transcript-error">Decision not found.</div>
      </main>
    );
  }

  if (entryState.status === "loading") {
    return <LoadingShell />;
  }

  const { entry } = entryState;
  const transcriptText =
    bodyState.status === "ready" ? bodyState.text : null;
  return (
    <main className="page">
      <Link href="/" className="transcript-back">
        <BackArrow /> Decisions
      </Link>

      <div className="transcript-header">
        <div className="transcript-title-block">
          <h1>{entry.decision}</h1>
          <div className="transcript-meta">
            Filing year {entry.filing_year} · saved{" "}
            {formatDate(entry.created_at)}
          </div>
        </div>
        <div className="transcript-actions">
          {transcriptText !== null && (
            <button
              type="button"
              className="transcript-action"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(transcriptText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // clipboard may be blocked in some browsers; silently no-op
                }
              }}
            >
              <CopyIcon /> {copied ? "Copied" : "Copy transcript"}
            </button>
          )}
          {entry.transcript_blob_key && (
            <a
              className="transcript-action"
              href={entry.transcript_blob_key}
              download={`${slugify(entry.decision)}.txt`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadIcon /> Download .txt
            </a>
          )}
          <a
            className="transcript-action"
            href="https://claude.ai/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalIcon /> Open Claude
          </a>
        </div>
      </div>

      <Body state={bodyState} />
    </main>
  );
}

function Body({ state }: { state: BodyState }) {
  if (state.status === "skip") {
    return (
      <div className="transcript-error">
        No transcript was saved for this decision.
      </div>
    );
  }
  if (state.status === "loading") {
    return <BodySkeleton />;
  }
  if (state.status === "error") {
    return (
      <div className="transcript-error">
        Couldn&apos;t load the transcript right now. Try refreshing.
      </div>
    );
  }
  const turns = parseTranscript(state.text);
  if (turns.length === 0) {
    return (
      <article className="transcript-body">
        <div className="turn">
          <div className="turn-text">{state.text}</div>
        </div>
      </article>
    );
  }
  return (
    <article className="transcript-body">
      {turns.map((t, i) => (
        <div key={i} className={`turn ${t.speaker.toLowerCase()}`}>
          <div className="turn-speaker">{t.speaker}</div>
          <div className="turn-text">{t.text}</div>
        </div>
      ))}
    </article>
  );
}

function LoadingShell() {
  return (
    <main className="page">
      <Link href="/" className="transcript-back">
        <BackArrow /> Decisions
      </Link>
      <div className="transcript-header">
        <div className="transcript-title-block">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-meta" />
        </div>
      </div>
      <BodySkeleton />
    </main>
  );
}

function BodySkeleton() {
  return (
    <article className="transcript-body">
      <div className="turn">
        <div className="skeleton skeleton-speaker" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
      </div>
      <div className="turn">
        <div className="skeleton skeleton-speaker" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
      </div>
    </article>
  );
}

function BackArrow() {
  return (
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
  );
}

function DownloadIcon() {
  return (
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
  );
}

function CopyIcon() {
  return (
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
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <path d="M2 8V2.5A0.5 0.5 0 0 1 2.5 2H8" />
    </svg>
  );
}

function ExternalIcon() {
  return (
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
      <path d="M5 3H3v6h6V7" />
      <path d="M7 2h3v3M10 2L6 6" />
    </svg>
  );
}
