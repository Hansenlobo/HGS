import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { verifyPin } from "@/lib/adminPin";
import { clearBusinessData } from "@/lib/settings/clearDatabase";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => ({}));
  if (!(await verifyPin(body?.pin))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }
  if (body?.confirmation !== "CLEAR DATA") {
    return NextResponse.json({ error: "Confirmation phrase didn't match" }, { status: 400 });
  }

  await clearBusinessData();

  // Not written to AuditLog — that table is one of the ones just cleared.
  console.log(`[clear-db] ${auth.user.name} (${auth.user.id}) cleared all business data at ${new Date().toISOString()}`);

  return NextResponse.json({ ok: true });
}
