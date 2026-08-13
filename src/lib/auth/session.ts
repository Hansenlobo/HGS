import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signSessionToken, verifySessionToken, SESSION_COOKIE, type SessionPayload } from "./token";

export { SESSION_COOKIE };
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function createSessionToken(user: {
  id: string;
  role: "ADMIN" | "STAFF";
  name: string;
}): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  return signSessionToken(payload);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "STAFF";
}

/** Re-checks the DB (not just the token) so a disabled user is rejected
 * even with an otherwise-still-valid signed token. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
