/**
 * Host half of Cealum Tint.
 *
 * The Host owns exactly one thing: the configuration schema and the promise
 * that its namespace is configured (hence served) for this entry. The browser
 * half reads the very same namespace through `ctx.configForms` and applies the
 * colours. No tools, no services, no routes, no DOM.
 */
import { Config } from '../shared/config-schema.ts'

export { Config }

/** The settings service surface this plugin relies on. */
interface SettingsService {
  /** Declare the entry's presentation; returns the `ctx.effect`-style disposer. */
  configure(presentation: { auto?: boolean }, owner: unknown): () => void
}

/** Context handed to the `inject` callback once `settings` is available. */
interface SettingsChildContext {
  readonly settings: SettingsService
  effect(callback: () => () => void, label?: string): void
}

/** The subset of the Cordis context used here. */
interface HostContext {
  /** Owning fiber; passed back to `settings.configure`. */
  readonly fiber: unknown
  /** Run a side effect and clean it up on dispose. */
  effect(callback: () => (() => void) | void, label?: string): void
  /** Wait for services before running the callback. */
  inject(dependencies: readonly string[], callback: (child: SettingsChildContext) => void): void
}

/** Services required before `apply` runs. */
export const inject = ['settings']

/**
 * Register this entry's configuration with the settings service.
 *
 * `auto: false` keeps DSH from generating a generic settings page for the
 * namespace: this bundle ships its own page, and two pages for one namespace
 * would be a duplicate affordance.
 * @param ctx - Host plugin context.
 */
export function apply(ctx: HostContext): void {
  ctx.inject(['settings'], (child) => {
    child.effect(
      () => child.settings.configure({ auto: false }, ctx.fiber),
      'cealum-tint: settings namespace',
    )
  })
}
