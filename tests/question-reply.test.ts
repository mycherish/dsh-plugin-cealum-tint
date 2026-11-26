/**
 * Question-reply tint: an AI confirmation-flow answer must receive the same
 * custom background as a manual user message.
 *
 * All DOM facts asserted here were read from the shipped DSH 0.2.2-rc.5
 * source (`dsh-client-ui-user-questions` → `QuestionReplyView.tsx`): the row
 * `div[data-question-reply][data-reply-outcome]` spans the full width and
 * carries the time/copy actions; its first `div` child (`bubbleWidth`) is a
 * bare width limiter; and the *real* bubble is the limiter's only child, a
 * `UserMessageBubble` root with no marker of its own. Painting anything above
 * the bubble root would visibly repaint non-bubble chrome — hence the strict
 * selector and the negative assertions below.
 *
 * The parts that need real pixels (computed colours, dark/light switching)
 * are covered by the manual GUI checklist in `docs/DELIVERY-REPORT.md` §11 —
 * they are not approximated here.
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  BUBBLE_CSS,
  BUBBLE_SELECTOR,
  CSS_PREFIX,
  QUESTION_REPLY_CSS,
  QUESTION_REPLY_SELECTOR,
  VAR_BUBBLE_BG,
  VAR_BUBBLE_FG,
} from '../src/shared/protocol.ts'
import { SECTION_CSS, installStyleSheets } from '../src/client/style-tag.ts'

/** Declarations of a one-rule sheet, selector stripped. */
const declarationsOf = (css: string): string => {
  const open = css.indexOf('{')
  expect(open, `sheet must have one rule: ${css}`).toBeGreaterThan(0)
  expect(css.endsWith('}'), `sheet must end with its rule: ${css}`).toBe(true)
  expect(css.indexOf('{'), 'sheet must contain exactly one rule').toBe(css.lastIndexOf('{'))
  return css.slice(open + 1, -1)
}

describe('question-reply selector', () => {
  it('anchors on the answered outcome marker, not the question row', () => {
    expect(QUESTION_REPLY_SELECTOR).toBe(
      'div[data-reply-outcome="answered"] > div:first-child > :first-child',
    )
    // The row marker would paint the full-width row including the actions.
    expect(QUESTION_REPLY_SELECTOR).not.toContain('[data-question-reply')
  })

  it('paints only the inner bubble (two child steps below the row)', () => {
    const steps = QUESTION_REPLY_SELECTOR.split('>').length - 1
    expect(steps).toBe(2)
    expect(QUESTION_REPLY_SELECTOR.endsWith(':first-child')).toBe(true)
  })

  it('can never match pending or dismissed question cards', () => {
    // The only keyed attribute value in the selector is `answered`.
    const values = [...QUESTION_REPLY_SELECTOR.matchAll(/="([^"]*)"/g)].map((m) => m[1])
    expect(values).toEqual(['answered'])
  })

  it('stays distinct from the manual-message marker', () => {
    expect(BUBBLE_SELECTOR).toBe('div[data-message-bubble]')
    expect(QUESTION_REPLY_SELECTOR).not.toBe(BUBBLE_SELECTOR)
  })
})

