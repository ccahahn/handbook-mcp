## System overview

Handbook ships as a Model Context Protocol (MCP) connector: a hosted server the user adds to Claude once. The connector exposes four tools (`save_to_handbook`, `search_handbook`, `get_entry`, `list_entries`) and a server-level instruction block that tells Claude when to offer a save and how to capture reasoning faithfully. Saved entries live in a Upstash Redis store behind the connector. Alongside each entry, the full source conversation is stored in Vercel Blob so the user can return to the original thread. Entries are also mirrored as plain-markdown files in the user's CoWork workspace.

```
┌────────────────────────────────────────────────────────────┐
│                Claude (with Handbook connector)             │
│                                                             │
│   user articulates ──► Claude offers ──► user confirms      │
│   reasoning           save + transcript   (one consent      │
│                       (per server         covers both)      │
│                        instructions)                        │
└────────────────────────────────┬───────────────────────────┘
                                 │ tool calls
                ┌────────────────┴──────────────────┐
                │   MCP connector (Vercel, serverless)│
                │                                     │
                │   save_to_handbook                  │
                │   search_handbook                   │
                │   get_entry                         │
                │   list_entries                      │
                └────┬───────────────┬───────────────┬┘
                     │               │               │
              ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼─────────────┐
              │  Upstash Redis   │ │ Vercel Blob │ │  Markdown render   │
              │  (entries:   │ │ (full        │ │  (returned inline; │
              │   system of  │ │  transcripts)│ │   Claude writes    │
              │   record)    │ │              │ │   to CoWork)       │
              └─────────────┘ └─────────────┘ └────────────────────┘
```

The demo is single-tenant. One connector deployment, one user, one KV namespace. Multi-user identity is documented under infrastructure proposals, not built.

## Components

- **MCP connector (`/app`)** — a Vercel serverless project exposing the four tools over the MCP protocol. The connector holds the server-level instructions that bias Claude toward offering saves at contested decisions and capturing only what the user actually said. Stateless per invocation; all persistence is in KV and Blob.
- **Upstash Redis** — the system of record for entries. Provisioned through the Vercel Marketplace (Vercel KV was deprecated in Dec 2024 and migrated to Upstash). Stores entries keyed by id, with a secondary index (sorted set) by `created_at` for `list_entries`, and a hash by `filing_year` for filtered retrieval. Each entry holds a `transcript_blob_key` pointing into Vercel Blob.
- **Vercel Blob** — durable object storage for the full source conversation transcript that accompanies each entry. Transcripts are written here so the user can return to the unedited thread later, independent of claude.ai retention. KV holds the entry's curated reasoning; Blob holds the raw record. User must consent to saving full record. 
- **CoWork markdown mirror** — when the user requests a view or write after a save, the connector returns a markdown rendering inline and Claude writes it to CoWork using CoWork's own file write capability. The mirrored markdown includes a link to the transcript blob. The connector does not push to CoWork directly; the markdown crosses the boundary in the tool response.
- **Synthetic seed entries (`/app/data/seed_entries.json`)** — a small set of pre-populated entries that demonstrate retrieval against multi-year reasoning. Loaded into KV on first deploy via a one-shot init route. Each seed entry pairs with a synthetic transcript stored in Blob.

## Data flow

**Save flow.** A single save moves through the system like this:

