import type { Metadata } from 'next';
import { Geist_Mono, Source_Sans_3 } from 'next/font/google';
import geedyxFavicon from '../assets/geedyx-favicon.png';
import { QueryProvider } from '../components/providers/query-provider';
import { ThemeProvider } from '../components/providers/theme-provider';
import { ToastProvider } from '../components/feedback/feedback';
import { cn } from '../lib/cn';
import './globals.css';

const sourceSans = Source_Sans_3({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-source-loaded',
  weight: ['300', '400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-geist-mono-loaded',
});

export const metadata: Metadata = {
  title: 'Geedyx',
  description: 'Consola operativa de Geedyx',
  icons: {
    apple: geedyxFavicon.src,
    icon: geedyxFavicon.src,
    shortcut: geedyxFavicon.src,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={cn([sourceSans.variable, geistMono.variable])}
      lang="es"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <QueryProvider>{children}</QueryProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
