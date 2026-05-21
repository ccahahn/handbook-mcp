# Handbook

![next.js](https://img.shields.io/badge/next.js-15-black?style=flat-square) ![claude code](https://img.shields.io/badge/claude%20code-2.1.146-orange?style=flat-square)

A reasoning-memory layer for financial decisions, built as a Claude MCP connector. Handbook stores the *why* behind a user's judgment calls (especially tax filings) as a byproduct of a conversation with Claude, and surfaces it when the user asks at the next filing.

**[Try the prototype →](https://handbook-mcp.vercel.app/)**

> Shared demo instance: any entries saved through the connector are visible to other visitors on the dashboard. Per-user isolation is documented under [architecture > infrastructure proposals](./docs/build/architecture.md) but not built in v1.

## Layout

- [`/app`](./app) — the MCP connector (Next.js on Vercel, Neon Postgres for entries, Vercel Blob for transcripts). Start here for the quickstart.
- [`/docs/strategy/spec.md`](./docs/strategy/spec.md) — product spec: problem, core bet, key user journey, success metrics.
- [`/docs/build/architecture.md`](./docs/build/architecture.md) — system architecture: components, data flow, guardrails, schema.
- [`/docs/model-specs/handbook-connector.md`](./docs/model-specs/handbook-connector.md) — behavioral contract for the connector (the prompt surface).

## Status

v1 demo, single-tenant by deployment.
