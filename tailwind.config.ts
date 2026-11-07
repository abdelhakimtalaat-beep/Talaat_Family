import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#14213d", 700: "#1d2f55", 900: "#0b1429" },
        beige: { DEFAULT: "#efe6d5", 100: "#f7f2e8" },
        gold: { DEFAULT: "#b08d57", 600: "#9a7843" },
        warm: "#fbf9f4",
        mist: "#e6e6e3",
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
