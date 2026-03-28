import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { cookies } from "next/headers";
import { EnvironmentMode, getEnvironmentMode } from "@/lib/config/environment";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VideoSystem - Sleep Documentary Generator",
  description: "Automated research and generation of long-form YouTube documentaries designed for sleep",
  keywords: ["youtube", "documentary", "sleep", "automation", "AI", "video generation"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read environment mode from cookie server-side
  const cookieStore = await cookies();
  const envModeFromCookie = cookieStore.get("x-env-mode")?.value as EnvironmentMode;

  // Use cookie if present, otherwise fallback to system default (which is now smarter)
  const effectiveMode = envModeFromCookie || getEnvironmentMode();

  // Read theme mode from cookie server-side
  const themeFromCookie = (cookieStore.get("x-theme")?.value as any) || "saas";

  return (
    <html lang="en" className={`dark theme-${themeFromCookie}`}>
      <body className={`${inter.variable} font-sans antialiased text-gray-200`}>
        <Providers initialTheme={themeFromCookie} initialMode={effectiveMode}>
          <Header initialMode={effectiveMode} />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
