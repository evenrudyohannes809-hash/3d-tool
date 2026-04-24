/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accent2: "rgb(var(--accent2) / <alpha-value>)",
        pink: "rgb(var(--pink) / <alpha-value>)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        "soft-sm": "var(--shadow-soft-sm)",
        "soft-inset": "var(--shadow-soft-inset)",
        "soft-pressed": "var(--shadow-soft-pressed)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      fontFamily: {
        sans: ["Nunito", "Inter", "system-ui", "sans-serif"],
        display: ["Nunito", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
