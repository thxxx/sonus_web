/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        xgray: "#71767A", // 기본 색상
        xprimary: "#1D9BF0", // 변형 색상
        xmain: "#000000", // 변형 색상
        xopp: "#FFFFFF", // 변형 색상
        xgray: "#161616", // 변형 색상
      },
      keyframes: {
        upDowns: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        upDown: "upDowns 2s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Merriweather", "serif"],
        mono: ["Menlo", "monospace"],
        poppins: ["Poppins", "Inter"],
      },
    },
  },
  plugins: [],
};
