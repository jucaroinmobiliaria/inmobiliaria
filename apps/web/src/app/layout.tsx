import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { SITE } from "@/lib/site";
import { SessionProvider } from "@/lib/session";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { TabBar } from "@/components/layout/tab-bar";
import { Toaster } from "@/components/ui/misc";
import { ActionStage } from "@/components/motion/gestures";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: "website", locale: SITE.locale, siteName: SITE.name, title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0F463A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={GeistSans.variable}>
      <body>
        <SessionProvider>
          <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Saltar al contenido</a>
          <Header />
          <main id="contenido" className="min-h-[70dvh]">{children}</main>
          <Footer />
          <TabBar />
          <Toaster />
          <ActionStage />
        </SessionProvider>
      </body>
    </html>
  );
}
