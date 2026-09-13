import type { Metadata } from "next";
import { Source_Sans_3, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { getSession } from "@/lib/api/server";
import "./globals.css";

// Source Sans 3 is the GEEDYX UI family (variable font; 300–700 used). The wordmark is
// independent of the UI typography (see docs/BRAND.md). Geist Mono is kept only
// for data identifiers (SKU, slug, prices).
const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GEEDYX",
  description: "Product and inventory management platform",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSession();
  return (
    <html
      lang={user?.regionalContext.locale ?? "es"}
      suppressHydrationWarning
      className={`${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
