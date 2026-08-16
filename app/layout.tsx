import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlueCrew Ops · Airblue Crew Operations",
  description: "Pre-flight requisites, service inventory and shift handovers in one accountable crew workspace.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "BlueCrew Ops", description: "Ready. Accounted for. Handed over.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "BlueCrew Ops", description: "Ready. Accounted for. Handed over.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
