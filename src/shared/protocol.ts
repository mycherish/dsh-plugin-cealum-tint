/**
 * Contract shared by both halves: identifiers, the config field names, the CSS
 * the plugin owns, and the selector the stylesheet hooks into.
 *
 * Everything here is derived from the audit recorded in
 * `docs/DEVELOPMENT-PLAN.md` §4 — in particular {@link BUBBLE_SELECTOR}, the one
 * semantic marker the shipped chat UI puts on a user message bubble
 * (`dsh-client-ui-chat/src/client/chat/UserContent.tsx`).
 */

/** npm package name. */
export const PACKAGE_NAME = 'dsh-plugin-cealum-tint'

/**
 * Bundle identity: the `cordis.patch.yml` row id *and* the settings namespace.
 * DSH derives the namespace from the Loader entry id, so these must stay equal.
 */
export const PLUGIN_ID = 'cealum-tint'

/** Prefix for every CSS class, custom property and style-tag id this plugin owns. */
export const CSS_PREFIX = 'cealum-tint-'

/** Custom property carrying the bubble background. */
export const VAR_BUBBLE_BG = '--cealum-tint-user-bg'
/** Custom property carrying the bubble text colour. */
export const VAR_BUBBLE_FG = '--cealum-tint-user-fg'

/** The only selector the plugin styles. */
export const BUBBLE_SELECTOR = 'div[data-message-bubble]'

/** Config field names, exactly as declared in the Host schema. */
export const FIELD = {
  enabled: 'enabled',
  preset: 'preset',
  bubbleColor: 'bubbleColor',
  textMode: 'textMode',
  textColor: 'textColor',
} as const

/** Text colour modes. */
export const TEXT_MODES = ['auto', 'custom'] as const
/** Union of the accepted text colour modes. */
export type TextMode = (typeof TEXT_MODES)[number]

/** Default bubble background (deep green). */
export const DEFAULT_BUBBLE_COLOR = '#2C6732'
/** Default explicit text colour. */
export const DEFAULT_TEXT_COLOR = '#FFFFFF'
/** Default preset id. */
export const DEFAULT_PRESET = 'deep-green'
/** Default text mode. */
export const DEFAULT_TEXT_MODE: TextMode = 'auto'

/**
 * The stylesheet the plugin owns.
 *
 * Both declarations carry a two-level fallback: if the plugin's custom property
 * is absent (feature switched off, or the style tag outliving its binder), the
 * bubble keeps the host's own token. Long-hand `background-color` is used on
 * purpose so a future host `background-image` layer survives.
 */
export const BUBBLE_CSS = `${BUBBLE_SELECTOR}{background-color:var(${VAR_BUBBLE_BG}, var(--dsw-specific-bubble));color:var(${VAR_BUBBLE_FG}, var(--dsw-alias-label-primary))}`
