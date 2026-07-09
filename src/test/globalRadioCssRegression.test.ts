import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/global-radio.css'), 'utf8');

function getBlock(selector: string, source = css): string {
  const selectorIndex = source.indexOf(selector);
  expect(selectorIndex, `Missing CSS selector: ${selector}`).toBeGreaterThanOrEqual(0);

  const openIndex = source.indexOf('{', selectorIndex);
  expect(openIndex, `Missing CSS block for: ${selector}`).toBeGreaterThanOrEqual(0);

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    }
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(selectorIndex, index + 1);
      }
    }
  }

  throw new Error(`Unclosed CSS block for: ${selector}`);
}

function getFirstMobileBlock(): string {
  const mediaStart = css.indexOf('@media (max-width: 520px)');
  expect(mediaStart).toBeGreaterThanOrEqual(0);

  const nextMediaStart = css.indexOf('@media', mediaStart + 1);
  return css.slice(mediaStart, nextMediaStart === -1 ? css.length : nextMediaStart);
}

describe('global radio mobile CSS regressions', () => {
  it('keeps search controls stacked without the old wrapper background on narrow screens', () => {
    const mobileBlock = getFirstMobileBlock();
    const searchControlBlock = getBlock('.radio-search-control', mobileBlock);
    const searchInputBlock = getBlock('.radio-search input', mobileBlock);

    expect(searchControlBlock).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(searchControlBlock).toContain('background: transparent;');
    expect(searchControlBlock).toContain('padding: 0;');
    expect(searchInputBlock).toContain('min-height: 48px;');
    expect(searchInputBlock).toContain('padding: 0 16px;');
  });

  it('keeps mobile filters in a single column so search and country never overlap at 360px', () => {
    const mobileBlock = getFirstMobileBlock();

    expect(mobileBlock).toMatch(/\.filter-bar,\s*[\s\S]*?\.settings-actions\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
    expect(mobileBlock).toContain('.radio-search-control .radio-button');
  });

  it('keeps bottom navigation buttons equal width across all four tabs', () => {
    const navBlock = getBlock('.radio-bottom-nav');
    const navButtonBlock = getBlock('.radio-bottom-nav button');

    expect(navBlock).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(navBlock).toContain('justify-items: stretch;');
    expect(navButtonBlock).toContain('justify-self: stretch;');
    expect(navButtonBlock).toContain('width: 100%;');
    expect(navButtonBlock).toContain('min-width: 0;');
  });

  it('keeps the YouTube iframe visibly mounted when the user chooses the official alternate', () => {
    const youtubeFrameBlock = getBlock('.youtube-frame');

    expect(youtubeFrameBlock).toContain('display: block;');
    expect(youtubeFrameBlock).toContain('width: 100%;');
    expect(youtubeFrameBlock).toContain('aspect-ratio: 16 / 9;');
    expect(youtubeFrameBlock).not.toMatch(/display:\s*none/);
    expect(youtubeFrameBlock).not.toMatch(/visibility:\s*hidden/);
    expect(youtubeFrameBlock).not.toMatch(/opacity:\s*0/);
  });
});
