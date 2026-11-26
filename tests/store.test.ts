import { describe, expect, it, vi } from 'vitest'
import {
  createSettingsStore,
  decodeSettings,
  effectiveTextColor,
  type ConfigFormLike,
} from '../src/client/store.ts'
import { CONFIG_DEFAULTS } from '../src/shared/config-schema.ts'

/** Controllable ConfigForm double: snapshots + recorded ops. */
function makeForms(initial: unknown = undefined): {
  form: ConfigFormLike
  echo: (next: unknown) => void
  refuse: boolean
  ops: Array<{ kind: 'set' | 'unset'; field: string; value?: unknown }>
} {
  let snapshot: unknown = initial
  const listeners = new Set<() => void>()
  const ops: Array<{ kind: 'set' | 'unset'; field: string; value?: unknown }> = []
  const state = {
    refuse: false,
    ops,
  }
  const form: ConfigFormLike = {
    getSnapshot: () => ({ value: snapshot }) as never,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async set(field: string, value: unknown) {
      ops.push({ kind: 'set', field, value })
      return !state.refuse
    },
    async unset(field: string) {
      ops.push({ kind: 'unset', field })
      return !state.refuse
    },
  }
  return {
    form,
    ops: state.ops,
    get refuse() {
      return state.refuse
    },
    set refuse(value: boolean) {
      state.refuse = value
    },
    echo(next: unknown) {
      snapshot = next
      for (const listener of [...listeners]) listener()
    },
  }
}

describe('decodeSettings', () => {
  it('falls back to defaults for absent or garbage sections', () => {
    expect(decodeSettings(undefined)).toEqual(CONFIG_DEFAULTS)
    expect(decodeSettings(null)).toEqual(CONFIG_DEFAULTS)
    expect(decodeSettings(42)).toEqual(CONFIG_DEFAULTS)
    expect(decodeSettings({ enabled: 'yes', bubbleColor: 'lime', textMode: 'neon' })).toEqual(
      CONFIG_DEFAULTS,
    )
  })

  it('keeps valid values and normalises hex', () => {
    expect(
      decodeSettings({
        enabled: false,
        bubbleColor: '#2c6732',
        textMode: 'custom',
        textColor: '#Fa0',
      }),
    ).toEqual({
      enabled: false,
      preset: 'deep-green',
      bubbleColor: '#2C6732',
      textMode: 'custom',
      textColor: '#FFAA00',
    })
  })

  it('derives preset from an unrecognised colour', () => {
    expect(decodeSettings({ bubbleColor: '#123456' }).preset).toBe('custom')
    expect(decodeSettings({ bubbleColor: '#245B82' }).preset).toBe('ocean-blue')
  })

  it('migrates a legacy preset id and rejects unknown ones', () => {
    expect(decodeSettings({ preset: 'chatgpt-green', bubbleColor: '#2C6732' }).preset).toBe(
      'deep-green',
    )
    expect(decodeSettings({ preset: 'not-a-preset', bubbleColor: '#245B82' }).preset).toBe(
      'ocean-blue',
    )
  })
})

describe('effectiveTextColor', () => {
  it('auto mode picks by contrast', () => {
    expect(effectiveTextColor({ ...CONFIG_DEFAULTS, textMode: 'auto' })).toBe('#FFFFFF')
    expect(
      effectiveTextColor({ ...CONFIG_DEFAULTS, textMode: 'auto', bubbleColor: '#F2EFE9' }),
    ).toBe('#000000')
  })

  it('custom mode honours the explicit colour', () => {
    expect(
      effectiveTextColor({ ...CONFIG_DEFAULTS, textMode: 'custom', textColor: '#ff0000' }),
    ).toBe('#FF0000')
    // Invalid custom falls back to the computed choice, never to garbage.
    expect(effectiveTextColor({ ...CONFIG_DEFAULTS, textMode: 'custom', textColor: 'bogus' })).toBe(
      '#FFFFFF',
    )
  })
})

