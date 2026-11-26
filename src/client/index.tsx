/**
 * Client half of Cealum Tint — the entry the ModuleLoader factory returns.
 *
 * Responsibilities, in dependency order:
 * 1. register the plugin's locale dictionaries;
 * 2. install the two owned stylesheets (bubble rule + section chrome);
 * 3. open the configuration form for namespace `cealum-tint` and bind it to
 *    the optimistic store;
 * 4. wire the store to the colour binder (document-level custom properties);
 * 5. start the event-driven compatibility monitor;
 * 6. register the settings page and its nav icon.
 *
 * Everything is registered inside `ctx.effect` with a proper disposer, so
 * deactivation (or plugin upgrade) removes styles, observers, and bindings in
 * reverse order — the host additionally sweeps any `<style data-plugin>` left
 * behind by a crashed client half.
 */
import type * as React from 'react'
import { PLUGIN_ID } from '../shared/protocol.ts'
import { createColorBinding } from './color-binding.ts'
import { createCompatMonitor, type CompatMonitor } from './compat.ts'
import { en, zh } from './locales.ts'
import { createSettingsStore, type ConfigFormLike, type SettingsStore } from './store.ts'
import { SettingsSection, type Translate } from './settings-page.tsx'
import { installStyleSheets } from './style-tag.ts'

/** Services this client half waits for before `apply` runs. */
export const inject = ['slots', 'locale', 'remote', 'configForms'] as const

/** Registration face of the slot service (verified against dsh-config-manager). */
interface SlotsService {
  /** Subscribe a registration to a slot's mount points. */
  inject(slot: string, register: () => unknown): void
  /** Register one contribution; options carry identity, the component renders it. */
  register(options: Record<string, unknown>, component: unknown): unknown
}

/** Registration face of the client locale service (verified: config-manager). */
interface LocaleService {
  register(namespace: string, dictionaries: { zh: unknown; en: unknown }): void
  bind(namespace: string): (key: string, params?: Record<string, unknown>) => string
}

/** The shared configuration form service. */
interface ConfigFormsService {
  get(entryId: string): ConfigFormLike
}

/** The Cordis client context subset used here. */
export interface ClientContext {
  readonly slots: SlotsService
  readonly locale: LocaleService
  readonly configForms: ConfigFormsService
  effect(callback: () => (() => void) | void, label?: string): void
}

/**
 * The nav icon. Rendered by the shell's settings navigation with `{size,
 * active}` (DEVELOPMENT-PLAN §16.6 contract check); the art intentionally uses
 * fixed tints — green marks the tinted half, `currentColor` follows the theme
 * for the native half.
 * @param props - size in px, and the selected flag.
 * @returns the inline svg.
 */
function SectionIcon(props: { size: number }): React.ReactElement {
  const path =
    'M12 3C6.94 3 3 6.36 3 10.5c0 2.3 1.22 4.35 3.14 5.74L5 20.5l4.16-2.06.' +
    '91.22 1.86.34 2.84.34 5.06 0 9-3.36 9-7.5S17.06 3 12 3Z'
  return (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="cealum-tint-icon-clip">
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill="currentColor" />
      <rect
        x="12"
        y="0"
        width="24"
        height="24"
        clipPath="url(#cealum-tint-icon-clip)"
        fill="#2C6732"
      />
      <path
        d="M16.5 7.2c1.1 1.6 1.75 2.72 1.75 3.7a1.75 1.75 0 1 1-3.5 0c0-.98.65-2.1 1.75-3.7Z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/**
 * Client `apply`: assemble every resource this plugin owns.
 * @param ctx - the client context with slots/locale/configForms ready.
 */
export function apply(ctx: ClientContext): void {
  // 1. Locale — one namespace, both languages, flat dot keys.
  ctx.effect(() => ctx.locale.register(PLUGIN_ID, { zh, en }), 'cealum-tint: locale dictionaries')
  const t: Translate = ctx.locale.bind(PLUGIN_ID) as Translate

  // 2. Stylesheets — the bubble rule and the section chrome (both marked).
  ctx.effect(() => installStyleSheets(), 'cealum-tint: stylesheets')

  // 3. Configuration namespace → optimistic store.
  const form = ctx.configForms.get(PLUGIN_ID)
  const store: SettingsStore = createSettingsStore(form)

  // 4. Colour binder + store wiring. First paint runs immediately so a page
  //    reload mid-conversation recolours without waiting for the next edit.
  const binding = createColorBinding()
  ctx.effect(() => () => binding.dispose(), 'cealum-tint: colour binding')
  ctx.effect(
    () => store.subscribe(() => binding.apply(store.getSnapshot())),
    'cealum-tint: colour wiring',
  )
  binding.apply(store.getSnapshot())

  // 5. Compatibility monitor — additive, never blocks injection.
  const compat: CompatMonitor = createCompatMonitor()
  ctx.effect(() => compat.observe(), 'cealum-tint: compatibility monitor')

  // 6. Settings page + nav icon. The label reads the locale at render time;
  //    `locale: PLUGIN_ID` lets the shell resolve keys for this section.
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: PLUGIN_ID,
        order: 70,
        label: () => t('section.label'),
        locale: PLUGIN_ID,
        inject: () => ({ store, t, compat }),
      },
      SettingsSection,
    ),
  )
  ctx.slots.inject('settings.section.icon', () =>
    ctx.slots.register({ name: 'settings.section.icon', id: PLUGIN_ID }, SectionIcon),
  )
}
