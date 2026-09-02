import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business/First Class Search & Empty Leg Marketplace",
  description: "Search Business and First class fares only, or browse discounted private jet empty legs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-charcoal text-white font-body">{children}</body>
    </html>
  );
}
