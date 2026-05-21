"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Entry } from "@/lib/schema";
import {
  entryStrength,
  signalsFor,
  STRENGTH_LABEL,
  STRENGTH_FILL,
  STRENGTH_RANK,
  type Strength,
} from "@/lib/strength";

type Preview = "real" | "empty" | "one" | "many";
type SortOrder = "newest" | "oldest" | "strong" | "attention";

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
  const [preview, setPreview] = useState<Preview>("real");
  const [year, setYear] = useState<"all" | string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const baseEntries = useMemo(() => {
    if (preview === "empty") return [];
    if (preview === "one") return entries.slice(0, 1);
    return entries;
  }, [entries, preview]);

  const years = useMemo(() => {
    const set = new Set(baseEntries.map((e) => e.filing_year));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [baseEntries]);

  const visible = useMemo(() => {
    let list = baseEntries.slice();
    if (year !== "all") list = list.filter((e) => e.filing_year === year);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.decision.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const dir = a.created_at < b.created_at ? 1 : -1;
      if (sort === "newest") return dir;
      if (sort === "oldest") return -dir;
      const byStrength =
        STRENGTH_RANK[entryStrength(b)] - STRENGTH_RANK[entryStrength(a)];
      if (sort === "strong") return byStrength !== 0 ? byStrength : dir;
      return -byStrength !== 0 ? -byStrength : dir;
    });
    return list;
  }, [baseEntries, year, search, sort]);

  const totalBase = baseEntries.length;
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

  const previewButtons: { state: Preview; label: string }[] = [
    { state: "empty", label: "Empty" },
    { state: "one", label: "1 entry" },
    { state: "many", label: "Many" },
  ];

  return (
    <>
      <header className="appbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2.5 7.4l3 3 6-6.5"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Handbook
        </div>
        <div className="appbar-right">
          <div className="preview" role="group" aria-label="Preview state">
            <span className="pv-label">Preview</span>
            {previewButtons.map((p) => (
              <button
                key={p.state}
                type="button"
                aria-pressed={preview === p.state}
                onClick={() => {
                  setPreview(p.state);
                  setOpenIds(new Set());
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="avatar" aria-hidden>
            JD
          </div>
        </div>
      </header>

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
                <option value="strong">Strongest first</option>
                <option value="attention">Needs attention first</option>
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
                  <span
                    title="How well-reasoned and documented this decision is"
                  >
                    Strength
                  </span>
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
    </>
  );
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
  const strength = entryStrength(entry);
  const sig = signalsFor(entry);
  const transcriptHref = sig.hasTranscript ? `/transcript/${entry.id}` : null;

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
          <span>
            <StrengthMeter strength={strength} />
          </span>
          <span className="yr-cell">
            <span className="year-chip">{entry.filing_year}</span>
          </span>
          <span className="saved">{formatDate(entry.created_at)}</span>
          <span className="tr-cell">
            {transcriptHref ? (
              <Link
                className="tr-link"
                href={transcriptHref}
                onClick={(e) => e.stopPropagation()}
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
              <span className="tr-none">&mdash;</span>
            )}
          </span>
        </div>
      </div>
      <div className="detail">
        <div className="detail-inner">
          <div className="detail-pad">
            <div className="field">
              <div className="field-label">Reasoning</div>
              <div className="field-body">{entry.rationale}</div>
            </div>
            <div className="field">
              <div className="field-label">Alternatives considered</div>
              {sig.hasAlternatives ? (
                <div className="field-body">{entry.alternatives}</div>
              ) : (
                <div className="field-body none">No alternatives recorded.</div>
              )}
            </div>
            <div className="field">
              <div className="field-label">Sources</div>
              {sig.hasSources ? (
                <div className="src-row">
                  {entry.sources.map((s, i) => (
                    <span key={i} className="src">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="field-body none">No sources cited.</div>
              )}
            </div>
            <div className="field">
              <div className="rating-head">
                <span className="field-label" style={{ margin: 0 }}>
                  Why this rating
                </span>
                <StrengthMeter strength={strength} />
              </div>
              <div className="signals">
                <Signal
                  ok={sig.hasAlternatives}
                  yes="Alternatives weighed"
                  no="No alternatives weighed"
                />
                <Signal
                  ok={sig.hasSources}
                  yes={`${entry.sources.length} ${entry.sources.length === 1 ? "source" : "sources"} cited`}
                  no="No sources"
                />
                <Signal
                  ok={sig.hasTranscript}
                  yes="Transcript saved"
                  no="Transcript not saved"
                />
              </div>
            </div>
            <div className="detail-foot">
              {transcriptHref ? (
                <Link className="btn-transcript" href={transcriptHref}>
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

function StrengthMeter({ strength }: { strength: Strength }) {
  const fill = STRENGTH_FILL[strength];
  return (
    <span
      className={`strength s-${strength}`}
      aria-label={`Decision strength: ${STRENGTH_LABEL[strength]}`}
    >
      <span className="meter" aria-hidden>
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= fill ? "on" : ""} />
        ))}
      </span>
      <span className="s-word">{STRENGTH_LABEL[strength]}</span>
    </span>
  );
}

function Signal({
  ok,
  yes,
  no,
}: {
  ok: boolean;
  yes: string;
  no: string;
}) {
  return (
    <span className={`sig ${ok ? "yes" : "no"}`}>
      <span className="ic">{ok ? "✓" : "–"}</span>
      {ok ? yes : no}
    </span>
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
