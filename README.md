# Handbook

A reasoning-memory layer for financial decisions, built as a Claude MCP connector. Handbook stores the *why* behind a user's judgment calls (especially tax filings) as a byproduct of a conversation with Claude, and surfaces it when the user asks at the next filing.

## Layout

- [`/app`](./app) — the MCP connector (Next.js on Vercel, Neon Postgres for entries, Vercel Blob for transcripts). Start here for the quickstart.
- [`/docs/strategy/spec.md`](./docs/strategy/spec.md) — product spec: problem, core bet, key user journey, success metrics.
- [`/docs/build/architecture.md`](./docs/build/architecture.md) — system architecture: components, data flow, guardrails, schema.
- [`/docs/model-specs/handbook-connector.md`](./docs/model-specs/handbook-connector.md) — behavioral contract for the connector (the prompt surface).

## Status

v1 demo, single-tenant by deployment.
