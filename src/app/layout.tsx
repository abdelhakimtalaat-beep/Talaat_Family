import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/session";

const font = Cairo({ subsets: ["arabic", "latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Family Hub",
  description: "Family & villa management",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#14213d", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={font.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
