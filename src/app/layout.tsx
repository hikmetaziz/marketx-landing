import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SITE } from "@/constants/data";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarktX — Azərbaycanda alış-satış platforması | marketx.az",
  description:
    "MarktX Azərbaycanda alıcı və satıcıları bir araya gətirən sadə alış-satış platformasıdır.",
  metadataBase: new URL(SITE.url),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-brand-text antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
