import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPublicAssetUrl } from '../lib/publicAssets';

describe('public asset paths', () => {
  it('builds asset URLs from the Vite base path', () => {
    expect(getPublicAssetUrl('/icons/app-icon.png')).toBe(`${import.meta.env.BASE_URL}icons/app-icon.png`);
    expect(getPublicAssetUrl('icons/app-icon.png')).toBe(`${import.meta.env.BASE_URL}icons/app-icon.png`);
  });

  it('keeps PWA manifest paths relative for GitHub Pages subdirectory installs', () => {
    const manifestPaths = ['public/manifest.webmanifest', 'public-radio/manifest.webmanifest'];

    manifestPaths.forEach((manifestPath) => {
      const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8')) as {
        start_url: string;
        scope: string;
        icons: Array<{ src: string }>;
      };

      expect(manifest.start_url).toBe('./');
      expect(manifest.scope).toBe('./');
      expect(manifest.icons.every((icon) => !icon.src.startsWith('/'))).toBe(true);
    });
  });

  it('does not hard-code root icon paths in the app shell', () => {
    const app = readFileSync(resolve('src/GlobalRadioApp.tsx'), 'utf8');
    const splash = readFileSync(resolve('src/components/AppSplash.tsx'), 'utf8');
    const index = readFileSync(resolve('index.html'), 'utf8');

    expect(app).not.toContain('src="/icons/');
    expect(splash).not.toContain('src="/icons/');
    expect(index).not.toContain('href="/manifest.webmanifest"');
    expect(index).not.toContain('href="/icons/');
    expect(index).not.toContain('src="/icons/');
  });
});
