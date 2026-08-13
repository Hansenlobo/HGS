import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { settingsSchema } from "@/lib/validation/settings.schema";
import { logAudit } from "@/lib/audit/log";
import { getOrCreateAppSettings } from "@/lib/settings/getSettings";

export async function GET() {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const settings = await getOrCreateAppSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await getOrCreateAppSettings();
  const updated = await prisma.appSettings.update({
    where: { id: "singleton" },
    data: {
      ...parsed.data,
      backupEveryNTransactions:
        parsed.data.backupFrequency === "EVERY_N_TRANSACTIONS" ? parsed.data.backupEveryNTransactions : null,
    },
  });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Settings",
    action: "UPDATE",
    description: `${auth.user.name} updated store settings`,
  });

  return NextResponse.json(updated);
}
