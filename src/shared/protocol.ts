/**
 * Contract shared by both halves: identifiers, the config field names, the CSS
 * the plugin owns, and the selector the stylesheet hooks into.
 *
 * Everything here is derived from the audit recorded in
 * `docs/DEVELOPMENT-PLAN.md` §4 — in particular the two chat seams the
 * stylesheets hook into: {@link BUBBLE_SELECTOR}, the semantic marker the
 * shipped chat UI puts on a manual user message bubble
 * (`dsh-client-ui-chat/src/client/chat/UserContent.tsx`), and
 * {@link QUESTION_REPLY_SELECTOR}, the answered confirmation-flow bubble
 * (`dsh-client-ui-user-questions/src/.../QuestionReplyView.tsx`).
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

/** The only manual-message selector the plugin styles. */
export const BUBBLE_SELECTOR = 'div[data-message-bubble]'

/**
 * Selector for an *answered* question-reply bubble (confirmation-flow answers,
 * rendered by `dsh-client-ui-user-questions` → `QuestionReplyView.tsx`).
 *
 * Structure verified in DSH 0.2.2-rc.5 (first-party TSX, children order fixed
 * by the renderer):
 *
 * ```
 * div.row[data-question-reply][data-reply-outcome]   ← full-width row; also
 *   │                                                   holds .actions (time + copy)
 *   └─ div.bubbleWidth                               ← width limiter (no radius/padding):
 *      └─ UserMessageBubble root                     ← ★ the real painted bubble
 * ```
 *
 * Only the innermost element may be painted: the row spans the full width and
 * carries the actions row, and the width limiter has no rounding/padding, so
 * either would visibly repaint non-bubble chrome. The real bubble carries no
 * stable marker of its own (the caller omits `data-message-bubble`), so the
 * selector anchors on the outer semantic `data-reply-outcome="answered"`
 * marker plus the static two-step hierarchy (row's first `div` child → its
 * first child)². The `answered` guard means pending / dismissed question cards
 * can never match.
 *
 * Failure mode is colour loss, never mis-paint: if the host adds a sibling
 * inside the row or wraps the bubble, the descendant chain stops matching and
 * the element simply keeps its host styling.
 */
export const QUESTION_REPLY_SELECTOR =
  'div[data-reply-outcome="answered"] > div:first-child > :first-child'

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

/**
 * The answered question-reply rule, byte-for-byte the same declaration block
 * and fallback tokens as {@link BUBBLE_CSS}, so both surfaces share the exact
 * custom-property contract written by `color-binding.ts` (custom background,
 * auto/legacy/explicit text colour, same `--dsw-*` theme fallbacks).
 *
 * Kept as a separate stylesheet — not appended to {@link BUBBLE_CSS} — so the
 * reviewed manual-message rule locked verbatim by
 * `tests/config-schema.test.ts` ("locks the reviewed stylesheet text") is
 * never re-spelled, and so a future host change under
 * {@link QUESTION_REPLY_SELECTOR} can be retired independently. Installed by
 * `installStyleSheets()` as its own `cealum-tint/question-reply.css` tag and
 * removed by the same disposer (see `style-tag.ts`).
 */
export const QUESTION_REPLY_CSS = `${QUESTION_REPLY_SELECTOR}{background-color:var(${VAR_BUBBLE_BG}, var(--dsw-specific-bubble));color:var(${VAR_BUBBLE_FG}, var(--dsw-alias-label-primary))}`
