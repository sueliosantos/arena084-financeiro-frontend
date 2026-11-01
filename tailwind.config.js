export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#fafafa",
        muted: "#a1a1aa",
        line: "#27272a",
        canvas: "#09090b",
        panel: "#111113",
        brand: "#fafafa",
        accent: "#d4d4d8",
        ok: "#34d399",
        danger: "#f87171",
        warn: "#fbbf24"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
