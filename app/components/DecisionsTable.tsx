"use client";

import { useMemo, useState } from "react";
import type { Entry } from "@/lib/schema";

type SortOrder = "newest" | "oldest";
type YearFilter = "all" | string;

export function DecisionsTable({ entries }: { entries: Entry[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const years = useMemo(() => {
    const set = new Set(entries.map((e) => e.filing_year));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const filtered = useMemo(() => {
    let rows = entries.slice();
    if (yearFilter !== "all") {
      rows = rows.filter((e) => e.filing_year === yearFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      rows = rows.filter((e) =>
        [e.decision, e.rationale, e.alternatives, ...(e.sources ?? [])].some(
          (field) => field.toLowerCase().includes(q),
        ),
      );
    }
    rows.sort((a, b) => {
      const cmp = a.created_at.localeCompare(b.created_at);
      return sortOrder === "newest" ? -cmp : cmp;
    });
    return rows;
  }, [entries, yearFilter, searchQuery, sortOrder]);

  if (entries.length === 0) {
    return (
      <div className="empty">
        No decisions yet. Add the connector to Claude and save one through a
        conversation.
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="filter-chips">
          <button
            className={`chip ${yearFilter === "all" ? "active" : ""}`}
            onClick={() => setYearFilter("all")}
            type="button"
          >
            All years
          </button>
          {years.map((y) => (
            <button
              key={y}
              className={`chip ${yearFilter === y ? "active" : ""}`}
              onClick={() => setYearFilter(y)}
              type="button"
            >
              {y}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <input
            className="search-input"
            type="search"
            placeholder="Search decisions"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search decisions"
          />
          <select
            className="sort-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            aria-label="Sort order"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <div className="row-header" role="row">
        <span />
        <span>Decision</span>
        <span>Filing year</span>
        <span>Saved</span>
        <span>Transcript</span>
      </div>

      {filtered.map((entry) => {
        const expanded = expandedId === entry.id;
        const toggle = () => setExpandedId(expanded ? null : entry.id);
        return (
          <div key={entry.id} className="row-group">
            <div
              className={`row ${expanded ? "expanded" : ""}`}
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }}
            >
              <span className="row-chevron" aria-hidden>
                ›
              </span>
              <span className="row-decision">{entry.decision}</span>
              <span className="row-year-cell">
                <span className="row-year">{entry.filing_year}</span>
              </span>
              <span className="row-saved">{formatSavedDate(entry.created_at)}</span>
              <span
                className={`row-transcript ${
                  entry.transcript_blob_key ? "" : "empty"
                }`}
              >
                {entry.transcript_blob_key ? (
                  <a
                    className="row-transcript-link"
                    href={entry.transcript_blob_key}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open
                  </a>
                ) : null}
              </span>
            </div>
            {expanded && (
              <div className="row-detail">
                <div className="row-detail-section">
                  <div className="row-detail-label">Reasoning</div>
                  <p className="row-detail-text">{entry.rationale}</p>
                </div>

                {entry.alternatives && entry.alternatives.trim().length > 0 && (
                  <div className="row-detail-section">
                    <div className="row-detail-label">Alternatives considered</div>
                    <p className="row-detail-text">{entry.alternatives}</p>
                  </div>
                )}

                {entry.sources && entry.sources.length > 0 && (
                  <div className="row-detail-section">
                    <div className="row-detail-label">Sources</div>
                    <div className="row-detail-sources">
                      {entry.sources.map((s, i) => (
                        <span key={i} className="source-chip">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.transcript_blob_key && (
                  <a
                    className="cta"
                    href={entry.transcript_blob_key}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    See full conversation
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="empty-inline">No decisions match.</div>
      )}
    </>
  );
}

function formatSavedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
