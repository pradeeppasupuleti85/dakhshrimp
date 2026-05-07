import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DAKH Shrimp — Premium Seafood from Traditional Village Ponds",
  description:
    "Farm-to-fork transparency powered by QR traceability. Premium tiger prawns and village pond shrimp from Andhra Pradesh.",
  openGraph: {
    title: "DAKH Shrimp Seafoods",
    description: "Scan the QR. Know your shrimp's journey.",
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
