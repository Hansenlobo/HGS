import { requireUser } from "@/lib/auth/session";
import { getAnalyticsData } from "@/lib/analytics/getAnalyticsData";
import { AnalyticsPageClient } from "@/components/analytics/AnalyticsPageClient";

export default async function AnalyticsPage() {
  await requireUser();

  const data = await getAnalyticsData({});

  return <AnalyticsPageClient initialData={data} />;
}
