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
  metadataBase: new URL("https://soltracer.vercel.app"),
  title: {
    default: "SolTrace (Sol Tracer AI) — AI Solana On-Chain Transaction Scanner",
    template: "%s | Sol Tracer AI",
  },
  description:
    "Open-source conversational AI blockchain scanner for Solana. Real-time wallet tracking, visual money flow diagrams, drainer risk audits, and DEX swap analytics.",
  keywords: [
    "sol tracer ai",
    "Sol Tracer AI",
    "sol tracer",
    "SolTracer",
    "soltracer",
    "soltracer ai",
    "SolTrace",
    "Solana",
    "Solscan",
    "Solscan alternative",
    "Solana AI scanner",
    "on-chain forensics",
    "wallet security audit",
    "drainer detector",
    "money flow diagram",
    "Solana transaction tracker",
    "DeFi swaps",
    "Jupiter",
    "Raydium",
    "crypto analytics",
    "blockchain intelligence",
  ],
  authors: [
    {
      name: "promisedkillua",
      url: "https://www.promisedkillua.sbs/",
    },
  ],
  creator: "promisedkillua",
  publisher: "promisedkillua",
  applicationName: "Sol Tracer AI",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://soltracer.vercel.app",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://soltracer.vercel.app",
    siteName: "Sol Tracer AI",
    title: "SolTrace | Sol Tracer AI — Solana On-Chain Transaction Scanner",
    description:
      "Inspect Solana wallets, visual money flow maps, security drainer audits, and DEX trades using plain natural language.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolTrace | Sol Tracer AI — Solana On-Chain Transaction Scanner",
    description:
      "Conversational AI blockchain scanner for Solana wallets, visual money flow maps, security drainer audits, and DEX trades.",
    creator: "@promisedkillua",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://soltracer.vercel.app/#webapp",
      "name": "SolTrace",
      "alternateName": ["Sol Tracer AI", "sol tracer ai", "SolTracer", "soltracer"],
      "url": "https://soltracer.vercel.app",
      "applicationCategory": "FinancialApplication",
      "operatingSystem": "All",
      "description":
        "Open-source conversational AI Solana blockchain scanner for wallet tracking, visual money flow diagrams, security drainer audits, and DEX trading forensics.",
      "browserRequirements": "Requires JavaScript. Requires HTML5.",
      "softwareVersion": "1.0.0",
      "creator": {
        "@type": "Person",
        "name": "promisedkillua",
        "url": "https://www.promisedkillua.sbs/",
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://soltracer.vercel.app/#website",
      "url": "https://soltracer.vercel.app",
      "name": "SolTrace",
      "description": "AI-Powered Solana On-Chain Transaction Scanner",
      "publisher": {
        "@type": "Person",
        "name": "promisedkillua",
        "url": "https://www.promisedkillua.sbs/",
      },
    },
  ],
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
        <link rel="author" href="https://www.promisedkillua.sbs/" />
        <link rel="help" href="/llms.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[#FCFCFC] text-[#0D0D0D] antialiased min-h-screen selection:bg-[#0D0D0D] selection:text-[#FFFFFF]">
        {children}
      </body>
    </html>
  );
}
