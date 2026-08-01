import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        foreground: "#FFFFFF",
        card: {
          DEFAULT: "#141414",
          foreground: "#FFFFFF",
          hover: "#1F1F1F",
          border: "#262626",
        },
        popover: {
          DEFAULT: "#141414",
          foreground: "#FFFFFF",
        },
        primary: {
          DEFAULT: "#E10600",
          hover: "#FF3B3B",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1A1A1A",
          foreground: "#E5E5E5",
        },
        muted: {
          DEFAULT: "#171717",
          foreground: "#A3A3A3",
        },
        accent: {
          DEFAULT: "#E10600",
          muted: "#7A0000",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        border: "#262626",
        input: "#1F1F1F",
        ring: "#E10600",
        sidebar: {
          bg: "#050505",
          border: "#1F1F1F",
          active: "#E10600",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        red: "0 0 20px -3px rgba(225, 6, 0, 0.3)",
        "red-sm": "0 0 10px -2px rgba(225, 6, 0, 0.2)",
      }
    },
  },
  plugins: [],
};
export default config;
