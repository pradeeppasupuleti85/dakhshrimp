import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DAKH Shrimps & Co. — India's Premium Transparent Seafood",
  description:
    "Premium farm-to-fork seafood powered by QR traceability. Every batch verified, lab tested, cold chain maintained. Andhra Pradesh village ponds.",
  openGraph: {
    title: "DAKH Shrimps & Co.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
