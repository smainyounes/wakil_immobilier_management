// Thème appliqué avant l'affichage (évite le flash blanc en mode sombre)
try { if (localStorage.getItem('wkTheme') === 'dark') document.documentElement.classList.add('dark'); } catch (e) {}
tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' },
        night: { 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#0a0a0a' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)',
        pop: '0 12px 32px -8px rgba(16,24,40,.18), 0 4px 8px -4px rgba(16,24,40,.08)',
      },
      fontSize: { '2xs': ['11px', '16px'] },
    },
  },
};
