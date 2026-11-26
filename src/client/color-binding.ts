/**
 * The colour binder: the one place that writes the plugin's custom properties,
 * on `document.documentElement` so every `div[data-message-bubble]` in the
 * document inherits them.
 *
 * The values captured at creation time are restored exactly on dispose —
 * inline styles that existed before the plugin ran stay untouched, and inline
 * styles the plugin introduced are removed — so deactivating the plugin (or
 * flipping the config off, which removes both properties) restores the host's
 * own `var(--dsw-specific-bubble)` fallback through the stylesheet.
 */
import { VAR_BUBBLE_BG, VAR_BUBBLE_FG } from '../shared/protocol.ts'
import { effectiveTextColor, type SettingsView } from './store.ts'

/** The binding's write face. It never reads back mid-flight. */
export interface ColorBinding {
  /** Push the current view into the document's inline custom properties. */
  apply(view: SettingsView): void
  /** Restore the captured pre-plugin inline state and stop. */
  dispose(): void
}

/** Property name to original inline value (`null` when there was none). */
type Originals = Map<string, string | null>

/**
 * Create the binder over `document.documentElement`.
 * @returns the binder.
 */
export function createColorBinding(): ColorBinding {
  const surface = document.documentElement
  const originals: Originals = new Map([
    [VAR_BUBBLE_BG, surface.style.getPropertyValue(VAR_BUBBLE_BG)],
    [VAR_BUBBLE_FG, surface.style.getPropertyValue(VAR_BUBBLE_FG)],
  ])
  return {
    apply(view) {
      if (!view.enabled) {
        // Feature off → no properties at all: the stylesheet's own fallbacks
        // (`var(--dsw-specific-bubble)` / `var(--dsw-alias-label-primary)`)
        // repaint every bubble with the host's native colours.
        surface.style.removeProperty(VAR_BUBBLE_BG)
        surface.style.removeProperty(VAR_BUBBLE_FG)
        return
      }
      surface.style.setProperty(VAR_BUBBLE_BG, view.bubbleColor)
      surface.style.setProperty(VAR_BUBBLE_FG, effectiveTextColor(view))
    },
    dispose() {
      for (const [name, value] of originals) {
        if (value === null || value === '') surface.style.removeProperty(name)
        else surface.style.setProperty(name, value)
      }
      originals.clear()
    },
  }
}
