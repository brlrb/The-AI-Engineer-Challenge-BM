import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Engineer Challenge - GPT Chat Interface",
  description: "A modern chat interface for interacting with GPT-4.1-mini using OpenAI's API",
  keywords: ["AI", "GPT", "OpenAI", "Chat", "Next.js", "FastAPI"],
  authors: [{ name: "Bikram Maharjan" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