1. **Conversation.** The user is working through a tax judgment call with Claude. The Handbook connector is active, so its tools and server-level instructions are in Claude's context.
2. **Offer.** Once the user has articulated a decision and the reasoning behind it, Claude offers a save in plain language and bundles the transcript ask into the same offer: "want me to put this in your Handbook?" The connector does not trigger this; the server-level instructions bias Claude toward offering at this moment.
3. **Confirm.** The user confirms once, which covers the curated entry. Claude calls `save_to_handbook` with the decision, rationale in the user's words, alternatives weighed, and the sources cited. 
4. **Write transcript.** Claude then asks if they want to save the full transcript. If yes, the connector writes the transcript to Vercel Blob first and gets back a blob key. Blob-first ordering means a downstream KV failure leaves only a harmless orphan blob, not an entry pointing to nothing. The full conversation transcript is saved as a string parameter.
5. **Write entry.** The connector validates the entry payload against the schema, generates an id and timestamp, attaches the blob key, writes the entry to KV, and updates the `created_at` and `filing_year` indexes.
6. **Render.** The connector returns the saved entry, the transcript URL of the chat, and the markdown rendering in the tool response.
7. **Mirror.** Claude takes the markdown and writes it to a file in CoWork, naming it by decision title and filing year. The markdown includes a "see full conversation" link to the transcript blob.

**Retrieval flow.** Retrieval is user-initiated. The user explicitly references the Handbook ("did I do this last year?", "what did I decide about X?") and the flow proceeds:

1. **Query.** Claude calls `search_handbook(query)` with a natural-language description of what the user just asked about.
2. **Lookup.** The connector runs a similarity search over entry decisions and rationales in KV and returns the top matches with their metadata.
3. **Present.** Claude summarizes the prior entry to the user as a past judgment to re-examine, not as a current answer. Filing year and timestamp are surfaced so the user knows how stale the precedent is.

## Connector tools

- `save_to_handbook(decision, rationale, alternatives, sources, transcript)` — writes a user-confirmed entry to KV and the full conversation transcript to Blob; returns the entry (including the transcript URL) and its markdown rendering.
- `search_handbook(query)` — on-demand similarity search for relevant prior entries.
- `get_entry(id)` — full entry by id.
- `list_entries()` — for browsing the Handbook.

## Models / prompts

There is no separate model the connector calls. The "prompt" is the connector's server-level instructions plus the tool descriptions, which together shape how Claude offers saves and uses the tools. These live in [`/docs/model-specs/handbook-connector.md`](../model-specs/handbook-connector.md) and are the behavioral contract for the connector. When editing the tool descriptions in code, edit the spec in lockstep.

## Entry schema

Saved entries share one schema:

| Field | Type | Notes |
|---|---|---|
| `id` | string | uuid |
| `decision` | string | short title |
| `filing_year` | string | e.g. "2025" |
| `rationale` | string | the why, in the user's words |
| `alternatives` | string | what was weighed and rejected |
| `sources` | string[] | guidance the user relied on |
| `transcript_blob_key` | string \| null | key into Vercel Blob for the full source conversation; null when the user declines the second consent |
| `created_at` | timestamp | ISO 8601 |

Validated on write. Missing required fields, empty rationale, or empty decision is rejected before the Redis write. `transcript_blob_key` is optional: the user gives a separate consent for the transcript after confirming the entry, and may decline.

## Synthetic data

Synthetic is the default for prototypes([`feedback_synthetic_data_prototypes`](memory)).

Each conversation is formatted into the entry schema and saved as a seed. Planned shape:

- **6 to 10 seed entries** spanning at least two filing years, so retrieval can demonstrate "same decision recurring next year."
- **Each entry tied to a failure mode** the spec calls out — at least one contested judgment call (good fit for offer-timing eval), at least one entry whose underlying rule has since changed (stale precedent), at least one where alternatives were explicitly weighed (good fit for capture-fidelity eval).
- **Content is verbatim where possible.** The seed populates `rationale` and `alternatives` with the user's actual words from the source conversation, not paraphrase. This matters because capture fidelity is a core eval dimension and the seed needs to model the bar.
## External dependencies

