import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "DAKH Shrimp & Co. — Global Quality, Indian Price",
  description:
    "Farm-to-fork premium seafood powered by QR traceability. Every batch verified, lab tested, cold chain maintained. From Andhra Pradesh village ponds.",
  openGraph: {
    title: "DAKH Shrimp & Co.",
    description: "Scan Freshness. Taste Trust.",
    images: ["/images/logos/Dakhsrimp-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        {/*
          Preload the hero image so the browser fetches it
          immediately — this directly improves LCP.
          Use 1920w cap (not 3840) since no screen needs 4K here.
        */}
        <link
          rel="preload"
          as="image"
          href="/images/hero/Village-ShrimpPondBG.webp"
          imageSrcSet="
            /_next/image?url=%2Fimages%2Fhero%2FVillage-ShrimpPondBG.webp&w=828&q=80 828w,
            /_next/image?url=%2Fimages%2Fhero%2FVillage-ShrimpPondBG.webp&w=1080&q=80 1080w,
            /_next/image?url=%2Fimages%2Fhero%2FVillage-ShrimpPondBG.webp&w=1200&q=80 1200w,
            /_next/image?url=%2Fimages%2Fhero%2FVillage-ShrimpPondBG.webp&w=1920&q=80 1920w
          "
          imageSizes="100vw"
          fetchPriority="high"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
