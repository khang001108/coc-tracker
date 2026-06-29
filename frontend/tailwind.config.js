/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        coc: {
          gold:   "#F4A130",
          brown:  "#8B4513",
          dark:   "#1A0F05",
          card:   "#2A1A0A",
          border: "#5C3A1E",
        },
        gray: { 950: "#0a0a0f" },
      },
      fontFamily: {
        display: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
