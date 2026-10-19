/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FCFCFC",
        surface: "#FFFFFF",
        surfaceRaised: "#F4F4F4",
        hairline: "rgba(0, 0, 0, 0.08)",
        ink: "#0D0D0D",
        body: "#5D5D5D",
        neutral: "#8F8F8F",
        primary: "#0D0D0D",
        "primary-hover": "#262626",
        accent: "#3566F0",
        "accent-green": "#10B981",
        "accent-amber": "#F59E0B",
        "accent-purple": "#8B5CF6",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
        mono: ["'Geist Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      maxWidth: {
        content: "720px",
      },
      borderRadius: {
        none: "0px",
        xs: "8px",
        sm: "10px",
        md: "14px",
        xl: "18px",
        "2xl": "24px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        dropdown: "rgba(0, 0, 0, 0.08) 0px 8px 16px 0px, rgba(0, 0, 0, 0.04) 0px 0px 1px 0px",
      },
      letterSpacing: {
        displayTight: "-0.03em",
        display: "-0.02em",
        heading: "-0.015em",
        subheading: "-0.01em",
      },
    },
  },
  plugins: [],
};
