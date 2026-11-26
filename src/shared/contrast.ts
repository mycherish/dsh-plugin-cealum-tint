/**
 * WCAG 2.x contrast helpers.
 *
 * Relative luminance linearises each sRGB channel before weighting it, which is
 * what makes the black/white choice below match the WCAG contrast ratios a
 * reader actually perceives. No approximations, no gamma shortcuts.
 */
import { parseHex, type Rgb } from './hex.ts'

/** Opaque white. */
export const WHITE = '#FFFFFF'
/** Opaque black. */
export const BLACK = '#000000'

/** sRGB linearisation threshold, WCAG 2.x. */
const LINEAR_THRESHOLD = 0.03928

/**
 * Linearise one 8-bit sRGB channel.
 * @param channel - 0..255 channel value.
 * @returns the linear-light channel in 0..1.
 */
export function lineariseChannel(channel: number): number {
  const value = channel / 255
  return value <= LINEAR_THRESHOLD ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

/**
 * WCAG relative luminance of an sRGB colour.
 * @param rgb - 8-bit channels.
 * @returns relative luminance in 0..1.
 */
export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * lineariseChannel(rgb.r) +
    0.7152 * lineariseChannel(rgb.g) +
    0.0722 * lineariseChannel(rgb.b)
  )
}

/**
 * WCAG contrast ratio between two HEX colours.
 * @param foreground - `#RGB` or `#RRGGBB`.
 * @param background - `#RGB` or `#RRGGBB`.
 * @returns the ratio in 1..21, or `null` when either colour is invalid.
 */
export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHex(foreground)
  const bg = parseHex(background)
  if (fg === null || bg === null) return null
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg))
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg))
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Pick the readable text colour for a bubble background.
 * @param background - bubble background `#RGB` or `#RRGGBB`.
 * @returns `#FFFFFF` or `#000000`; `#FFFFFF` when the background is invalid.
 */
export function autoTextColor(background: string): string {
  const againstWhite = contrastRatio(WHITE, background)
  const againstBlack = contrastRatio(BLACK, background)
  if (againstWhite === null || againstBlack === null) return WHITE
  return againstWhite >= againstBlack ? WHITE : BLACK
}

/**
 * WCAG conformance label for a ratio, using the AA/AAA normal-text thresholds.
 * @param ratio - contrast ratio, or `null` when unknown.
 * @returns a short label keyed for the settings page.
 */
export function contrastGrade(ratio: number | null): 'aaa' | 'aa' | 'fail' | 'unknown' {
  if (ratio === null) return 'unknown'
  if (ratio >= 7) return 'aaa'
  if (ratio >= 4.5) return 'aa'
  return 'fail'
}
