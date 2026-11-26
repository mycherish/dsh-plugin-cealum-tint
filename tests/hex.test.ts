import { describe, expect, it } from 'vitest'
import { formatHex, HEX_PATTERN, isHex, normalizeHex, parseHex } from '../src/shared/hex.ts'

describe('HEX_PATTERN', () => {
  it('accepts #RGB and #RRGGBB in both cases', () => {
    expect(HEX_PATTERN.test('#abc')).toBe(true)
    expect(HEX_PATTERN.test('#ABC')).toBe(true)
    expect(HEX_PATTERN.test('#a1B2c3')).toBe(true)
    expect(HEX_PATTERN.test('#000000')).toBe(true)
    expect(HEX_PATTERN.test('#FFFFFF')).toBe(true)
  })

  it('rejects malformed input', () => {
    expect(HEX_PATTERN.test('2C6732')).toBe(false)
    expect(HEX_PATTERN.test('#')).toBe(false)
    expect(HEX_PATTERN.test('#abcd')).toBe(false)
    expect(HEX_PATTERN.test('#aabbccdd')).toBe(false)
    expect(HEX_PATTERN.test('#12 456')).toBe(false)
    expect(HEX_PATTERN.test('#GGGGGG')).toBe(false)
    expect(HEX_PATTERN.test('')).toBe(false)
    expect(HEX_PATTERN.test('rgb(44,103,50)')).toBe(false)
  })

  it('rejects non-strings without throwing', () => {
    expect(HEX_PATTERN.test(undefined as unknown as string)).toBe(false)
    expect(HEX_PATTERN.test(null as unknown as string)).toBe(false)
    expect(HEX_PATTERN.test(123 as unknown as string)).toBe(false)
  })
})

describe('isHex', () => {
  it('mirrors the pattern and narrows the type', () => {
    expect(isHex('#2c6732')).toBe(true)
    expect(isHex('#2C6732')).toBe(true)
    expect(isHex('#fa0')).toBe(true)
    expect(isHex('fa0')).toBe(false)
    expect(isHex(42)).toBe(false)
  })
})

describe('parseHex', () => {
  it('parses six-digit hex', () => {
    expect(parseHex('#2C6732')).toEqual({ r: 0x2c, g: 0x67, b: 0x32 })
  })

  it('expands three-digit hex by doubling each digit', () => {
    expect(parseHex('#fa0')).toEqual({ r: 0xff, g: 0xaa, b: 0x00 })
    expect(parseHex('#123')).toEqual({ r: 0x11, g: 0x22, b: 0x33 })
  })

  it('returns null for anything else', () => {
    expect(parseHex('green')).toBeNull()
    expect(parseHex(undefined)).toBeNull()
    expect(parseHex('#24')).toBeNull()
  })
})

describe('normalizeHex', () => {
  it('upper-cases and stores six digits', () => {
    expect(normalizeHex('#2c6732')).toBe('#2C6732')
    expect(normalizeHex('#fa0')).toBe('#FFAA00')
    expect(normalizeHex('#FA0')).toBe('#FFAA00')
  })

  it('never returns an invalid value', () => {
    expect(normalizeHex('#zzzzzz')).toBeNull()
    expect(normalizeHex('')).toBeNull()
    expect(normalizeHex(null)).toBeNull()
  })
})

describe('formatHex', () => {
  it('clamps and pads channels', () => {
    expect(formatHex({ r: 44, g: 103, b: 50 })).toBe('#2C6732')
    expect(formatHex({ r: -5, g: 300, b: 17.4 })).toBe('#00FF11')
  })
})
