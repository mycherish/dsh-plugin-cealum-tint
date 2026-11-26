/**
 * HEX colour parsing shared by the Host schema and the browser half.
 *
 * The Host validates with {@link HEX_PATTERN}; the browser half normalises with
 * {@link normalizeHex} before any value reaches a CSS variable, so an invalid
 * colour can never be written into the page.
 */

/** Parsed 8-bit sRGB channels. */
export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** Accepted input: `#RGB` or `#RRGGBB`. A leading `#` is required. */
export const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Pattern source for the Schemastery `.pattern()` call (kept in sync with {@link HEX_PATTERN}). */
export const HEX_PATTERN_SOURCE = HEX_PATTERN.source

/**
 * Whether a value is a HEX colour string accepted by this plugin.
 * @param value - candidate value.
 * @returns true when the value is a string matching {@link HEX_PATTERN}.
 */
export function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_PATTERN.test(value)
}

/**
 * Parse a HEX colour into 8-bit channels.
 * @param value - `#RGB` or `#RRGGBB`.
 * @returns the channels, or `null` when the value is not an accepted HEX colour.
 */
export function parseHex(value: unknown): Rgb | null {
  if (!isHex(value)) return null
  const digits = value.slice(1)
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

/**
 * Normalise a HEX colour to upper-case six digits.
 * @param value - `#RGB` or `#RRGGBB`.
 * @returns `#RRGGBB`, or `null` when the value is not an accepted HEX colour.
 */
export function normalizeHex(value: unknown): string | null {
  if (!isHex(value)) return null
  const digits = value.slice(1)
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits
  return `#${full.toUpperCase()}`
}

/**
 * Serialise channels back to `#RRGGBB`.
 * @param rgb - channels to serialise.
 * @returns the upper-case HEX string.
 */
export function formatHex(rgb: Rgb): string {
  const part = (channel: number): string =>
    Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, '0')
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`.toUpperCase()
}
