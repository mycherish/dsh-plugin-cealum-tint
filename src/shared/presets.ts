/**
 * The five presets, and the single source of truth mapping a colour to the
 * preset that displays it.
 */

/** One selectable preset. */
export interface Preset {
  /** Stable id stored in config. */
  readonly id: string
  /** English label; the settings page renders a localised name where provided. */
  readonly label: string
  /** Upper-case `#RRGGBB`. */
  readonly hex: string
}

/** Preset id used when the user supplies their own colour. */
export const CUSTOM_PRESET_ID = 'custom'

/** The five presets, in display order. */
export const PRESETS: readonly Preset[] = Object.freeze([
  { id: 'deep-green', label: 'Deep Green', hex: '#2C6732' },
  { id: 'ocean-blue', label: 'Ocean Blue', hex: '#245B82' },
  { id: 'purple', label: 'Purple', hex: '#604B83' },
  { id: 'amber', label: 'Amber', hex: '#805B26' },
  { id: 'graphite', label: 'Graphite', hex: '#414141' },
])

/**
 * Preset ids that existed in earlier builds, mapped to their current ids.
 * Stored configs written by an old build decode through this table so a rename
 * never strands a saved choice.
 */
export const PRESET_ID_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  'chatgpt-green': 'deep-green',
})

/** Map a possibly-legacy preset id to the current one. */
export function normalizePresetId(id: string): string {
  return PRESET_ID_ALIASES[id] ?? id
}

/** Preset ids, in display order. */
export const PRESET_IDS: readonly string[] = Object.freeze(PRESETS.map((preset) => preset.id))

/** Every value the `preset` config field accepts. */
export const PRESET_VALUES: readonly string[] = Object.freeze([...PRESET_IDS, CUSTOM_PRESET_ID])

/**
 * Look up a preset by id.
 * @param id - preset id.
 * @returns the preset, or `undefined` for `custom` and unknown ids.
 */
export function presetById(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id)
}

/**
 * Resolve the preset a colour belongs to.
 * @param hex - upper- or lower-case `#RRGGBB`.
 * @returns the matching preset id, or {@link CUSTOM_PRESET_ID}.
 */
export function presetIdForHex(hex: string): string {
  const target = hex.toUpperCase()
  return PRESETS.find((preset) => preset.hex === target)?.id ?? CUSTOM_PRESET_ID
}
