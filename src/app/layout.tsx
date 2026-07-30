import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Атлас исторических путешествий",
  description:
    "Интерактивная карта маршрутов великих мореплавателей и исследователей — от полинезийских миграций 3000 г. до н.э. до экспедиций XX века. Магеллан, Кук, Лаперуз, Крузенштерн, Васко да Гама и другие.",
  keywords: [
    "исторические маршруты",
    "мореплаватели",
    "Магеллан",
    "Кук",
    "Лаперуз",
    "Крузенштерн",
    "Васко да Гама",
    "Колумб",
    "кругосветные плавания",
    "история географических открытий",
  ],
  authors: [{ name: "Атлас путешествий" }],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster position="top-right" richColors />
      </body>
    </html>
  );
}
