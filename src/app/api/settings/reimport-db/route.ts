import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { verifyPin } from "@/lib/adminPin";
import { validateAndSwapDatabase } from "@/lib/settings/reimportDatabase";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const form = await request.formData();
  const pin = form.get("pin");
  const confirmation = form.get("confirmation");
  const file = form.get("file");

  if (typeof pin !== "string" || !(await verifyPin(pin))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }
  if (confirmation !== "REPLACE DATA") {
    return NextResponse.json({ error: "Confirmation phrase didn't match" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await validateAndSwapDatabase(buffer);

    console.log(
      `[reimport-db] ${auth.user.name} (${auth.user.id}) replaced the database from an uploaded backup at ${new Date().toISOString()}. Safety snapshot: ${result.safetyBackupFile}`,
    );

    return NextResponse.json({
      ok: true,
      safetyBackupFile: result.safetyBackupFile,
      message: "Database replaced — the imported data is live now, no restart needed.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 400 },
    );
  }
}
