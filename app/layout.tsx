import "./globals.css";

export const metadata = {
  title: "DAKH Shrimp",
  description: "Premium seafood retail with QR traceability",
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