/**
 * TenantFence — multi-tenant record store that always scopes by tenantId.
 * Cross-tenant lookups return not_found (no existence leak).
 */

export type TenantId = "org_acme_north" | "org_globex_south";

export type TenantRecord = {
  id: string;
  tenantId: TenantId;
  title: string;
  classification: "public" | "internal" | "restricted";
  createdAt: string;
};

export type LookupResult =
  | { status: "ok"; record: TenantRecord }
  | { status: "not_found" };

export type IsolationProbe = {
  attackerTenant: TenantId;
  targetRecordId: string;
  targetOwnerTenant: TenantId;
  result: LookupResult;
  leaked: boolean;
};

export type IsolationReport = {
  passed: boolean;
  probes: IsolationProbe[];
  summary: string;
};

const ORG_LABELS: Record<TenantId, string> = {
  org_acme_north: "Acme North",
  org_globex_south: "Globex South",
};

export function tenantLabel(id: TenantId): string {
  return ORG_LABELS[id];
}

export function createSeedStore(): TenantRecord[] {
  return [
    {
      id: "rec_acme_ledger_01",
      tenantId: "org_acme_north",
      title: "Q3 ledger export",
      classification: "restricted",
      createdAt: "2026-03-01T10:00:00.000Z",
    },
    {
      id: "rec_acme_roster_02",
      tenantId: "org_acme_north",
      title: "North plant roster",
      classification: "internal",
      createdAt: "2026-03-02T11:30:00.000Z",
    },
    {
      id: "rec_globex_invoice_01",
      tenantId: "org_globex_south",
      title: "South invoice batch",
      classification: "restricted",
      createdAt: "2026-03-01T14:00:00.000Z",
    },
    {
      id: "rec_globex_map_02",
      tenantId: "org_globex_south",
      title: "Facility access map",
      classification: "internal",
      createdAt: "2026-03-04T09:15:00.000Z",
    },
  ];
}

export class TenantRepository {
  private records: TenantRecord[];

  constructor(seed: TenantRecord[] = createSeedStore()) {
    this.records = seed.map((r) => ({ ...r }));
  }

  /** List is always filtered by the caller's tenant. */
  list(tenantId: TenantId): TenantRecord[] {
    return this.records
      .filter((r) => r.tenantId === tenantId)
      .map((r) => ({ ...r }));
  }

  /**
   * Get by id — must match tenantId.
   * Wrong tenant or missing id → not_found (identical outcome).
   */
  get(tenantId: TenantId, recordId: string): LookupResult {
    const record = this.records.find(
      (r) => r.id === recordId && r.tenantId === tenantId,
    );
    if (!record) {
      return { status: "not_found" };
    }
    return { status: "ok", record: { ...record } };
  }

  create(
    tenantId: TenantId,
    input: {
      id: string;
      title: string;
      classification: TenantRecord["classification"];
    },
  ): TenantRecord {
    if (this.records.some((r) => r.id === input.id)) {
      throw new Error(`Record id already exists: ${input.id}`);
    }
    const record: TenantRecord = {
      id: input.id,
      tenantId,
      title: input.title,
      classification: input.classification,
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    return { ...record };
  }

  /** Unsafe helper used only by tests/UI to pick a foreign id for probes. */
  peekIdsForTenant(tenantId: TenantId): string[] {
    return this.records.filter((r) => r.tenantId === tenantId).map((r) => r.id);
  }
}

/**
 * Simulate org B attempting to read org A's records by known ids.
 * Isolation holds when every probe returns not_found and leaked is false.
 */
export function runIsolationProbes(
  repo: TenantRepository,
  attacker: TenantId,
  victim: TenantId,
): IsolationReport {
  const victimIds = repo.peekIdsForTenant(victim);
  const probes: IsolationProbe[] = victimIds.map((id) => {
    const result = repo.get(attacker, id);
    const leaked =
      result.status === "ok" && result.record.tenantId !== attacker;
    return {
      attackerTenant: attacker,
      targetRecordId: id,
      targetOwnerTenant: victim,
      result,
      leaked,
    };
  });

  const anyLeak = probes.some((p) => p.leaked);
  const allNotFound = probes.every((p) => p.result.status === "not_found");
  const passed = !anyLeak && allNotFound;

  return {
    passed,
    probes,
    summary: passed
      ? `Fence held: ${tenantLabel(attacker)} received not_found for all ${probes.length} ${tenantLabel(victim)} ids.`
      : `Fence broken: ${tenantLabel(attacker)} leaked one or more ${tenantLabel(victim)} records.`,
  };
}

export function runFullIsolationSuite(repo?: TenantRepository): IsolationReport {
  const store = repo ?? new TenantRepository();
  const aVsB = runIsolationProbes(store, "org_globex_south", "org_acme_north");
  const bVsA = runIsolationProbes(store, "org_acme_north", "org_globex_south");
  const probes = [...aVsB.probes, ...bVsA.probes];
  const passed = aVsB.passed && bVsA.passed;
  return {
    passed,
    probes,
    summary: passed
      ? `All ${probes.length} cross-tenant probes returned not_found.`
      : "One or more cross-tenant probes leaked data.",
  };
}
