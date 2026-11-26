/**
 * Event-driven compatibility self-check.
 *
 * Design rule (DEVELOPMENT-PLAN §16.2): compatibility is *never* probed at
 * startup — a fresh page with no open conversation legitimately contains zero
 * `div[data-message-bubble]` nodes, so a synchronous probe would both false-
 * negative and couple style injection to DOM timing. Instead a
 * MutationObserver classifies nodes as they are actually added:
 *
 * - a node carrying (or containing) the marker `div[data-message-bubble]`
 *   proves this DSH build exposes the seam the plugin styles → `ok`;
 * - a user/steering seat (`[data-chat-flow-kind="user"|"steering"]`) arriving
 *   *without* such a descendant means the build renders user messages but no
 *   longer marks them → `missing` (stated once in the settings page while
 *   styles stay injected — nothing is ever blocked on this check);
 * - no message seen at all → `pending`, presented as "waiting", not an error.
 *
 * The monitor is a leaf, observable store with the same subscribe face the
 * settings store uses (`useSyncExternalStore`-compatible).
 */
import { BUBBLE_SELECTOR } from '../shared/protocol.ts'

/** Marker for seats that wrap a user's outgoing message or a steering note. */
const SEAT_SELECTOR = '[data-chat-flow-kind="user"],[data-chat-flow-kind="steering"]'

/** Self-check states, in upgrade order. */
export type CompatStatus = 'pending' | 'ok' | 'missing'

/** Observable snapshot of the additive self-check. */
export interface CompatSnapshot {
  readonly status: CompatStatus
}

/** The monitor's face. */
export interface CompatMonitor {
  /** @returns the current snapshot (stable reference between changes). */
  getSnapshot(): CompatSnapshot
  /** @returns the disposer removing a listener. */
  subscribe(listener: () => void): () => void
  /** Start observing; idempotent. @returns the disposer stopping the scan. */
  observe(): () => void
}

/**
 * Does this node (or a descendant) carry the user bubble marker?
 * @param root - candidate element.
 * @returns true when the marker is present.
 */
function carriesBubble(root: Element): boolean {
  return root.matches(BUBBLE_SELECTOR) || root.querySelector(BUBBLE_SELECTOR) !== null
}

/**
 * Does this node (or a descendant) contain a user/steering seat that lacks the
 * bubble marker?
 * @param root - candidate element.
 * @returns true when such a seat exists.
 */
function carriesMarkedSeatWithoutBubble(root: Element): boolean {
  const seats = root.matches(SEAT_SELECTOR) ? [root] : [...root.querySelectorAll(SEAT_SELECTOR)]
  return seats.some((seat) => !carriesBubble(seat))
}

/**
 * Create the monitor over the live document.
 * @param target - observed root; the document body unless overridden (tests).
 * @returns the monitor.
 */
export function createCompatMonitor(target: ParentNode = document.body): CompatMonitor {
  let mutableStatus: CompatStatus = 'pending'
  let sawBubble = false
  const listeners = new Set<() => void>()
  const snapshot: CompatSnapshot = {
    get status() {
      return mutableStatus
    },
  }

  const publish = (): void => {
    for (const listener of [...listeners]) listener()
  }

  const scan = (root: Element): void => {
    if (carriesBubble(root)) {
      sawBubble = true
      return
    }
    // No bubble in this node: only a seat proves anything is missing.
    if (!sawBubble && carriesMarkedSeatWithoutBubble(root)) mutableStatus = 'missing'
  }

  let observer: MutationObserver | undefined

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    observe() {
      if (observer !== undefined) return () => {}
      observer = new MutationObserver((mutations) => {
        let dirty = false
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue
            scan(node as Element)
            dirty = true
          }
        }
        if (sawBubble && mutableStatus !== 'ok') {
          mutableStatus = 'ok'
          dirty = true
        }
        if (dirty) publish()
      })
      observer.observe(target, { childList: true, subtree: true })
      return () => {
        observer?.disconnect()
        observer = undefined
      }
    },
  }
}
