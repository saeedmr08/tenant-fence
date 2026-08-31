# Security Policy

## Defensive lab only

**TenantFence is an educational multi-tenant isolation laboratory.** It uses two synthetic organizations and an in-memory repository. It does not connect to production databases, identity providers, or customer tenants.

All automated checks are **negative / defensive tests**: they prove that org B cannot read org A records even when a record id is known. The UI visualizes that blocked attempt; it does not provide attack tooling against live systems.

Do not use this project to:

- Probe or exfiltrate data from real multi-tenant deployments
- Bypass authorization on systems you do not own
- Store or replay production tenant identifiers or secrets

Demo orgs (`acme-north`, `globex-south`) and record ids are fictional.

## Reporting a vulnerability

If you find a security issue in TenantFence itself (for example, a leak in `lib/tenant.ts` filtering), email **saeedmr08@gmail.com** with steps to reproduce. Please allow reasonable time for a fix before public disclosure.

## Safe defaults for real apps

When applying lessons from this lab to production:

- Scope every repository query with the authenticated `tenantId`
- Return a uniform not-found response for cross-tenant lookups (do not leak existence)
- Never trust a client-supplied tenant id without binding it to the session or token claims
- Cover isolation with automated negative tests in CI
