import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Boutique concierge palette, dark mode throughout the whole
        // platform (matches the homepage's airplane-window hero): deep
        // near-black burgundy background, cream text, muted brass/gold
        // reserved for accents and premium details.
        night: "#12070c",
        panel: "#1e0f16",
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
