import { describe, expect, it } from 'vitest'
import {
  CUSTOM_PRESET_ID,
  PRESETS,
  PRESET_IDS,
  PRESET_VALUES,
  normalizePresetId,
  presetById,
  presetIdForHex,
} from '../src/shared/presets.ts'

describe('presets', () => {
  it('ships exactly five fixed presets with canonical hex', () => {
    expect(PRESETS).toHaveLength(5)
    for (const preset of PRESETS) {
      expect(preset.hex).toMatch(/^#[0-9A-F]{6}$/)
      expect(PRESET_IDS).toContain(preset.id)
    }
  })

  it('keeps the audited colours', () => {
    const byId = new Map(PRESETS.map((preset) => [preset.id, preset.hex]))
    expect(byId.get('deep-green')).toBe('#2C6732')
    expect(byId.get('ocean-blue')).toBe('#245B82')
    expect(byId.get('purple')).toBe('#604B83')
    expect(byId.get('amber')).toBe('#805B26')
    expect(byId.get('graphite')).toBe('#414141')
  })

  it('exposes custom as the sixth accepted value', () => {
    expect(PRESET_VALUES).toEqual([
      'deep-green',
      'ocean-blue',
      'purple',
      'amber',
      'graphite',
      'custom',
    ])
    expect(PRESET_VALUES).toContain(CUSTOM_PRESET_ID)
  })

  it('looks presets up by id', () => {
    expect(presetById('deep-green')?.hex).toBe('#2C6732')
    expect(presetById('custom')).toBeUndefined()
    expect(presetById('nope')).toBeUndefined()
  })

  it('maps renamed legacy preset ids through the alias table', () => {
    expect(normalizePresetId('chatgpt-green')).toBe('deep-green')
    expect(normalizePresetId('deep-green')).toBe('deep-green')
    expect(normalizePresetId('ocean-blue')).toBe('ocean-blue')
    expect(normalizePresetId('nope')).toBe('nope')
  })

  it('maps a hex colour back to its preset, else custom', () => {
    expect(presetIdForHex('#2c6732')).toBe('deep-green')
    expect(presetIdForHex('#2C6732')).toBe('deep-green')
    expect(presetIdForHex('#245B82')).toBe('ocean-blue')
    expect(presetIdForHex('#123456')).toBe(CUSTOM_PRESET_ID)
  })
})
