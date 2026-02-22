/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'ey-charcoal':     '#201F1F',
        'ey-charcoal-alt': '#1A1919',
        'ey-gold':         '#E09F3C',
        'ey-red':          '#ED323A',
        'ey-white':        '#FFFFFF',
        'ey-gray-mid':     '#B2B3B3',
        'ey-gray-light':   '#E5E5E5',
        'ey-brown':        '#68443C',
      },
      fontFamily: {
        'bebas': ['"Bebas Neue"', 'sans-serif'],
        'sora':  ['Sora', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
