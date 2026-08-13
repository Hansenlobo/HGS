import { requireAdmin } from "@/lib/auth/session";
import { getOrCreateAppSettings } from "@/lib/settings/getSettings";
import { SettingsPageClient } from "@/components/settings/SettingsPageClient";

export default async function SettingsPage() {
  await requireAdmin();

  const settings = await getOrCreateAppSettings();

  return <SettingsPageClient initialSettings={settings} />;
}
