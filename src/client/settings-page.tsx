/**
 * The plugin's settings page (`settings.section` for id `cealum-tint`).
 *
 * Every control writes through the optimistic store; the bubble (and this
 * preview, which is a real `div[data-message-bubble]`) repaint on the same
 * click. Chrome uses only DSH token custom properties verified in the shipped
 * theme (`--dsw-alias-*`, `--dsw-radius-*`), never hard-coded greys, so the
 * page follows light/dark switches for free. Interactions ride the verified
 * primitives (`Switch`, `SegmentedControl`, `Input`, `UserMessageBubble`) with
 * plain-element fallbacks when the module table omits one.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type * as React from 'react'
import { contrastGrade, contrastRatio } from '../shared/contrast.ts'
import { CUSTOM_PRESET_ID, PRESETS } from '../shared/presets.ts'
import { parseHex } from '../shared/hex.ts'
import { effectiveTextColor, type SettingsStore, type SettingsView } from './store.ts'
import type { CealumTintKey } from './locales.ts'
import type { CompatSnapshot, CompatStatus, CompatMonitor } from './compat.ts'
import { MessagePreview } from './preview.tsx'
import { loadPrimitives } from './primitives.ts'

/** Localised translator bound to this plugin's namespace. */
export type Translate = (key: CealumTintKey, params?: Record<string, unknown>) => string

/** Props the shell plus the registration's `inject()` supply. */
export interface SectionProps {
  /** The settings store (registration inject). */
  store: SettingsStore
  /** The translator (registration inject). */
  t: Translate
  /** The compatibility monitor (registration inject). */
  compat: CompatMonitor
}

/** `{placeholder}` substitution over a dictionary string (idempotent with the host's). */
function fill(template: string, params: Record<string, unknown> | undefined): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  )
}

/** Hex draft field: commits only valid values, reports invalid drafts. */
interface HexDraft {
  /** Display value (draft while typing). */
  value: string
  /** Whether the current draft is a paid-for save or a free-typing draft. */
  editing: boolean
}

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/**
 * Colour input row: text field plus a native picker affordance. Valid drafts
 * commit immediately; invalid drafts stay local and show the invalid hint.
 * @param props - binding plus the localised invalid hint.
 * @returns the row.
 */
