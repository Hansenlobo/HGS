import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { getOrCreateAppSettings, toPublicSettings } from "@/lib/settings/getSettings";

/** Safe subset of AppSettings (never adminPin/backup internals) — any
 * logged-in user can read this, not just admins. Fetched live via SWR
 * (not baked into the server-rendered layout) so a change on the Settings
 * page is reflected everywhere immediately, without requiring a hard
 * reload of pages that were already mounted before the change. */
export async function GET() {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const settings = await getOrCreateAppSettings();
  return NextResponse.json(toPublicSettings(settings));
}
