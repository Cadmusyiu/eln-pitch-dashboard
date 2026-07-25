import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELN Short-Put Pitch",
  description: "Equity Linked Note (short-put) pricing & payoff illustration for sales",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
