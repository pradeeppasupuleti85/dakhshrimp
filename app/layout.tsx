import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
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
      <body>{children}</body>
    </html>
  );
}
