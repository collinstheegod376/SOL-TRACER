import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#FCFCFC",
};

export const metadata: Metadata = {
  title: "SolTrace — Solana On-Chain AI Scanner",
  description:
    "Fast, clear on-chain transaction scanner and blockchain forensics for Solana wallets, tokens, security audits, and DEX flows.",
  keywords: ["SolTrace", "Solana", "Solscan", "On-chain Analyst", "Crypto", "DeFi", "Blockchain", "Wallet Audit"],
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
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FCFCFC] text-[#0D0D0D] antialiased min-h-screen selection:bg-[#0D0D0D] selection:text-[#FFFFFF]">
        {children}
      </body>
    </html>
  );
}
