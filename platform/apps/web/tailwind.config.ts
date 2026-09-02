import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Boutique concierge palette: warm cream, deep wine burgundy,
        // muted brass/gold reserved for accents and premium details.
        cream: "#f7f0e3",
        "cream-deep": "#efe1c8",
        burgundy: "#5c1526",
        "burgundy-dark": "#3d0e1a",
        gold: "#a9834a",
        ink: "#2a1c1a",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "serif"],
        body: ["var(--font-work-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