function ColorField(props: {
  value: string
  label: string
  pickerLabel: string
  invalidText: string
  onCommit: (hex: string) => void
}): React.ReactElement {
  const { value, label, pickerLabel, invalidText, onCommit } = props
  const primitives = loadPrimitives()
  const Input = primitives?.Input
  const [draft, setDraft] = useState<HexDraft>({ value, editing: false })
  const shown = draft.editing ? draft.value : value
  const invalid = draft.editing && !HEX_RE.test(draft.value)
  const textProps = {
    className: 'cealum-tint-hexinput',
    'aria-label': label,
    value: shown,
    spellCheck: false,
    onChange: (event: { target: { value: string } }) => {
      const next = event.target.value
      setDraft({ value: next, editing: true })
      if (HEX_RE.test(next)) onCommit(next.toUpperCase())
    },
    onBlur: () => setDraft((current) => ({ value: current.value, editing: false })),
  } as const
  return (
    <div className="cealum-tint-hexrow">
      <input
        className="cealum-tint-colorwell"
        type="color"
        aria-label={pickerLabel}
        value={/^#[0-9a-fA-F]{6}$/.test(shown) ? shown.toLowerCase() : '#000000'}
        onChange={(event) => {
          setDraft({ value: event.target.value.toUpperCase(), editing: false })
          onCommit(event.target.value.toUpperCase())
        }}
      />
      {Input !== undefined ? <Input {...textProps} /> : <input {...textProps} />}
      {invalid && <span className="cealum-tint-invalid">{invalidText}</span>}
    </div>
  )
}

const HEX_CLASS_STYLES = { width: '100%' } as const

/**
 * The settings page body.
 * @param props - injected stores and translator.
 * @returns the page.
 */
export function SettingsSection(props: SectionProps): React.ReactElement {
  const { store, t, compat } = props
  const view: SettingsView = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const compatSnapshot: CompatSnapshot = useSyncExternalStore(compat.subscribe, compat.getSnapshot)
  const primitives = loadPrimitives()
  const Switch = primitives?.Switch
  const SegmentedControl = primitives?.SegmentedControl

  const fg = effectiveTextColor(view)
  const ratio = contrastRatio(fg, view.bubbleColor)
  const parse = parseHex(fg)
  const ratioText =
    ratio === null ? t('contrast.unknown') : fill(t('contrast.value'), { ratio: ratio.toFixed(2) })
  const grade = contrastGrade(ratio)

  // Only a genuine bubble colour keeps the chip honest.
  const bubbleChannels = parseHex(view.bubbleColor)
  const chipStyle =
    bubbleChannels === null ? undefined : { backgroundColor: view.bubbleColor, color: fg }

  const patch = useCallback(
    (next: Partial<SettingsView>): void => {
      void store.update(next)
    },
    [store],
  )

  const compatText: Record<CompatStatus, CealumTintKey> = {
    pending: 'compat.pending',
    ok: 'compat.ok',
    missing: 'compat.missing',
  }

  return (
    <div className="cealum-tint-section">
      <div className="cealum-tint-status">
        <span className="cealum-tint-status-main">
          {view.enabled ? fill(t('status.on'), { color: view.bubbleColor }) : t('status.off')}
        </span>
        <span className="cealum-tint-status-sub">{t(compatText[compatSnapshot.status])}</span>
        <span className="cealum-tint-status-sub">{t('section.description')}</span>
      </div>

      <div className="cealum-tint-preview-stage">
        <MessagePreview text={t('preview.text')} />
      </div>

      <div className="cealum-tint-card">
        <div className="cealum-tint-row">
          <div className="cealum-tint-rowlabel">
            <span className="cealum-tint-rowtitle">{t('toggle.label')}</span>
            <span className="cealum-tint-rowhint">{t('toggle.hint')}</span>
          </div>
          {Switch !== undefined ? (
            <Switch checked={view.enabled} onChange={(next) => patch({ enabled: next })} />
          ) : (
            <input
              type="checkbox"
              checked={view.enabled}
              onChange={(event) => patch({ enabled: event.target.checked })}
            />
          )}
        </div>
      </div>

      <div className="cealum-tint-card">
        <span className="cealum-tint-rowtitle">{t('presets.label')}</span>
        <div className="cealum-tint-presets" role="group" aria-label={t('presets.label')}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="cealum-tint-swatch"
              aria-pressed={view.preset === preset.id}
              onClick={() => patch({ preset: preset.id })}
            >
              <span className="cealum-tint-swatchchip" style={{ backgroundColor: preset.hex }} />
              <span className="cealum-tint-swatchname">
                {t(`preset.${preset.id}` as CealumTintKey)}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="cealum-tint-swatch"
            aria-pressed={view.preset === CUSTOM_PRESET_ID}
            onClick={() => patch({ preset: CUSTOM_PRESET_ID })}
          >
            <span className="cealum-tint-swatchchip" style={chipStyle}>
              {''}
            </span>
            <span className="cealum-tint-swatchname">{t('custom.label')}</span>
          </button>
        </div>

        <div className="cealum-tint-rowlabel">
          <span className="cealum-tint-rowtitle">{t('custom.label')}</span>
          <span className="cealum-tint-rowhint">{t('custom.hint')}</span>
        </div>
        <ColorField
          value={view.bubbleColor}
          label={t('custom.label')}
          pickerLabel={t('custom.picker')}
          invalidText={t('custom.invalid')}
          onCommit={(hex) => patch({ bubbleColor: hex })}
        />
      </div>

      <div className="cealum-tint-card">
        <div className="cealum-tint-rowlabel">
          <span className="cealum-tint-rowtitle">{t('text.label')}</span>
          <span className="cealum-tint-rowhint">{t('text.hint')}</span>
        </div>
        {SegmentedControl !== undefined ? (
          <SegmentedControl
            value={view.textMode}
            options={[
              { value: 'auto', label: t('text.auto') },
              { value: 'custom', label: t('text.custom') },
            ]}
            onChange={(next) => patch({ textMode: next === 'custom' ? 'custom' : 'auto' })}
          />
        ) : (
          <div className="cealum-tint-hexrow" role="radiogroup" aria-label={t('text.label')}>
            {(['auto', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="cealum-tint-swatch"
                style={HEX_CLASS_STYLES}
                aria-pressed={view.textMode === mode}
                onClick={() => patch({ textMode: mode })}
              >
                <span className="cealum-tint-swatchname">
                  {mode === 'auto' ? t('text.auto') : t('text.custom')}
                </span>
              </button>
            ))}
          </div>
        )}
        {view.textMode === 'custom' && (
          <ColorField
            value={view.textColor}
            label={t('text.label')}
            pickerLabel={t('custom.picker')}
            invalidText={t('text.invalid')}
            onCommit={(hex) => patch({ textColor: hex })}
          />
        )}
        <div className="cealum-tint-contrast">
          <span>{t('contrast.label')}</span>
          <span className="cealum-tint-swatchchip" style={{ width: 56, ...chipStyle }}>
            Aa
          </span>
          <span>{ratioText}</span>
          <span className="cealum-tint-gradepill">{t(`contrast.${grade}` as CealumTintKey)}</span>
        </div>
      </div>

      <div className="cealum-tint-reset">
        <ResetButton store={store} t={t} />
        <span className="cealum-tint-rowhint">{t('reset.hint')}</span>
      </div>
    </div>
  )
}

/** Reset row: uses the host `Button` primitive where present. */
function ResetButton(props: { store: SettingsStore; t: Translate }): React.ReactElement {
  const { store, t } = props
  const [failed, setFailed] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const primitives = loadPrimitives()
  const Button = primitives?.Button

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )

  const run = (): void => {
    store.reset().then(
      () => setFailed(false),
      () => {
        setFailed(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setFailed(false), 4000)
      },
    )
  }

  const label = failed ? t('error.save') : t('reset.label')
  if (Button !== undefined) {
    return <Button onClick={run}>{label}</Button>
  }
  return (
    <button type="button" className="cealum-tint-swatch" onClick={run} style={HEX_CLASS_STYLES}>
      <span className="cealum-tint-swatchname">{label}</span>
    </button>
  )
}
