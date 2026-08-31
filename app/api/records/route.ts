import { NextResponse } from "next/server";
import {
  createRecord,
  foreignIds,
  listRecords,
} from "@/lib/store";
import type { TenantId, TenantRecord } from "@/lib/tenant";

export const runtime = "nodejs";

const TENANTS: TenantId[] = ["org_acme_north", "org_globex_south"];

function parseTenant(value: string | null): TenantId | null {
  if (!value) return null;
  return TENANTS.includes(value as TenantId) ? (value as TenantId) : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = parseTenant(searchParams.get("tenantId"));
  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId query required (org_acme_north | org_globex_south)" },
      { status: 400 },
    );
  }
  const records = listRecords(tenantId);
  return NextResponse.json({
    tenantId,
    records,
    attackTargets: foreignIds(tenantId),
  });
}

export async function POST(request: Request) {
  let body: {
    tenantId?: string;
    title?: string;
    classification?: TenantRecord["classification"];
    id?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const tenantId = parseTenant(body.tenantId ?? null);
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  try {
    const record = createRecord(tenantId, {
      id: body.id,
      title: body.title.trim(),
      classification: body.classification ?? "internal",
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 400 },
    );
  }
}
