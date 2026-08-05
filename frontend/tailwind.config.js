/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#6366F1', // node titles, handles, active tab
          strong: '#4F46E5',  // primary button
          tint: '#EEF2FF',    // badges, node id pill
        },
        ink: {
          DEFAULT: '#1F2937', // body text
          muted: '#6B7280',   // descriptions, help text
        },
        edge: {
          DEFAULT: '#C7D2FE', // node card border
          muted: '#E5E7EB',   // inputs, tiles, dot grid
        },
      },
      borderRadius: {
        node: '10px',
      },
      boxShadow: {
        node: '0 1px 2px rgb(0 0 0 / 0.05)',
        'node-selected': '0 0 0 2px #6366F1',
      },
    },
  },
  plugins: [],
};
