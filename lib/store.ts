import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  TenantRepository,
  createSeedStore,
  type TenantId,
  type TenantRecord,
} from "./tenant";

const DATA_FILE = path.join(process.cwd(), "data", "tenants.json");

type TenantFile = { records: TenantRecord[] };

function readRecords(): TenantRecord[] {
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as TenantFile | TenantRecord[];
    if (Array.isArray(raw)) return raw;
    return raw.records ?? createSeedStore();
  } catch {
    const seed = createSeedStore();
    writeRecords(seed);
    return seed;
  }
}

function writeRecords(records: TenantRecord[]): void {
  mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, `${JSON.stringify({ records }, null, 2)}\n`);
}

export function getRepo(): TenantRepository {
  return new TenantRepository(readRecords());
}

export function persistRepo(repo: TenantRepository): void {
  // Reconstruct from both tenants (repo has no public dump — use list)
  const records = [
    ...repo.list("org_acme_north"),
    ...repo.list("org_globex_south"),
  ];
  writeRecords(records);
}

export function listRecords(tenantId: TenantId): TenantRecord[] {
  return getRepo().list(tenantId);
}

export function getRecord(tenantId: TenantId, id: string) {
  return getRepo().get(tenantId, id);
}

export function createRecord(
  tenantId: TenantId,
  input: {
    id?: string;
    title: string;
    classification: TenantRecord["classification"];
  },
): TenantRecord {
  const repo = getRepo();
  const id =
    input.id?.trim() ||
    `rec_${tenantId === "org_acme_north" ? "acme" : "globex"}_${Date.now().toString(36)}`;
  const record = repo.create(tenantId, {
    id,
    title: input.title,
    classification: input.classification,
  });
  persistRepo(repo);
  return record;
}

/** Foreign ids for attack UI (peek only — not returned by list). */
export function foreignIds(viewer: TenantId): string[] {
  const other: TenantId =
    viewer === "org_acme_north" ? "org_globex_south" : "org_acme_north";
  return getRepo().peekIdsForTenant(other);
}
