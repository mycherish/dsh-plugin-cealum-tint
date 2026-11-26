/**
 * The plugin's stylesheets, installed exactly the way the shipped theme
 * package does (`dsh-client-ui-theme/src/client/styles.ts`): one `<style>`
 * element per logical file, marked with `data-plugin` / `data-plugin-css`,
 * appended to `<head>`, and removed on dispose.
 *
 * DSH additionally tears down any `<style data-plugin="…">` left behind by a
 * crashed client half (`removeOwnedStyles` in `dsh-client-modules`), so the
 * markers below are both documentation and the cleanup contract.
 */
import { BUBBLE_CSS, PLUGIN_ID, QUESTION_REPLY_CSS } from '../shared/protocol.ts'

/**
 * Styles for the plugin's own settings page. Strictly scoped under the
 * `cealum-tint-` class prefix; the only elements this sheet can affect are the
 * ones this plugin renders.
 */
export const SECTION_CSS = `
.cealum-tint-section{display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary)}
.cealum-tint-status{display:flex;flex-direction:column;gap:4px}
.cealum-tint-status-main{font-size:13px;font-weight:600}
.cealum-tint-status-sub{font-size:12px;color:var(--dsw-alias-label-secondary)}
.cealum-tint-card{display:flex;flex-direction:column;gap:12px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}
.cealum-tint-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.cealum-tint-rowlabel{display:flex;flex-direction:column;gap:2px;min-width:0}
.cealum-tint-rowtitle{font-size:13px;font-weight:600}
.cealum-tint-rowhint{font-size:12px;color:var(--dsw-alias-label-secondary)}
.cealum-tint-preview-stage{display:flex;justify-content:flex-end;padding:14px 16px;border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-2)}
.cealum-tint-presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
.cealum-tint-swatch{appearance:none;display:flex;flex-direction:column;gap:6px;align-items:flex-start;padding:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
.cealum-tint-swatch:hover{background:var(--dsw-alias-interactive-bg-hover)}
.cealum-tint-swatchchip{width:100%;height:28px;border-radius:var(--dsw-radius-sm);border:1px solid rgba(0,0,0,.08)}
.cealum-tint-swatchname{font-size:12px;line-height:1.2;text-align:left}
.cealum-tint-swatch[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.cealum-tint-hexrow{display:flex;align-items:center;gap:8px}
.cealum-tint-colorwell{appearance:none;width:34px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);cursor:pointer}
.cealum-tint-invalid{font-size:12px;color:var(--dsw-alias-label-error)}
.cealum-tint-contrast{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.cealum-tint-gradepill{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid var(--dsw-alias-border-l2)}
.cealum-tint-reset{align-self:flex-start;display:flex;flex-direction:column;gap:4px}
`.trim()

/**
 * Install one `<style>` element carrying the given CSS.
 * @param css - stylesheet text.
 * @param logicalName - value for `data-plugin-css`, mirroring a file path.
 * @returns the disposer removing the element.
 */
export function installStyleTag(css: string, logicalName: string): () => void {
  const tag = document.createElement('style')
  tag.dataset.plugin = PLUGIN_ID
  tag.dataset.pluginCss = logicalName
  tag.textContent = css
  document.head.appendChild(tag)
  return () => {
    tag.remove()
  }
}

/**
 * Install every stylesheet the plugin owns: the manual-message bubble rule,
 * the answered question-reply rule, then the settings-page chrome. All three
 * carry the plugin marker so a crashed client half leaves nothing behind
 * (DSH's `removeOwnedStyles` also sweeps `data-plugin="cealum-tint"` tags).
 * @returns the disposer removing all three elements.
 */
export function installStyleSheets(): () => void {
  const bubble = installStyleTag(BUBBLE_CSS, `${PLUGIN_ID}/user-bubble.css`)
  const questionReply = installStyleTag(QUESTION_REPLY_CSS, `${PLUGIN_ID}/question-reply.css`)
  const section = installStyleTag(SECTION_CSS, `${PLUGIN_ID}/section.css`)
  return () => {
    section()
    questionReply()
    bubble()
  }
}
