/**
 * Optimistic settings store in front of the Host `ConfigForm`.
 *
 * Writes are queued through the Host so they persist in the profile's user
 * layer; the local draft is published immediately so the bubble (and the
 * preview) react on the same frame the user clicks. A refreshed snapshot is
 * adopted only when no write is in flight, so a late echo cannot revert a newer
 * local choice.
 */
import { autoTextColor } from '../shared/contrast.ts'
import { normalizeHex } from '../shared/hex.ts'
import {
  CUSTOM_PRESET_ID,
  normalizePresetId,
  PRESETS,
  presetIdForHex,
  PRESET_VALUES,
} from '../shared/presets.ts'
import {
  DEFAULT_BUBBLE_COLOR,
  DEFAULT_PRESET,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_MODE,
  FIELD,
  type TextMode,
} from '../shared/protocol.ts'

/** The settings as the UI consumes them (always normalised and valid). */
export interface SettingsView {
  enabled: boolean
  preset: string
  bubbleColor: string
  textMode: TextMode
  textColor: string
}

/** Minimal `ConfigForm` surface this store needs. */
export interface ConfigFormLike {
  getSnapshot(): { value: unknown }
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<boolean>
  unset(field: string): Promise<boolean>
}

/** Readable snapshot source for React's `useSyncExternalStore`. */
export interface SettingsStore {
  getSnapshot(): SettingsView
  subscribe(listener: () => void): () => void
  /** Apply a patch optimistically and persist it. */
  update(patch: Partial<SettingsView>): Promise<void>
  /** Clear every owned field back to its schema default. */
  reset(): Promise<void>
}

/**
 * Decode a raw config section into a valid view, replacing anything unusable.
 * @param value - raw `ConfigForm` value.
 * @returns the normalised view.
 */
export function decodeSettings(value: unknown): SettingsView {
  const record =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const bubbleColor = normalizeHex(record[FIELD.bubbleColor]) ?? DEFAULT_BUBBLE_COLOR
  const textModeRaw = record[FIELD.textMode]
  const textMode: TextMode = textModeRaw === 'custom' ? 'custom' : DEFAULT_TEXT_MODE
  const textColor = normalizeHex(record[FIELD.textColor]) ?? DEFAULT_TEXT_COLOR
  const presetRaw = record[FIELD.preset]
  const presetCandidate =
    typeof presetRaw === 'string' ? normalizePresetId(presetRaw) : presetIdForHex(bubbleColor)
  return {
    enabled: record[FIELD.enabled] !== false,
    preset: PRESET_VALUES.includes(presetCandidate) ? presetCandidate : presetIdForHex(bubbleColor),
    bubbleColor,
    textMode,
    textColor,
  }
}

/**
 * The colour actually painted behind a bubble colour.
 * @param view - current settings.
 * @returns upper-case `#RRGGBB` for the bubble text.
 */
export function effectiveTextColor(view: SettingsView): string {
  if (view.textMode === 'custom')
    return normalizeHex(view.textColor) ?? autoTextColor(view.bubbleColor)
  return autoTextColor(view.bubbleColor)
}

/**
 * Create the optimistic store over one Host config form.
 * @param form - the `ConfigForm` for this plugin's namespace.
 * @returns the store.
 */
export function createSettingsStore(form: ConfigFormLike): SettingsStore {
  let view = decodeSettings(form.getSnapshot().value)
  const listeners = new Set<() => void>()
  let pending = 0

  const publish = (next: SettingsView): void => {
    view = next
    for (const listener of [...listeners]) listener()
  }

  const adopt = (): void => {
    if (pending > 0) return
    publish(decodeSettings(form.getSnapshot().value))
  }

  form.subscribe(adopt)

  const write = async (operations: ReadonlyArray<() => Promise<boolean>>): Promise<void> => {
    pending += 1
    let accepted = true
    try {
      const results = await Promise.all(operations.map((operation) => operation()))
      accepted = results.every((result) => result !== false)
    } catch {
      accepted = false
    } finally {
      pending -= 1
    }
    if (!accepted) {
      // The Host refused (or skipped) a write, or the transport failed: drop
      // the optimistic draft and fall back to the last Host-known decode.
      publish(decodeSettings(form.getSnapshot().value))
    }
    // Accepted writes keep the optimistic view; the Host confirms through an
    // idle echo, which `adopt` picks up only after `pending` is back to zero.
  }

  return {
    getSnapshot: () => view,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async update(patch) {
      const next: SettingsView = { ...view, ...patch }
      // Keep preset and colour coherent: an explicit colour chooses its preset.
      if (patch.bubbleColor !== undefined && patch.preset === undefined) {
        next.preset = presetIdForHex(next.bubbleColor)
      }
      if (
        patch.preset !== undefined &&
        patch.preset !== CUSTOM_PRESET_ID &&
        patch.bubbleColor === undefined
      ) {
        const presetHex = presetIdForHexForced(patch.preset)
        if (presetHex !== null) next.bubbleColor = presetHex
      }
      publish(next)
      const fields: Array<[string, unknown]> = []
      for (const [field, value] of Object.entries(patch)) {
        if (field === FIELD.bubbleColor && patch.bubbleColor !== undefined) {
          fields.push([FIELD.bubbleColor, next.bubbleColor])
        } else if (field === FIELD.preset && patch.preset !== undefined) {
          fields.push([FIELD.preset, next.preset])
        } else {
          fields.push([field, value])
        }
      }
      if (
        patch.preset !== undefined &&
        patch.bubbleColor === undefined &&
        next.preset !== CUSTOM_PRESET_ID
      ) {
        fields.push([FIELD.bubbleColor, next.bubbleColor])
      }
      await write(
        fields.map(
          ([field, value]) =>
            () =>
              form.set(field, value),
        ),
      )
    },
    async reset() {
      const defaults: SettingsView = {
        enabled: true,
        preset: DEFAULT_PRESET,
        bubbleColor: DEFAULT_BUBBLE_COLOR,
        textMode: DEFAULT_TEXT_MODE,
        textColor: DEFAULT_TEXT_COLOR,
      }
      publish(defaults)
      const fields = [
        FIELD.enabled,
        FIELD.preset,
        FIELD.bubbleColor,
        FIELD.textMode,
        FIELD.textColor,
      ]
      await write(fields.map((field) => () => form.unset(field)))
    },
  }
}

/**
 * Preset id to colour, ignoring the `custom` id.
 * @param id - preset id.
 * @returns the preset colour or `null` when unknown.
 */
function presetIdForHexForced(id: string): string | null {
  if (id === CUSTOM_PRESET_ID) return null
  const probe = presetIdForHex(id.length > 0 ? presetHexOf(id) : '')
  return probe === id ? presetHexOf(id) : null
}

/**
 * Look up a preset colour by id.
 * @param id - preset id.
 * @returns upper-case `#RRGGBB`, or `''` when unknown.
 */
function presetHexOf(id: string): string {
  const found = PRESET_HEX[id]
  return found ?? ''
}

const PRESET_HEX: Record<string, string> = Object.freeze(
  Object.fromEntries(PRESETS.map((preset) => [preset.id, preset.hex])),
)
