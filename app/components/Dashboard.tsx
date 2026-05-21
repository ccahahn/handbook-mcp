"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Entry } from "@/lib/schema";

type SortOrder = "newest" | "oldest";

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

export function Dashboard({ entries }: { entries: Entry[] }) {
  const [year, setYear] = useState<"all" | string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const years = useMemo(() => {
    const set = new Set(entries.map((e) => e.filing_year));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const visible = useMemo(() => {
    let list = entries.slice();
    if (year !== "all") list = list.filter((e) => e.filing_year === year);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.decision.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const dir = a.created_at < b.created_at ? 1 : -1;
      return sort === "newest" ? dir : -dir;
    });
    return list;
  }, [entries, year, search, sort]);

  const totalBase = entries.length;
  const filtering = year !== "all" || !!search.trim();
  const countLabel =
    totalBase === 0
      ? ""
      : filtering
        ? `${visible.length} of ${totalBase}`
        : `${totalBase} saved`;

  const toggleOpen = (id: string) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenIds(next);
  };

  const clearFilters = () => {
    setYear("all");
    setSearch("");
  };

  return (
    <main className="page">
      <div className="page-head">
        <h1>Decisions</h1>
        <span className="count">{countLabel}</span>
      </div>
      <p className="subtle">
        Filing choices you saved while talking them through, open one to see
        the reasoning.
      </p>

      {totalBase > 0 && (
        <div className="toolbar">
          <div
            className="years"
            role="group"
            aria-label="Filter by filing year"
          >
            <button
              type="button"
              aria-pressed={year === "all"}
              onClick={() => setYear("all")}
            >
              All years
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                aria-pressed={year === y}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="tools">
            <label className="search">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                stroke="#8a93a0"
                strokeWidth="1.7"
              >
                <circle cx="6.5" cy="6.5" r="4.3" />
                <path d="M9.8 9.8L13 13" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search decisions"
                aria-label="Search decisions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              className="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
              aria-label="Sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      )}

      <div className="panel">
        {totalBase === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <NoResultsState onClear={clearFilters} />
        ) : (
          <>
            <div className="thead">
              <div className="grid">
                <span />
                <span>Decision</span>
                <span>Year</span>
                <span>Saved</span>
                <span>Transcript</span>
              </div>
            </div>
            <div>
              {visible.map((entry) => (
                <Row
                  key={entry.id}
                  entry={entry}
                  open={openIds.has(entry.id)}
                  onToggle={() => toggleOpen(entry.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// Detect bullet-style content (lines starting with - or *) and split into items.
// Returns null if the text isn't bullet-formatted (so the renderer falls back
// to paragraph rendering).
function asBullets(text: string): string[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  const looksLikeList = lines.every((l) => /^[-*]\s+/.test(l));
  if (!looksLikeList) return null;
  return lines.map((l) => l.replace(/^[-*]\s+/, ""));
}

// Parse a source string into { label, url } when it contains a URL.
// Returns null when no URL is present — those sources are hidden in the UI.
function parseSource(text: string): { label: string; url: string } | null {
  const urlMatch = text.match(/https?:\/\/[^\s)]+/);
  if (!urlMatch) return null;
  const url = urlMatch[0];
  let label = text.replace(url, "").trim();
  label = label.replace(/^[\s\-:,()|—]+|[\s\-:,()|—]+$/g, "").trim();
  if (!label) {
    try {
      label = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      label = url;
    }
  }
  return { label, url };
}

function Row({
  entry,
  open,
  onToggle,
}: {
  entry: Entry;
  open: boolean;
  onToggle: () => void;
}) {
  const hasAlternatives =
    !!entry.alternatives && entry.alternatives.trim().length > 0;
  const linkedSources = (entry.sources ?? [])
    .map(parseSource)
    .filter((s): s is { label: string; url: string } => s !== null);
  const hasSources = linkedSources.length > 0;
  const hasTranscript = !!entry.transcript_blob_key;
  const transcriptHref = hasTranscript ? `/transcript/${entry.id}` : null;

  const rationaleBullets = asBullets(entry.rationale);
  const alternativesBullets = hasAlternatives
    ? asBullets(entry.alternatives)
    : null;

  const stashEntry = () => {
    try {
      sessionStorage.setItem(
        `handbook:entry:${entry.id}`,
        JSON.stringify(entry),
      );
    } catch {
      // sessionStorage can fail in private mode; transcript page falls back to API
    }
  };

  return (
    <div className={`row ${open ? "open" : ""}`}>
      <div
        className="row-main"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="grid">
          <span className="chev" aria-hidden>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 3l4 4-4 4" />
            </svg>
          </span>
          <span className="decision">{entry.decision}</span>
          <span className="yr-cell">
            <span className="year-chip">{entry.filing_year}</span>
          </span>
          <span className="saved">{formatDate(entry.created_at)}</span>
          <span className="tr-cell">
            {transcriptHref ? (
              <Link
                className="tr-link"
                href={transcriptHref}
                onClick={(e) => {
                  e.stopPropagation();
                  stashEntry();
                }}
              >
                Open
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M3 5.5h5M5.5 3l2.5 2.5L5.5 8" />
                </svg>
              </Link>
            ) : (
              <span className="tr-none"></span>
            )}
          </span>
        </div>
      </div>
      <div className="detail">
        <div className="detail-inner">
          <div className="detail-pad">
            <div className="field">
              <div className="field-label">Reasoning</div>
              {rationaleBullets ? (
                <ul className="field-list">
                  {rationaleBullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : (
                <div className="field-body">{entry.rationale}</div>
              )}
            </div>
            <div className="field">
              <div className="field-label">Alternatives considered</div>
              {hasAlternatives ? (
                alternativesBullets ? (
                  <ul className="field-list">
                    {alternativesBullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="field-body">{entry.alternatives}</div>
                )
              ) : (
                <div className="field-body none">No alternatives recorded.</div>
              )}
            </div>
            {hasSources && (
              <div className="field">
                <div className="field-label">Sources</div>
                <div className="src-row">
                  {linkedSources.map((s, i) => (
                    <a
                      key={i}
                      className="src src-link"
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {s.label}
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 11 11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        aria-hidden
                      >
                        <path d="M3 5.5h5M5.5 3l2.5 2.5L5.5 8" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="detail-foot">
              {transcriptHref ? (
                <Link
                  className="btn-transcript"
                  href={transcriptHref}
                  onClick={stashEntry}
                >
                  See full conversation
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M3 6h6M6 3l3 3-3 3" />
                  </svg>
                </Link>
              ) : (
                <span className="foot-none">
                  Transcript not saved for this decision.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="placeholder">
      <div className="ph-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1E7A12"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      </div>
      <h2>No decisions yet</h2>
      <p>When you save a filing decision in a conversation, it shows up here.</p>
    </div>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="placeholder">
      <div className="ph-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1E7A12"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </div>
      <h2>No decisions match</h2>
      <p>Try a different filing year or search term.</p>
      <button type="button" className="link-btn" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}
