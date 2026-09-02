import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VIP Travel — Private Aviation & Premium Cabins",
  description: "Unified search across Business/First class, private jet charter, and empty legs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-charcoal text-white font-body">{children}</body>
    </html>
  );
}
