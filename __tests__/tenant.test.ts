import { describe, expect, it } from "vitest";
import {
  TenantRepository,
  createSeedStore,
  runFullIsolationSuite,
  runIsolationProbes,
} from "@/lib/tenant";

describe("TenantRepository isolation", () => {
  it("lists only the caller's tenant records", () => {
    const repo = new TenantRepository();
    const acme = repo.list("org_acme_north");
    const globex = repo.list("org_globex_south");

    expect(acme.every((r) => r.tenantId === "org_acme_north")).toBe(true);
    expect(globex.every((r) => r.tenantId === "org_globex_south")).toBe(true);
    expect(acme.map((r) => r.id)).not.toEqual(
      expect.arrayContaining(globex.map((r) => r.id)),
    );
  });

  it("returns ok when tenant owns the record", () => {
    const repo = new TenantRepository();
    const result = repo.get("org_acme_north", "rec_acme_ledger_01");
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.record.tenantId).toBe("org_acme_north");
      expect(result.record.title).toContain("ledger");
    }
  });

  it("returns not_found when org B knows org A record id", () => {
    const repo = new TenantRepository();
    const steal = repo.get("org_globex_south", "rec_acme_ledger_01");
    expect(steal).toEqual({ status: "not_found" });
  });

  it("returns not_found for missing ids (same shape as cross-tenant)", () => {
    const repo = new TenantRepository();
    const missing = repo.get("org_acme_north", "rec_does_not_exist");
    const cross = repo.get("org_acme_north", "rec_globex_invoice_01");
    expect(missing).toEqual({ status: "not_found" });
    expect(cross).toEqual({ status: "not_found" });
  });

  it("creates records bound to the writing tenant only", () => {
    const repo = new TenantRepository([]);
    const created = repo.create("org_acme_north", {
      id: "rec_new",
      title: "New note",
      classification: "internal",
    });
    expect(created.tenantId).toBe("org_acme_north");
    expect(repo.get("org_globex_south", "rec_new")).toEqual({
      status: "not_found",
    });
    expect(repo.get("org_acme_north", "rec_new").status).toBe("ok");
  });

  it("seed store has two distinct orgs", () => {
    const seed = createSeedStore();
    const tenants = new Set(seed.map((r) => r.tenantId));
    expect(tenants).toEqual(
      new Set(["org_acme_north", "org_globex_south"]),
    );
  });
});

describe("isolation probes (leak prevention)", () => {
  it("blocks Globex from reading all Acme ids", () => {
    const repo = new TenantRepository();
    const report = runIsolationProbes(
      repo,
      "org_globex_south",
      "org_acme_north",
    );
    expect(report.passed).toBe(true);
    expect(report.probes.length).toBeGreaterThan(0);
    expect(report.probes.every((p) => !p.leaked)).toBe(true);
    expect(report.probes.every((p) => p.result.status === "not_found")).toBe(
      true,
    );
  });

  it("blocks Acme from reading all Globex ids", () => {
    const repo = new TenantRepository();
    const report = runIsolationProbes(
      repo,
      "org_acme_north",
      "org_globex_south",
    );
    expect(report.passed).toBe(true);
    expect(report.probes.every((p) => p.result.status === "not_found")).toBe(
      true,
    );
  });

  it("full suite passes both directions", () => {
    const report = runFullIsolationSuite();
    expect(report.passed).toBe(true);
    expect(report.summary).toMatch(/not_found/i);
  });
});
