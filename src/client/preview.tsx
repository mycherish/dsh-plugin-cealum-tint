/**
 * Live preview of a user bubble.
 *
 * The preview is the *real* seam: a `div[data-message-bubble]` (rendered by
 * the host primitive when available, otherwise a plain `div` with the same
 * marker), so whatever the plugin stylesheet does to the chat is exactly what
 * the preview does — including falling back to the native bubble when the
 * feature is off. Per DEVELOPMENT-PLAN §16.4 the text goes through
 * `{children}`; no `UserTextRun`, whose props are unverified.
 */
import type * as React from 'react'
import { loadPrimitives } from './primitives.ts'

/** Preview props. */
export interface PreviewProps {
  /** The localised sample message text. */
  text: string
}

/**
 * Render one truthful sample bubble.
 * @param props - the preview text.
 * @returns the preview element.
 */
export function MessagePreview({ text }: PreviewProps): React.ReactElement {
  const primitive = loadPrimitives()
  const Bubble = primitive?.UserMessageBubble
  if (Bubble !== undefined) {
    return <Bubble data-message-bubble="">{text}</Bubble>
  }
  // Degraded path: same marker, native class inferred from the plugin rule.
  return (
    <div
      data-message-bubble=""
      style={{ padding: '10px 16px', borderRadius: 'var(--dsw-radius-lg)' }}
    >
      {text}
    </div>
  )
}
