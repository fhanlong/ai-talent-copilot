import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        canvas: "#f5f7f5",
        brand: {
          50: "#eefaf5",
          100: "#d9f3e7",
          500: "#238b63",
          600: "#187653",
          700: "#145f45"
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20, 32, 26, .04), 0 8px 30px rgba(20, 32, 26, .04)"
      }
    }
  },
  plugins: []
} satisfies Config;
