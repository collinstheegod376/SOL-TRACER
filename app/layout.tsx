import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F1012",
};

export const metadata: Metadata = {
  title: "SolTrace — On-chain Solana Analyst",
  description:
    "SolTrace autonomous blockchain analytics for Solana wallets, token holdings, DeFi activities, and counterparty flows powered by Groq 120B reasoning.",
  keywords: ["SolTrace", "Solana", "Solscan", "Groq AI", "On-chain Analyst", "Crypto", "DeFi", "Blockchain"],
  authors: [{ name: "SolTrace" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0F1012] text-[#F5F6F8] antialiased min-h-screen selection:bg-[#3B82F6]/30 selection:text-[#F5F6F8]">
        {children}
      </body>
    </html>
  );
}
