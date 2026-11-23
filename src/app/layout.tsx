import type {Metadata, Viewport} from "next";
import {Fraunces, IBM_Plex_Sans_Arabic, Manrope} from "next/font/google";

import {ServiceWorkerCleanup} from "@/components/layout/service-worker-cleanup";
import {ToastProvider} from "@/components/ui/toast";
import {I18nProvider} from "@/lib/i18n/client";
import {getI18n} from "@/lib/i18n/server";

import "./globals.css";

const manrope = Manrope({variable: "--font-manrope", subsets: ["latin"], display: "swap"});
const fraunces = Fraunces({variable: "--font-fraunces", subsets: ["latin"], display: "swap", axes: ["opsz"]});
// Arabic: one professional sans for headings and body (weights kept to what the design uses).
const plexArabic = IBM_Plex_Sans_Arabic({variable: "--font-plex-arabic", subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], display: "swap"});

export async function generateMetadata(): Promise<Metadata> {
  const {t} = await getI18n();
  return {
    title: {default: t("meta.title"), template: `%s · ${t("brand.event")}`},
    description: t("meta.description"),
  };
}

export const viewport: Viewport = {
  themeColor: "#ce1126",
  width: "device-width",
  initialScale: 1,
  // Lets the layout use the full screen on notched phones (safe areas are padded in CSS).
  viewportFit: "cover",
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const {locale, dir, dict} = await getI18n();
  return (
    <html lang={locale} dir={dir} data-scroll-behavior="smooth" className={`${manrope.variable} ${fraunces.variable} ${plexArabic.variable} antialiased`}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale} dict={dict}>
          <ToastProvider>{children}</ToastProvider>
          <ServiceWorkerCleanup />
        </I18nProvider>
      </body>
    </html>
  );
}