- **Vercel** — hosting for the connector (serverless functions) and storage. Needs a Vercel project with the Upstash Redis and Vercel Blob marketplace integrations enabled.
- **Upstash Redis** — system of record for entries (Vercel KV's successor). Free tier is sufficient for demo scale.
- **Vercel Blob** — durable object storage for full source transcripts. Free tier is sufficient for demo scale.
- **Claude / MCP** — the connector is added to Claude as a custom MCP connector. No Anthropic API key is required inside the connector itself; Claude is the caller.
- **CoWork** — Claude writes markdown to the user's CoWork workspace using CoWork's own file capability. The connector does not call CoWork directly.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | — | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | — | Upstash Redis auth token |
| `BLOB_READ_WRITE_TOKEN` | — | Vercel Blob read/write token |
| `HANDBOOK_NAMESPACE` | `default` | Redis and Blob key prefix; lets the same instance back multiple deployments without collision |
| `INIT_SECRET` | — | shared secret required to invoke the seed-loader init route |

No auth tokens for end users. The demo connector is single-tenant by deployment.

## Guardrails

The strategy spec splits failure modes into ones prevented by architecture and ones managed by eval.

**Prevented by architecture.**

- **Autonomous writes.** The connector only writes when `save_to_handbook` is called, which Claude only calls after explicit user confirmation per the server-level instructions. There is no scheduled job, no background save, no inferred write.
- **Schema violations.** Every write goes through a validator that enforces required fields (`decision`, `rationale`, `filing_year`) and types. Malformed payloads are rejected before touching KV. Transcript url and transcript blob are optional. 
- **Orphaned entries.** Save flow writes the transcript to Blob first, then the entry to KV. A KV failure leaves a harmless orphan blob; a Blob failure prevents the KV write entirely. There is no state where an entry references a transcript that does not exist.
- **Cross-user leakage.** Single-tenant by deployment. There is no user id on entries because there is no user model; one deployment serves one user. If a second user were added later, the architecture would require an identity layer first (see infrastructure proposals).
- **Silent overwrite.** Entry ids are server-generated. Claude cannot supply an id on `save_to_handbook`, so it cannot accidentally overwrite a prior entry by reusing one.

**Caught by eval.**

- **Fictional record.** Claude infers plausible alternatives or reasoning the user never expressed. Reviewed against conversation transcripts (and now directly against the stored Blob transcript itself).
- **Transcript drift.** Claude summarizes, reshapes, or truncates the transcript instead of capturing it verbatim. The transcript is meant to be the durable, faithful record; summarization defeats the point. Eval reads the stored transcript against the original conversation.
- **Offer timing.** Does Claude offer saves at genuinely contested decisions and stay quiet otherwise? Measured from accept/decline patterns and transcript review.
- **Retrieval relevance.** When a related decision recurs, does `search_handbook` surface the right prior entry?
- **Stale precedent.** Entries are timestamped and labeled with filing year, and retrieval presents an entry as a past decision to re-examine. Detecting law deltas is a verification concern and lives in the separate Checker spec, which is out of scope here.

This split will move as testing reveals which guardrails actually hold. Expect items to migrate from "caught by eval" into "prevented by architecture" as failure modes surface concretely enough to validate against.

## Failure modes

- **Fictional record.** Claude infers plausible alternatives and reasoning the user never actually had; the user confirms because the narrative sounds right, and a year later re-reads the reconstruction as their own memory.
  - *Mitigation:* the stored Blob transcript is the ground-truth comparison. Eval reads the entry against the transcript that was saved with it. A future checker agent could do this at write time. Out of scope for v1.
- **Transcript drift.** Claude produces a summarized or reshaped transcript instead of the verbatim conversation, undermining the durable-source benefit and weakening the check against fictional record.
  - *Mitigation:* the model spec requires the transcript to be verbatim and complete. Eval compares the stored transcript against the original conversation.
- **Stale precedent.** Tax law changes invalidate prior reasoning, but retrieval resurfaces the old logic as if it were still live.
  - *Mitigation (partial):* entries are timestamped and labeled with filing year, and retrieval presents an entry as a past decision to re-examine, not as a current answer. Detecting law deltas is a verification concern and lives in the separate Checker spec.
- **Divergent copies.** The user edits the CoWork markdown file while the connector store still holds the old version, or vice versa.
  - *Mitigation:* two-way sync is out of scope for v1. The KV store is the system of record; the CoWork file is a snapshot.

## Project structure

```
handbook/
├── app/
│   ├── app/
│   │   └── api/
│   │       ├── [transport]/
│   │       │   └── route.ts        # MCP server entry (mcp-handler, JSON-RPC over HTTP)
│   │       └── init/
│   │           └── route.ts        # one-shot seed loader, gated by INIT_SECRET
│   ├── lib/
│   │   ├── tools/
│   │   │   ├── save_to_handbook.ts
│   │   │   ├── search_handbook.ts
│   │   │   ├── get_entry.ts
│   │   │   └── list_entries.ts
│   │   ├── instructions.ts         # Server-level connector instructions
│   │   ├── kv.ts                   # Upstash Redis client
│   │   ├── blob.ts                 # Vercel Blob client (transcript storage)
│   │   ├── schema.ts               # Entry schema + validator
│   │   └── render.ts               # Entry to markdown
│   ├── data/
│   │   └── seed_entries.json       # Synthetic seed entries (content pending)
│   ├── package.json
│   └── vercel.json
├── docs/
│   ├── strategy/
│   │   └── spec.md
│   ├── build/
│   │   └── architecture.md         # This file
│   └── model-specs/
│       └── handbook-connector.md
└── thinking/
```

## Evaluation

Thin for now; will be revisited.

- **Capture fidelity.** Does a saved entry reflect the user's stated reasoning, or did Claude embellish? Reviewed against conversation transcripts.
- **Offer timing.** Does Claude offer a save at genuinely contested decisions and stay quiet otherwise? Measured from accept/decline patterns and transcript review.
- **Retrieval relevance.** When a related decision recurs, does `search_handbook` surface the right prior entry?

Calibration of any LLM judge will precede shipping any judge-based score, per `feedback_calibration`.

## Infrastructure proposals

These are things that would be needed in production but are not built in the demo.

- **Multi-user identity.** The demo is single-tenant. A real Handbook would scope entries to a user. Cleanest path: the MCP connector reads a user id from the connector install context (each user's Claude install would surface a stable identifier to the connector), then KV keys are namespaced by user. No login flow on the user's side.
- **Two-way sync between KV and CoWork.** Today the markdown file is a snapshot. In production, edits in CoWork should flow back to KV (or KV should be derived from CoWork files, inverting the system of record). Conflict resolution becomes real.
- **Schema evolution.** When the entry schema changes (e.g., adding a `tags` field), existing entries need a migration path. The KV layout would need a schema-version field per entry and a read-time migrator.
- **Backup and export.** Users own the record per the spec's trust model. A real Handbook needs a one-click export to a portable archive (the markdown corpus plus the JSON).
- **Rate limiting and abuse.** A public MCP connector accepts traffic from any Claude install that adds it. Production needs request-level limits and a way to revoke abusive installs.

The Checker (verification layer) is intentionally excluded from this list. It lives in a separate spec.

## Out of scope

- *Verification / the Checker.* A separate layer with a separate spec. v1 entries are user-asserted, not verified.
- *Autonomous writes.* Every entry is user-confirmed; the system never saves on its own.
- *Multi-contributor entries.* The MVP assumes a single decision-maker who both reasons and commits. Real small businesses split this across bookkeeper, owner, and accountant, which would require an entity-scoped record with per-contribution attribution.
- *A standalone pattern-matching dashboard* (scores, filters, decision clustering).

## Open questions

- **Discovery.** How is the Handbook surfaced to the user the first time: how do they learn the connector is there and what it does?
- **CoWork write capability.** Does Claude reliably write to CoWork files in the user's workspace from inside a tool-using conversation, or is the user-side write a manual step? If manual, the mirror step needs UX in the conversation itself.
- **Search quality on a small corpus.** With 6 to 10 seed entries, similarity search may be coarse. Worth a pass on whether keyword + filing-year filter is more honest than embedding similarity at this size.
