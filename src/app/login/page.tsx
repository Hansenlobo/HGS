import { prisma } from "@/lib/prisma";
import { getOrCreateAppSettings } from "@/lib/settings/getSettings";
import { LoginPageClient } from "@/components/auth/LoginPageClient";

export default async function LoginPage() {
  const [userCount, settings] = await Promise.all([prisma.user.count(), getOrCreateAppSettings()]);
  return <LoginPageClient needsSetup={userCount === 0} storeName={settings.storeName || "Hardware Store CRM"} />;
}
