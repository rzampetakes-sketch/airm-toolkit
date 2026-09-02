import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { LiveChatWidget } from "../components/LiveChatWidget";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Business/First Class Search & Empty Leg Marketplace",
  description: "Search Business and First class fares only, or browse discounted private jet empty legs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-charcoal text-white font-body">
        {children}
        <LiveChatWidget />
      </body>
    </html>
  );
}
