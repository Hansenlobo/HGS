import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/analytics/getAnalyticsData";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const data = await getAnalyticsData({ dateFrom, dateTo });
  return NextResponse.json(data);
}
