import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Work_Sans } from "next/font/google";
import { LiveChatWidget } from "../components/LiveChatWidget";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });

export const metadata: Metadata = {
  title: "Business/First Class Search & Empty Leg Marketplace",
  description: "Search Business and First class fares only, or browse discounted private jet empty legs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${workSans.variable}`}>
      <body className="bg-night text-cream font-body">
        {children}
        <LiveChatWidget />
      </body>
    </html>
  );
}
