/**
 * Typed, best-effort access to the browser module table's ui primitives.
 *
 * The page provides these modules; nothing is bundled. One import site, one
 * try/catch: if a deployment stops exposing a primitive this plugin still
 * mounts — the settings page degrades to plain elements carrying the same
 * data attributes, and the bubble stylesheet is unaffected.
 *
 * Every prop contract below was read off the *shipped* minified code that
 * serves this module table (evidence: `dsh-web-frontend/dist/assets/
 * index-Ciz7DZxv.js` in the installed 0.2.2-rc.5), not guessed:
 * - `UserMessageBubble` forwards all props + children onto a `div` with the
 *   host bubble class (the caller adds `data-message-bubble`; that is what
 *   the chat package does in `UserContent.tsx`);
 * - `Switch` = `{checked, onChange, label?, disabled?, title?, className?}`
 *   rendered on a `button[role="switch"]`;
 * - `SegmentedControl` = `{value, options[{value,label,disabled?}], onChange,
 *   label?, disabled?, className?, id?}`;
 * - `Input` = `forwardRef({icon?, className?, ...<input> props})`.
 */
import type * as React from 'react'

/** The verified subset this plugin consumes. */
export interface Primitives {
  readonly UserMessageBubble?: (
    props: {
      children?: React.ReactNode
      className?: string
    } & Record<string, unknown>,
  ) => React.ReactNode
  readonly Switch?: (props: {
    checked: boolean
    onChange: (next: boolean) => void
    label?: string
    disabled?: boolean
    title?: string
    className?: string
  }) => React.ReactNode
  readonly SegmentedControl?: (props: {
    value: string
    options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>
    onChange: (value: string) => void
    label?: string
    disabled?: boolean
    className?: string
    id?: string
  }) => React.ReactNode
  readonly Input?: React.ForwardRefExoticComponent<
    { icon?: React.ReactNode; className?: string } & React.InputHTMLAttributes<HTMLInputElement> &
      React.RefAttributes<HTMLInputElement>
  >
  readonly Button?: (
    props: {
      variant?: 'ghost' | 'primary' | 'danger' | string
      size?: 'sm' | 'md' | 'lg' | string
      icon?: React.ReactNode
      className?: string
      children?: React.ReactNode
    } & React.ButtonHTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode
}

/** Lazily resolved cache; `null` settles a failed load. */
let cache: Primitives | null | undefined

/**
 * Load the primitives module table entry once.
 * @returns the verified subset, or `null` when unavailable.
 */
export function loadPrimitives(): Primitives | null {
  if (cache !== undefined) return cache
  try {
    // The browser module table serves this id; esbuild keeps it external.
    const mod = require('@deepseek-ai/dsh-client-ui-primitives') as Partial<Primitives> | undefined
    cache = mod !== null && typeof mod === 'object' ? (mod as Primitives) : null
  } catch {
    cache = null
  }
  return cache
}
