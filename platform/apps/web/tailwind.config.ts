import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dashboard/concierge palette: near-black charcoal, petrol teal
        // structural accent, orange as the sole CTA/highlight color.
        charcoal: "#0a0d0d",
        panel: "#12181a",
        teal: "#1f9d8a",
        "teal-glow": "#0f2a27",
        orange: "#f97316",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
