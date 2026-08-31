import { NextResponse } from "next/server";
import { getRecord } from "@/lib/store";
import type { TenantId } from "@/lib/tenant";

export const runtime = "nodejs";

const TENANTS: TenantId[] = ["org_acme_north", "org_globex_south"];

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("tenantId");
  if (!raw || !TENANTS.includes(raw as TenantId)) {
    return NextResponse.json(
      { error: "tenantId query required" },
      { status: 400 },
    );
  }
  const result = getRecord(raw as TenantId, id);
  if (result.status === "not_found") {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
