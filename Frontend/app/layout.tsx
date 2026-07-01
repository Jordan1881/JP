import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const geistMono = localFont({
  src: "../fonts/GeistMono-VariableFont_wght.ttf",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JP — Job Player",
  description: "Track your job applications in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistMono.variable}>
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
