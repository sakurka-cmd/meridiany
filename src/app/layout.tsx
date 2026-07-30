import type { Metadata } from "next";
import { Playfair_Display, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Меридианы — атлас великих экспедиций",
  description:
    "Интерактивная карта маршрутов великих мореплавателей, торговцев и исследователей — от полинезийских миграций 50 000 г. до н.э. до одиночных переходов XXI века. Магеллан, Кук, Лаперуз, Крузенштерн, Васко да Гама, Пржевальский, Хедин, Шёлковый путь и многие другие.",
  keywords: [
    "исторические маршруты",
    "мореплаватели",
    "Магеллан",
    "Кук",
    "Лаперуз",
    "Крузенштерн",
    "Васко да Гама",
    "Шёлковый путь",
    "Пржевальский",
    "история географических открытий",
  ],
  authors: [{ name: "Меридианы" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
        style={{ backgroundColor: "#0B1420" }}
      >
        {children}
        <SonnerToaster position="top-right" richColors />
      </body>
    </html>
  );
}
