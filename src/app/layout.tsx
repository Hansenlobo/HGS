import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { CurrentUserProvider } from "@/components/auth/CurrentUserProvider";
import { AppSettingsProvider } from "@/components/settings/AppSettingsProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingCalculator } from "@/components/layout/FloatingCalculator";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrCreateAppSettings, toPublicSettings } from "@/lib/settings/getSettings";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const appSettings = await getOrCreateAppSettings();
  return {
    title: appSettings.storeName || "Hardware Store CRM",
    description: "Products, Categories, Orders & Billing",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const appSettings = await getOrCreateAppSettings();
  const settings = user ? toPublicSettings(appSettings) : null;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          {user && settings ? (
            <CurrentUserProvider user={user}>
              <AppSettingsProvider settings={settings}>
                <div className="flex min-h-full flex-1 flex-col md:flex-row">
                  <Sidebar user={user} />
                  <div className="min-w-0 flex-1">
                    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24">{children}</main>
                  </div>
                </div>
                <FloatingCalculator />
              </AppSettingsProvider>
            </CurrentUserProvider>
          ) : (
            <main className="flex-1">{children}</main>
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
