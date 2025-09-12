/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        xgray: "#71767A", // 기본 색상
        xprimary: "#235C49", // 변형 색상
        xmain: "#FFFFFF", // 변형 색상
        xopp: "#000000", // 변형 색상
        xgray: "#161616", // 변형 색상
      },
      keyframes: {
        shine: {
          to: { backgroundPosition: "200% center" },
        },
        upDowns: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        upDown: "upDowns 2s ease-in-out infinite",
        shine: "shine 3s linear infinite",
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
