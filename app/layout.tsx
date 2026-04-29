import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationInit } from "@/components/NotificationInit";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Commure UX Testing Tool",
  description: "Run usability tests, A/B tests, and prototype testing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full bg-gray-50 text-gray-900`}>
        <NotificationInit />
        {children}
      </body>
    </html>
  );
}
