# Handbook connector

MCP connector for the Handbook: a reasoning-memory layer for the user's financial judgment calls. Saves user-confirmed entries to Upstash Redis; optionally saves the full source conversation as a transcript to Vercel Blob.

See `../docs/strategy/spec.md` for product framing and `../docs/build/architecture.md` for system design.

## Stack

- Next.js (App Router) on Vercel
- `mcp-handler` + `@modelcontextprotocol/sdk` for MCP transport
- `@upstash/redis` for entry storage
- `@vercel/blob` for transcript storage
- `zod` for input validation

## One-time setup

1. Create a Vercel project pointed at this directory.
2. From the project dashboard, add the **Upstash Redis** integration via Marketplace. This auto-populates `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Add the **Vercel Blob** store. This auto-populates `BLOB_READ_WRITE_TOKEN`.
4. Set `INIT_SECRET` to a long random string. This gates the seed-loader endpoint.
5. Copy `.env.local.example` to `.env.local` and fill in the same values for local dev: `vercel env pull .env.local` is the easiest path.

## Local dev

```
npm install
npm run dev
```

Connector is now at `http://localhost:3000/api/mcp`.

## Load synthetic seeds

```
curl -X POST http://localhost:3000/api/init \
  -H "Authorization: Bearer $INIT_SECRET"
```

Idempotent: already-seeded entries are skipped.

## Test with MCP Inspector

```
npx @modelcontextprotocol/inspector
```

UI opens on `http://localhost:6274`. Connect to `http://localhost:3000/api/mcp` (transport: HTTP). Exercise the four tools, watch Redis/Blob writes happen.

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

- v1 search is substring matching. Upgrade path is Upstash Vector or a small embedding index if relevance gets thin past 20-30 entries.
- Single-tenant by deployment. No user identity layer. See architecture's infrastructure proposals for the multi-user path.
- Transcript URLs are public (anyone with the URL can read). Suffixes are random so they're unguessable, but treat the URL itself as the access control.
