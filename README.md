# Cealum Tint

Colour the bubbles of the messages **you** send in DeepSeek Harness — deep
green by default, anything you like after that. Replies, tool cards, thinking
and the composer stay exactly as the app shipped them.

## Features

- **Five presets** — Deep Green `#2C6732`, Ocean Blue `#245B82`, Purple
  `#604B83`, Amber `#805B26`, Graphite `#414141`.
- **Any hex colour** — `#RGB` and `#RRGGBB` are accepted and stored as
  upper-case `#RRGGBB`; an invalid value never reaches the CSS.
- **Text colour** — automatic WCAG-contrast pick (black or white) or an
  explicit colour, with a live AA/AAA read-out.
- **Live preview** rendered with the same `div[data-message-bubble]` seam the
  chat uses, so what you see is what the conversation gets.
- **Switch off** at any time to restore native bubbles — the stylesheet's
  fallbacks point back at the host's own design tokens.

## Where the setting lives

Settings → **Cealum Tint** (云岫着色). Changes save automatically and survive
restarts (they persist in the profile's user configuration layer).

## How it works

The bundle has two halves:

- a **Host** entry that owns the `cealum-tint` configuration namespace
  (five `.volatile()` fields: `enabled`, `preset`, `bubbleColor`, `textMode`,
  `textColor`);
- a **Client** half that injects one stylesheet —

  ```css
  div[data-message-bubble]{
    background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));
    color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary));
  }
  ```

  — plus two custom properties on the document element. No theme overrides,
  no chat-node takeover, no history rewriting: the plugin styles exactly one
  selector and touches exactly two custom properties it names after itself.

## Compatibility self-check

Compatibility with this DSH build is verified **event-driven**: a
MutationObserver watches for the first real user bubble. Until one is seen the
settings page shows *waiting*; if the build stops marking user bubbles, the
page tells you so while colours simply stay inactive. The check never blocks
or gates the injection itself.

## Build & test

```sh
npm install
npm run verify   # build + typecheck + tests
```

Artifacts: `index.js` (Host), `client.js` (Browser, ModuleLoader envelope).

## Scope & guarantees

- Desktop profile only; installs as a bundle (`cordis.patch.yml` inserts one
  row with id `cealum-tint`).
- Does not read or modify chat history, other plugins, or DSH core.
- Removal clears the stylesheet (marked `data-plugin="cealum-tint"`), the
  custom properties, and the saved configuration fields.
