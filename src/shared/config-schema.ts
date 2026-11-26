/**
 * The plugin's configuration schema, owned by the Host half.
 *
 * Every field is `.volatile()`: DSH then treats the entry as live-editable
 * without remounting the plugin, while writes still travel the ordinary
 * `configEditor` path into the profile's user configuration layer — so hot
 * updates and persistence hold at the same time (see DEVELOPMENT-PLAN §16.5).
 *
 * All five fields must stay volatile: `SettingsService.describe()` only lists
 * entries that own at least one volatile field, and that listing is what makes
 * the namespace reachable from the browser half via `ctx.configForms`.
 */
import z from '@deepseek-ai/schemastery'
import { HEX_PATTERN } from './hex.ts'
import { PRESET_VALUES } from './presets.ts'
import {
  DEFAULT_BUBBLE_COLOR,
  DEFAULT_PRESET,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_MODE,
  FIELD,
  TEXT_MODES,
} from './protocol.ts'

/** Resolved configuration shape (volatile fields excluded). */
export interface CealumTintConfig {
  enabled: boolean
  preset: string
  bubbleColor: string
  textMode: string
  textColor: string
}

/** Defaults, mirrored as plain values for tests and for defensive decoding. */
export const CONFIG_DEFAULTS: CealumTintConfig = Object.freeze({
  [FIELD.enabled]: true,
  [FIELD.preset]: DEFAULT_PRESET,
  [FIELD.bubbleColor]: DEFAULT_BUBBLE_COLOR,
  [FIELD.textMode]: DEFAULT_TEXT_MODE,
  [FIELD.textColor]: DEFAULT_TEXT_COLOR,
})

/** Host configuration schema for this bundle's single Loader row. */
export const Config = z.object({
  [FIELD.enabled]: z.boolean().default(true).volatile(),
  [FIELD.preset]: z
    .union([...PRESET_VALUES])
    .default(DEFAULT_PRESET)
    .volatile(),
  [FIELD.bubbleColor]: z.string().pattern(HEX_PATTERN).default(DEFAULT_BUBBLE_COLOR).volatile(),
  [FIELD.textMode]: z
    .union([...TEXT_MODES])
    .default(DEFAULT_TEXT_MODE)
    .volatile(),
  [FIELD.textColor]: z.string().pattern(HEX_PATTERN).default(DEFAULT_TEXT_COLOR).volatile(),
})
