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
        canvas: "#0F1012",
        surface: "#17181B",
        surfaceRaised: "#2A2A2D",
        hairline: "#2A2C31",
        ink: "#F5F6F8",
        body: "#9AA0AB",
        primary: "#3B82F6",
        "primary-hover": "#2563EB",
        accent: "#F472B6",
        "accent-gold": "#FBBF24",
        "accent-green": "#34D399",
        "accent-purple": "#A78BFA",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["'Geist Mono'", "monospace", "'Courier New'"],
      },
      maxWidth: {
        content: "672px",
      },
      borderRadius: {
        xl: "18px",
        full: "9999px",
        none: "0px",
      },
      boxShadow: {
        sm: "rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px",
        focus: "rgb(59, 130, 246) 0px 1px 12px -2px",
        card: "rgba(0, 0, 0, 0.4) 0px 10px 15px -3px, rgba(0, 0, 0, 0.2) 0px 4px 6px -4px",
      },
      letterSpacing: {
        displayTight: "-2.4px",
        display: "-1.2px",
        heading: "-0.75px",
        subheading: "-0.48px",
      },
    },
  },
  plugins: [],
};
