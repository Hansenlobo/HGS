import { prisma } from "@/lib/prisma";

const FALLBACK_PIN = "1234";

/** Shared Admin PIN gate for financially-sensitive actions (payment
 * edit/delete, bill cancel, deactivating a product). Checks the PIN set on
 * the Settings page first, then ADMIN_PIN in .env, then the documented
 * fallback — so an admin can rotate it without redeploying. */
export async function verifyPin(pin: string | undefined | null): Promise<boolean> {
  if (typeof pin !== "string" || pin.length === 0) return false;
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const expected = settings?.adminPin || process.env.ADMIN_PIN || FALLBACK_PIN;
  return pin === expected;
}
