# TenantFence

TenantFence is a multi-tenant isolation lab by **Saeed Rumaneh**. Two synthetic organizations share one repository that **always** filters by `tenantId`. Negative tests prove org B cannot read org A records even when they know the record id — the API returns **404 / not_found**, never a leak. Records persist to `data/tenants.json`.

## Why it exists

Broken tenant filters are a classic SaaS vulnerability: list endpoints forget the org clause, or get-by-id trusts an opaque UUID without checking ownership. TenantFence makes that failure mode visible with a reproducible attack attempt UI and HTTP 404 responses.

## What it demonstrates

- Two fictional orgs: Acme North and Globex South
- Records always written and read with an explicit `tenantId`
- Cross-tenant get returns `not_found` (HTTP 404, no existence oracle)
- Vitest suite covering leak prevention in `lib/tenant.ts`
- UI that picks tenant A/B and attempts the steal

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/records?tenantId=` | List caller-scoped records |
| GET | `/api/records/:id?tenantId=` | Get by id (404 if cross-tenant) |
| POST | `/api/records` | Create under `tenantId` |

## Development

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

```bash
npm test
npm run typecheck
npm run build
```

Runtime data under `data/` is gitignored.

## Complete product flows

1. View as Acme North and **Create** a record — it lists under Acme.
2. Switch to Globex South — the Acme record is hidden from the list.
3. Click **Run cross-tenant attack** — each foreign id returns `not_found` (HTTP 404). Records persist in `data/tenants.json`.

## Security posture

This is a demonstration laboratory, not a production identity or tenancy platform. See [SECURITY.md](SECURITY.md). All identities and records are fictional.

## License

MIT © 2026 Saeed Rumaneh
