import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function devOnlyCspBypass() {
  return {
    name: 'dev-only-csp-bypass',
    apply: 'serve' as const,
    transformIndexHtml(html: string) {
      return html.replace(/\s*<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>\s*/i, '\n    ');
    }
  };
}

export default defineConfig({
  plugins: [devOnlyCspBypass(), react()],
  base: './',
  publicDir: 'public-radio',
  server: {
    watch: {
      ignored: ['**/.gradle-user-home/**', '**/android/**', '**/dist/**', '**/ios/**', '**/release/**']
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
