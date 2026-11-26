import { describe, expect, it } from 'vitest'
import {
  autoTextColor,
  BLACK,
  contrastGrade,
  contrastRatio,
  lineariseChannel,
  relativeLuminance,
  WHITE,
} from '../src/shared/contrast.ts'
import { PRESETS } from '../src/shared/presets.ts'
import { parseHex } from '../src/shared/hex.ts'

describe('lineariseChannel', () => {
  it('is exact at the reference points', () => {
    expect(lineariseChannel(0)).toBe(0)
    expect(lineariseChannel(255)).toBeCloseTo(1, 12)
  })

  it('uses the /12.92 branch below the threshold', () => {
    // 8-bit 5 → 5/255 ≈ 0.0196 ≤ 0.03928 → v/12.92.
    expect(lineariseChannel(5)).toBeCloseTo(5 / 255 / 12.92, 12)
  })

  it('uses the 2.4-power branch above the threshold', () => {
    expect(lineariseChannel(255)).toBeCloseTo(Math.pow((255 / 255 + 0.055) / 1.055, 2.4), 12)
  })
})

describe('relativeLuminance', () => {
  it('gives 0 for black and 1 for white', () => {
    expect(relativeLuminance(parseHex('#000000')!)).toBe(0)
    expect(relativeLuminance(parseHex('#FFFFFF')!)).toBeCloseTo(1, 12)
  })
})

describe('contrastRatio', () => {
  it('handles the textbook values exactly', () => {
    expect(contrastRatio(WHITE, BLACK)).toBe(21)
    expect(contrastRatio(WHITE, '#FF0000')).toBeCloseTo(3.9984767707539985, 6)
    expect(contrastRatio(WHITE, '#767676')).toBeCloseTo(4.5422, 4)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#2C6732', WHITE)).toBe(contrastRatio(WHITE, '#2C6732'))
  })

  it('returns null when either colour is invalid', () => {
    expect(contrastRatio('nope', WHITE)).toBeNull()
    expect(contrastRatio(WHITE, null as unknown as string)).toBeNull()
  })
})

describe('autoTextColor', () => {
  it('picks white on every shipped preset (each ≥ 6.0 against white)', () => {
    for (const preset of PRESETS) {
      expect(contrastRatio(WHITE, preset.hex)).toBeGreaterThanOrEqual(6.0)
      expect(autoTextColor(preset.hex)).toBe(WHITE)
    }
  })

  it('picks black near the midpoint', () => {
    expect(autoTextColor('#7A7A7A')).toBe(BLACK)
    expect(autoTextColor('#DDE6DD')).toBe(BLACK)
  })

  it('falls back to white for garbage (fail-safe white-on-colour)', () => {
    expect(autoTextColor('bogus')).toBe(WHITE)
  })
})

describe('contrastGrade', () => {
  it('maps thresholds 7 / 4.5 / below', () => {
    expect(contrastGrade(7)).toBe('aaa')
    expect(contrastGrade(10.2)).toBe('aaa')
    expect(contrastGrade(6.1)).toBe('aa')
    expect(contrastGrade(4.5)).toBe('aa')
    expect(contrastGrade(1.9)).toBe('fail')
    expect(contrastGrade(null)).toBe('unknown')
  })
})
