/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Covenant 44: Semantic Color Palette
      colors: {
        // Primary/Action Colors (Based on the core brand identity)
        'covenant-primary': {
          DEFAULT: '#007BFF', // Blue 500
          '50': '#E6F0FF',
          '100': '#B3D7FF',
          '200': '#80BFFF',
          '300': '#4D9FFF',
          '400': '#1A87FF',
          '500': '#007BFF',
          '600': '#0063CC',
          '700': '#004A99',
          '800': '#003266',
          '900': '#001933',
        },
        // Secondary/Accent Colors (For highlights and secondary actions)
        'covenant-secondary': {
          DEFAULT: '#17A2B8', // Cyan 500
          '50': '#E8F7F9',
          '100': '#C0E9EE',
          '200': '#98DBE3',
          '300': '#70CDD8',
          '400': '#48BFCD',
          '500': '#17A2B8',
          '600': '#128293',
          '700': '#0E616E',
          '800': '#09414A',
          '900': '#052025',
        },
        // Neutral/Background Colors (For text, backgrounds, and borders)
        'covenant-neutral': {
          '50': '#F8F9FA', // Lightest background
          '100': '#E9ECEF',
          '200': '#DEE2E6',
          '300': '#CED4DA',
          '400': '#ADB5BD',
          '500': '#6C757D', // Default text/border
          '600': '#495057',
          '700': '#343A40',
          '800': '#212529',
          '900': '#1A1D20', // Darkest text/background
        },
        // Status Colors
        'covenant-success': '#28A745',
        'covenant-danger': '#DC3545',
        'covenant-warning': '#FFC107',
        'covenant-info': '#17A2B8',
      },

      // Covenant 50: Typographic Scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px (Body/Default)
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1' }],          // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],       // 60px
        '7xl': ['4.5rem', { lineHeight: '1' }],        // 72px
        '8xl': ['6rem', { lineHeight: '1' }],          // 96px
        '9xl': ['8rem', { lineHeight: '1' }],          // 128px
      },

      // Custom Spacing (If needed, otherwise standard Tailwind scale is used)
      spacing: {
        '18': '4.5rem', // Example custom spacing
      },

      // Custom Box Shadows
      boxShadow: {
        'covenant-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'covenant-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'covenant-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [
    // Optional: Add Tailwind plugins here (e.g., forms, typography)
  ],
}