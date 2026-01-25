import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { cookies } from 'next/headers';
import { EnvironmentMode } from "@/lib/config/environment";

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
  const envMode = (cookieStore.get('x-env-mode')?.value as EnvironmentMode) ||
    (process.env.NEXT_PUBLIC_ENV_MODE as EnvironmentMode) ||
    'DEV';

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased text-gray-200`}>
        <Providers>
          <Header initialMode={envMode} />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
