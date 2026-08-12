import type { Viewport } from "next";
import { Inter } from "next/font/google";

import { JsonLd } from "@/components/seo/JsonLd";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PwaInstallBar } from "@/components/pwa/PwaInstallBar";
import { PwaStandaloneMode } from "@/components/pwa/PwaStandaloneMode";
import { DEFAULT_METADATA } from "@/lib/seo";
import { getOrganizationJsonLd } from "@/lib/seo-assets";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = DEFAULT_METADATA;

export const viewport: Viewport = {
  themeColor: "#2563eb",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col overflow-x-hidden bg-white font-sans text-brand-text antialiased">
        <JsonLd data={getOrganizationJsonLd()} />
        <Header />
        <main>{children}</main>
        <Footer />
        <PwaStandaloneMode />
        <PwaInstallBar />
        <MobileBottomNav />
      </body>
    </html>
  );
}
