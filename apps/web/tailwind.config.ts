import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0b",
        paper: "#f7f7f4",
        bone: "#efefeb",
        line: "#deded8",
        muted: "#73736f"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        serif: ["Georgia", "Times New Roman", "serif"]
      },
      boxShadow: {
        quiet: "0 22px 80px rgba(0, 0, 0, 0.05)"
      }
    }
  },
  plugins: []
};

export default config;
