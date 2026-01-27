import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SolarStorm brand colors
        solar: {
          bg: '#0B1020',
          text: '#E6ECFF',
          muted: '#9AA4C2',
          emerald: '#00D084',
          card: '#111833',
          border: '#1E2347',
        },
        kp: {
          low: '#2DC937',
          moderate: '#99C140',
          elevated: '#E7B416',
          high: '#DB7B2B',
          severe: '#CC3232',
        },
        aurora: {
          low: '#004080',
          medium: '#00D084',
          high: '#E7B416',
          extreme: '#CC3232',
        },
        bz: {
          positive: '#00D084',
          negative: '#CC3232',
        },
      },
      borderRadius: {
        solar: '12px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.2)',
        tile: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
