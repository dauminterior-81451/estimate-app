import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppBootstrap from "@/components/AppBootstrap";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Estimate Admin",
  description: "현장 기반 인테리어 견적 및 운영 관리 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppBootstrap>{children}</AppBootstrap>
      </body>
    </html>
  );
}
