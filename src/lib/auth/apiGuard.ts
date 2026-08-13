import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "./session";

/**
 * API-route-safe auth checks. `requireUser`/`requireAdmin` in session.ts use
 * next/navigation's `redirect()`, which is for Server Components/pages —
 * Route Handlers need a real JSON error response instead, since client
 * fetch() calls expect JSON, not an HTML redirect.
 */
export async function requireUserApi(): Promise<
  { user: CurrentUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  return { user };
}

export async function requireAdminApi(): Promise<
  { user: CurrentUser } | { response: NextResponse }
> {
  const result = await requireUserApi();
  if ("response" in result) return result;
  if (result.user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return result;
}
