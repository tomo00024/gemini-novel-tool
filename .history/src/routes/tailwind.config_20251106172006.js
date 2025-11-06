/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'], // この行が重要です
  theme: {
    extend: {},
  },
  plugins: [
    // ここに @tailwindcss/typography などのプラグインを追加します
    require('@tailwindcss/typography'),
  ],
}