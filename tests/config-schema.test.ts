import { describe, expect, it } from 'vitest'
import {
  BUBBLE_CSS,
  DEFAULT_PRESET,
  FIELD,
  PLUGIN_ID,
  VAR_BUBBLE_BG,
  VAR_BUBBLE_FG,
} from '../src/shared/protocol.ts'
import { CONFIG_DEFAULTS, Config } from '../src/shared/config-schema.ts'
import { PRESET_VALUES } from '../src/shared/presets.ts'

describe('protocol contract', () => {
  it('locks the reviewed stylesheet text', () => {
    // The exact rule from DEVELOPMENT-PLAN §16.1 — long-hand background-color,
    // two-level fallbacks, no !important.
    expect(BUBBLE_CSS).toBe(
      'div[data-message-bubble]{' +
        'background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));' +
        'color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary))}',
    )
    expect(BUBBLE_CSS).not.toContain('!important')
  })

  it('names the plugin id and variables after itself', () => {
    expect(PLUGIN_ID).toBe('cealum-tint')
    expect(VAR_BUBBLE_BG).toBe('--cealum-tint-user-bg')
    expect(VAR_BUBBLE_FG).toBe('--cealum-tint-user-fg')
  })

  it('declares the five field names', () => {
    expect(Object.keys(FIELD).sort()).toEqual([
      'bubbleColor',
      'enabled',
      'preset',
      'textColor',
      'textMode',
    ])
  })
})

/** A volatile field resolves to a reference object exposing `get()`. */
type VolatileSection = Record<string, { get(): unknown }>

describe('Config schema', () => {
  it('fills every default from an empty section', () => {
    const resolved = Config(null) as VolatileSection
    expect(resolved[FIELD.enabled]!.get()).toBe(true)
    expect(resolved[FIELD.preset]!.get()).toBe('deep-green')
    expect(resolved[FIELD.bubbleColor]!.get()).toBe('#2C6732')
    expect(resolved[FIELD.textMode]!.get()).toBe('auto')
    expect(resolved[FIELD.textColor]!.get()).toBe('#FFFFFF')
  })

  it('accepts a full valid section (volatile fields stay references)', () => {
    const resolved = Config({
      enabled: false,
      preset: 'ocean-blue',
      bubbleColor: '#245B82',
      textMode: 'custom',
      textColor: '#Fa0',
    }) as VolatileSection
    expect(resolved[FIELD.enabled]!.get()).toBe(false)
    expect(resolved[FIELD.preset]!.get()).toBe('ocean-blue')
    expect(resolved[FIELD.textMode]!.get()).toBe('custom')
    // Raw values on the wire are still HEX-shaped; the client's store is the
    // component that normalises them to upper-case #RRGGBB.
    expect(String(resolved[FIELD.textColor]!.get())).toMatch(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  })

  it('maps the custom preset through the union', () => {
    const resolved = Config({ preset: 'custom', bubbleColor: '#123456' }) as VolatileSection
    expect(resolved[FIELD.preset]!.get()).toBe('custom')
  })

  it('rejects a preset outside the enum', () => {
    expect(() => Config({ preset: 'not-a-preset' })).toThrow()
  })

  it('rejects an invalid hex colour', () => {
    expect(() => Config({ bubbleColor: 'green' })).toThrow()
    expect(() => Config({ bubbleColor: '#24' })).toThrow()
    expect(() => Config({ textColor: 'rgb(255,0,0)' })).toThrow()
  })

  it('rejects an unknown text mode', () => {
    const badInput = { textMode: 'rainbow' } as unknown as Record<string, string>
    expect(() => Config(badInput as never)).toThrow()
  })

  it('marks every field volatile (the namespace only exists then)', () => {
    // Schemastery exposes object fields via `dict`; each must carry
    // meta.volatile or SettingsService.describe() drops the whole namespace.
    const dict = (Config as unknown as { dict?: Record<string, { meta?: { volatile?: boolean } }> })
      .dict
    const names = Object.keys(dict ?? {})
    for (const name of names) {
      expect(dict![name]!.meta?.volatile, `field ${name} must be volatile`).toBe(true)
    }
    // And the selection must be exactly the five fields.
    expect(names.sort()).toEqual(['bubbleColor', 'enabled', 'preset', 'textColor', 'textMode'])
  })

  it('mirrors the defaults as frozen plain data', () => {
    expect(CONFIG_DEFAULTS).toEqual({
      enabled: true,
      preset: DEFAULT_PRESET,
      bubbleColor: '#2C6732',
      textMode: 'auto',
      textColor: '#FFFFFF',
    })
    expect(Object.isFrozen(CONFIG_DEFAULTS)).toBe(true)
    expect(PRESET_VALUES).toContain(DEFAULT_PRESET)
  })
})
