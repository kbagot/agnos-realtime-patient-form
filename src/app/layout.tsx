import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { LocaleProvider } from "@/lib/i18n/locale";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Agnos — live patient intake",
    template: "%s · Agnos intake",
  },
  description:
    "Patient intake form that streams to the care team in real time, so staff follow every field as it is filled in.",
  // Demo data only, but the URL is public: keep it out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#141b21" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Client boundary for the language choice only — children stay server-rendered. */}
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
