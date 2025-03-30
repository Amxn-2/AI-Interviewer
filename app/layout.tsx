import React from "react";
import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const monaSans = Mona_Sans({
  subsets: ["latin"],
  variable: "--font-mona-sans", // Optional, can use className instead
});

export const metadata: Metadata = {
  title: "AI Interviewe",
  description: "AI-powered Mock Interview Platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${monaSans.variable} antialiased pattern`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