describe('createSettingsStore', () => {
  it('publishes optimistically and persists both sides of a preset change', async () => {
    const { form, ops } = makeForms()
    const store = createSettingsStore(form)
    const seen: Array<string> = []
    store.subscribe(() => {
      seen.push(`${store.getSnapshot().preset}/${store.getSnapshot().bubbleColor}`)
    })
    await store.update({ preset: 'ocean-blue' })
    expect(store.getSnapshot().preset).toBe('ocean-blue')
    expect(store.getSnapshot().bubbleColor).toBe('#245B82')
    expect(ops).toEqual([
      { kind: 'set', field: 'preset', value: 'ocean-blue' },
      { kind: 'set', field: 'bubbleColor', value: '#245B82' },
    ])
    expect(seen[0]).toBe('ocean-blue/#245B82')
  })

  it('keeps preset and colour coherent when a raw colour arrives', async () => {
    const { form, ops } = makeForms()
    const store = createSettingsStore(form)
    await store.update({ bubbleColor: '#2c6732' })
    expect(store.getSnapshot().preset).toBe('deep-green')
    await store.update({ bubbleColor: '#010203' })
    expect(store.getSnapshot().preset).toBe('custom')
    expect(ops.map((op) => op.field)).toEqual(['bubbleColor', 'bubbleColor'])
    expect(ops[1]).toEqual({ kind: 'set', field: 'bubbleColor', value: '#010203' })
  })

  it('reverts the optimistic draft when the Host refuses', async () => {
    const harness = makeForms()
    const store = createSettingsStore(harness.form)
    const before = store.getSnapshot()
    harness.refuse = true
    await store.update({ enabled: false })
    expect(store.getSnapshot()).toEqual(before)
    expect(before.enabled).toBe(true)
  })

  it('re-adopts the Host snapshot after writes settle (with no pending work)', async () => {
    const harness = makeForms({ bubbleColor: '#414141' })
    const store = createSettingsStore(harness.form)
    expect(store.getSnapshot().bubbleColor).toBe('#414141')
    harness.echo({ bubbleColor: '#2C6732' })
    expect(store.getSnapshot().bubbleColor).toBe('#2C6732')
  })

  it('reset clears every field through unset and restores schema defaults', async () => {
    const harness = makeForms({ enabled: false, bubbleColor: '#010203', textMode: 'custom' })
    const store = createSettingsStore(harness.form)
    await store.reset()
    expect(store.getSnapshot()).toEqual(CONFIG_DEFAULTS)
    const kinds = harness.ops.map((op) => op.kind)
    expect(kinds).toHaveLength(5)
    expect(new Set(kinds)).toEqual(new Set(['unset']))
  })

  it('never lets a late echo revert a newer local choice', async () => {
    const harness = makeForms()
    const store = createSettingsStore(harness.form)
    // Keep the first write unsettled until we choose.
    let release!: (accepted: boolean) => void
    harness.form.set = (field: string, value: unknown) =>
      new Promise<boolean>((resolve) => {
        release = (accepted) => {
          harness.ops.push({ kind: 'set', field, value })
          resolve(accepted)
        }
      }) as never
    const updating = store.update({ bubbleColor: '#805B26' })
    harness.echo({ bubbleColor: '#414141' })
    // Still in flight: the optimistic value must not be clobbered.
    expect(store.getSnapshot().bubbleColor).toBe('#805B26')
    release(true)
    await updating
    expect(store.getSnapshot().bubbleColor).toBe('#805B26')
  })

  it('tolerates a form whose transport throws', async () => {
    const harness = makeForms()
    harness.form.set = () => Promise.reject(new Error('transport down'))
    const store = createSettingsStore(harness.form)
    await store.update({ enabled: false })
    // Falls back to the last accepted snapshot's decode.
    expect(store.getSnapshot().enabled).toBe(true)
  })
})
