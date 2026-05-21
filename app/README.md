# Handbook connector

MCP connector for the Handbook: a reasoning-memory layer for the user's financial judgment calls. Saves user-confirmed entries to Neon Postgres; optionally saves the full source conversation as a transcript to Vercel Blob.

See `../docs/strategy/spec.md` for product framing and `../docs/build/architecture.md` for system design.

## Stack

- Next.js (App Router) on Vercel
- `mcp-handler` + `@modelcontextprotocol/sdk` for MCP transport
- `@neondatabase/serverless` for entry storage (Neon Postgres)
- `@vercel/blob` for transcript storage
- `zod` for input validation

## One-time setup

1. Create a Vercel project pointed at this directory.
2. From the project's **Storage** tab, create a **Neon Postgres** database. This auto-populates `DATABASE_URL`.
3. Add the **Vercel Blob** store. This auto-populates `BLOB_READ_WRITE_TOKEN`.
4. Copy `.env.local.example` to `.env.local` and fill in the same values for local dev: `vercel env pull .env.local` is the easiest path.

The first POST to `/api/init` runs `CREATE TABLE IF NOT EXISTS` and loads seeds. No separate migration step.

## Local dev

```
npm install
npm run dev
```

Connector is now at `http://localhost:3000/api/mcp`.

## Load synthetic seeds

```
curl -X POST http://localhost:3000/api/init
```

Idempotent: already-seeded entries are skipped. The route only loads bundled synthetic seeds, so it's safe to leave public.

## Test with MCP Inspector

```
npx @modelcontextprotocol/inspector
```

UI opens on `http://localhost:6274`. Connect to `http://localhost:3000/api/mcp` (transport: HTTP). Exercise the four tools, watch Postgres/Blob writes happen.

Requires Node 22.7.5+.

## End-to-end with Claude

Claude requires an HTTPS URL for custom connectors. Two options:

**ngrok (fastest iteration):**
```
ngrok http 3000
```
Copy the public HTTPS URL, append `/api/mcp`, paste into Claude Settings > Connectors > Add custom connector.

**Vercel preview deploy:**
```
vercel deploy
```
Use the resulting preview URL with `/api/mcp` appended.

Custom connectors require Pro/Max/Team/Enterprise plan.

## Tools exposed

- `save_to_handbook(decision, filing_year, rationale, alternatives?, sources?, transcript?)` — two-consent save (entry first, then optional transcript)
- `search_handbook(query)` — substring match over decision/rationale/alternatives
- `get_entry(id)` — by id
- `list_entries()` — most recent first

Tool descriptions and server-level instructions are in `lib/instructions.ts`. The behavioral contract is `../docs/model-specs/handbook-connector.md`. Edit them in lockstep.

## Notes

- v1 search is `ILIKE` substring matching. Upgrade path is Postgres full-text search (`tsvector` + `ts_rank`) or an embedding index if relevance gets thin past 20-30 entries.
- Single-tenant by deployment. No user identity layer. See architecture's infrastructure proposals for the multi-user path.
- Transcript URLs are public (anyone with the URL can read). Suffixes are random so they're unguessable, but treat the URL itself as the access control.
