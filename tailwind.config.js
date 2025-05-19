// tailwind.config.js
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        tt: ['"TT Commons"', 'sans-serif'],
      },
    },
  }, // <-- deze komma mag NIET vergeten worden!
  plugins: [],
}
