import { describe, expect, it } from 'vitest'
import { SECTION_CSS } from '../src/client/style-tag.ts'
import { BUBBLE_CSS, CSS_PREFIX } from '../src/shared/protocol.ts'
import { en, zh, type CealumTintKey } from '../src/client/locales.ts'

describe('owned stylesheets', () => {
  it('keeps the bubble rule to exactly one selector and its fallbacks', () => {
    expect(BUBBLE_CSS.startsWith('div[data-message-bubble]{')).toBe(true)
    expect(BUBBLE_CSS).toContain('var(--dsw-specific-bubble)')
    expect(BUBBLE_CSS).toContain('var(--dsw-alias-label-primary)')
    expect(BUBBLE_CSS).not.toContain('!important')
  })

  it('scopes every selector in the section sheet under the plugin prefix', () => {
    const selectors = SECTION_CSS.split('}')
      .map((rule) => rule.split('{')[0]?.trim() ?? '')
      .filter((selector) => selector.length > 0)
    expect(selectors.length).toBeGreaterThan(5)
    for (const selector of selectors) {
      const scoped = selector
        .split(',')
        .map((part) => part.trim())
        .every((part) => part.startsWith(`.${CSS_PREFIX}`) || part.startsWith(`.${CSS_PREFIX}:`))
      expect(scoped, `selector must be plugin-prefixed: ${selector}`).toBe(true)
    }
  })

  it('never uses !important or element/global selectors', () => {
    expect(SECTION_CSS).not.toContain('!important')
    expect(SECTION_CSS).not.toMatch(/(^|}|,|\n)\s*(body|html|#root|:root)\s*[{,]/)
  })

  it('references only plugin-owned or DSH design tokens', () => {
    const tokens = [...SECTION_CSS.matchAll(/--[\w-]+/g)].map((m) => m[0])
    for (const token of tokens) {
      expect(
        token.startsWith('--cealum-tint-') || token.startsWith('--dsw-'),
        `token ${token} must be plugin-owned or a DSH token`,
      ).toBe(true)
    }
  })
})

describe('locale dictionaries', () => {
  it('gives every English key a Chinese mirror', () => {
    const missing = (Object.keys(en) as CealumTintKey[]).filter((key) => zh[key] === undefined)
    expect(missing).toEqual([])
  })

  it('leaves no untranslated placeholder strings', () => {
    for (const [key, value] of Object.entries(zh)) {
      expect(String(value).length, `zh copy for ${key}`).toBeGreaterThan(0)
    }
    for (const [key, value] of Object.entries(en)) {
      expect(String(value).length, `en copy for ${key}`).toBeGreaterThan(0)
    }
  })

  it('keeps the placeholder names identical across languages', () => {
    const placeholders = (value: string): string[] =>
      [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort()
    for (const key of Object.keys(en) as CealumTintKey[]) {
      expect(placeholders(zh[key])).toEqual(placeholders(en[key]))
    }
  })
})