describe('question-reply stylesheet', () => {
  it('locks the answered-rule text verbatim', () => {
    expect(QUESTION_REPLY_CSS).toBe(
      'div[data-reply-outcome="answered"] > div:first-child > :first-child{' +
        'background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));' +
        'color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary))}',
    )
  })

  it('shares the manual rule’s declaration block byte for byte', () => {
    // Same vars = same custom colour, same text-colour mode, same fallbacks.
    expect(declarationsOf(QUESTION_REPLY_CSS)).toBe(declarationsOf(BUBBLE_CSS))
    expect(QUESTION_REPLY_CSS).toContain(`var(${VAR_BUBBLE_BG}, `)
    expect(QUESTION_REPLY_CSS).toContain(`var(${VAR_BUBBLE_FG}, `)
  })

  it('inherits the two theme tokens so dark and light both degrade safely', () => {
    // Visual switching across themes stays a GUI-check item; what is provable
    // here is that the fallbacks are the same DSH tokens the manual rule uses,
    // not hard-coded colours.
    expect(QUESTION_REPLY_CSS).toContain('var(--dsw-specific-bubble)')
    expect(QUESTION_REPLY_CSS).toContain('var(--dsw-alias-label-primary)')
    expect(QUESTION_REPLY_CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(QUESTION_REPLY_CSS).not.toContain('!important')
  })

  it('keeps every other chat surface untouched', () => {
    for (const foreign of ['assistant', 'markdown', 'approval', 'tool', '[data-question-reply']) {
      expect(QUESTION_REPLY_CSS, `must not style ${foreign}`).not.toContain(foreign)
    }
    // Both sheets still carry the namespace in their vars and nothing else.
    expect(QUESTION_REPLY_CSS).toContain(`var(--${CSS_PREFIX}user-bg`)
    expect(QUESTION_REPLY_CSS).toContain(`var(--${CSS_PREFIX}user-fg`)
  })

  it('leaves the reviewed manual-message rule exactly as shipped', () => {
    expect(BUBBLE_CSS).toBe(
      'div[data-message-bubble]{' +
        'background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));' +
        'color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary))}',
    )
    expect(SECTION_CSS.startsWith('.cealum-tint-section{')).toBe(true)
  })
})

/**
 * `vitest` runs in the plain node environment (no DOM), so the lifecycle test
 * installs a minimal fake `document` and exercises the real
 * `installStyleSheets()` / disposer pair — no DOM library, no new dependency.
 */
interface FakeNode {
  dataset: Record<string, string>
  textContent: string
  remove(): void
}

function withFakeDocument(): FakeNode[] {
  const tags: FakeNode[] = []
  const documentLike = {
    head: {
      appendChild(node: FakeNode): void {
        tags.push(node)
      },
    },
    createElement(): FakeNode {
      const node: FakeNode = {
        dataset: {},
        textContent: '',
        remove(): void {
          const index = tags.indexOf(node)
          if (index >= 0) tags.splice(index, 1)
        },
      }
      return node
    },
  }
  ;(globalThis as { document?: unknown }).document = documentLike
  return tags
}

function withoutFakeDocument(): void {
  delete (globalThis as { document?: unknown }).document
}

describe('question-reply lifecycle', () => {
  afterEach(withoutFakeDocument)

  it('installs the question-reply sheet marked for the cleanup contract', () => {
    const tags = withFakeDocument()
    installStyleSheets()

    expect(tags).toHaveLength(3)
    expect(tags.map((tag) => tag.dataset.pluginCss)).toEqual([
      'cealum-tint/user-bubble.css',
      'cealum-tint/question-reply.css',
      'cealum-tint/section.css',
    ])
    for (const tag of tags) {
      expect(tag.dataset.plugin, 'DSH removeOwnedStyles sweeps data-plugin=cealum-tint').toBe(
        'cealum-tint',
      )
    }
    // The new tag carries exactly the answered rule — nothing else rides along.
    expect(tags[1]!.textContent).toBe(QUESTION_REPLY_CSS)
  })

  it('removes every installed style on disable and restores all on re-enable', () => {
    const tags = withFakeDocument()

    const dispose = installStyleSheets()
    expect(tags).toHaveLength(3)

    dispose()
    expect(tags).toHaveLength(0)

    // Re-enabling installs the same three sheets again, question-reply included.
    const disposeAgain = installStyleSheets()
    expect(tags).toHaveLength(3)
    expect(tags[1]!.dataset.pluginCss).toBe('cealum-tint/question-reply.css')
    expect(tags[1]!.textContent).toBe(QUESTION_REPLY_CSS)

    disposeAgain()
    expect(tags).toHaveLength(0)
  })
})
