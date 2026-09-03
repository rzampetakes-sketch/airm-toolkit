import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light palette taken directly from the reference photo: pale
        // blue-white page background, white cards/UI, azure blue as the
        // one accent color (from the window's day-sky scene).
        paper: "#f4f7fb",
        panel: "#ffffff",
        azure: "#4d84b8",
        "azure-light": "#eaf3fa",
        charcoal: "#1f2933",
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
