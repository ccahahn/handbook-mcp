# Handbook connector

MCP connector for the Handbook: a reasoning-memory layer for the user's financial judgment calls. Saves user-confirmed entries to Neon Postgres; optionally saves the full source conversation as a transcript to Vercel Blob.

See `../docs/strategy/spec.md` for product framing and `../docs/build/architecture.md` for system design.

## Stack

- Next.js (App Router) on Vercel
- `mcp-handler` + `@modelcontextprotocol/sdk` for MCP transport
- `@neondatabase/serverless` for entry storage (Neon Postgres)
- `@vercel/blob` for transcript storage (public access for the demo)
- `zod` for input validation

## Deploy

1. Import this repo into Vercel. **Set Root Directory to `app`**.
2. In the project's Storage tab:
   - Create a **Neon Postgres** database. Auto-populates `DATABASE_URL`.
   - Add a **Vercel Blob** store. Auto-populates `BLOB_READ_WRITE_TOKEN`.
3. Deploy. The build runs `npm install` automatically.

No env vars to set manually. `HANDBOOK_NAMESPACE` is optional and defaults to `default`.

## Load synthetic seeds

After the first deploy succeeds:

```
curl -X POST https://<your-vercel-url>/api/init
```

Runs `CREATE TABLE IF NOT EXISTS` and writes the bundled seed entries (plus transcripts to Blob). Idempotent: already-seeded entries are skipped.

## Test with MCP Inspector

```
npx @modelcontextprotocol/inspector
```

UI opens on `http://localhost:6274` (Inspector itself runs locally; it just talks to the remote server). Connect to `https://<your-vercel-url>/api/mcp` with HTTP transport. Exercise the four tools, watch Postgres/Blob writes happen.

Requires Node 22.7.5+.

## Add to Claude

Settings > Connectors > Add custom connector. Paste `https://<your-vercel-url>/api/mcp`. The connector becomes available in your conversations.

Custom connectors require Pro/Max/Team/Enterprise plan.

**Note:** the live demo at `https://handbook-mcp.vercel.app` is a shared single-tenant deployment. Saves go into one common namespace, so any entries saved through the connector are visible to other visitors on the dashboard. Per-user isolation lives in the architecture doc's infrastructure proposals and is not built in v1.

## Iterating

Every change is a `git push`. Vercel auto-deploys (30-90 seconds). For prompt iteration on `lib/instructions.ts` and tool descriptions in `app/api/[transport]/route.ts`, this is the slow loop. Accept it for now; revisit a local dev setup if the lag becomes painful.

## Tools exposed

- `save_to_handbook(decision, filing_year, rationale, alternatives?, sources?, transcript?)` — two-consent save (entry first, then optional transcript)
- `search_handbook(query)` — ILIKE substring match over decision/rationale/alternatives
- `get_entry(id)` — by id
- `list_entries()` — most recent first

Tool descriptions and server-level instructions are in `lib/instructions.ts`. The behavioral contract is `../docs/model-specs/handbook-connector.md`. Edit them in lockstep.

## Notes

- v1 search is `ILIKE` substring matching. Upgrade path is Postgres full-text search (`tsvector` + `ts_rank`) or an embedding index if relevance gets thin past 20-30 entries.
- Single-tenant by deployment. No user identity layer. See architecture's infrastructure proposals for the multi-user path.
- Transcript URLs are public (anyone with the URL can read). Suffixes are random so URLs are unguessable, but treat the URL itself as the access control.
