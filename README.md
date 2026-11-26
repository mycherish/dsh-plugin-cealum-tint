# Cealum Tint

**English** | [简体中文](README.zh.md)

Colour the bubbles of the messages **you** send in DeepSeek Harness — deep
green by default, anything you like after that. Replies, tool cards, thinking
and the composer stay exactly as the app shipped them.

**Source**: <https://github.com/mycherish/dsh-plugin-cealum-tint> ·
Issues: <https://github.com/mycherish/dsh-plugin-cealum-tint/issues>

## Get it

**Requirements** — DeepSeek Harness Desktop (verified on 0.2.2-rc.5); Node.js
≥ 22; [pnpm](https://pnpm.io) ≥ 10 on your `PATH` for the git route
(pre-installed with most DSH setups). The profile you install into must have
been opened once in DeepSeek Harness before the first CLI install.

### Install — Release tarball (no build step)

```sh
dsh plugin --profile desktop add \
  https://github.com/mycherish/dsh-plugin-cealum-tint/releases/download/v0.1.0-rc.3/dsh-plugin-cealum-tint-0.1.0-rc.3.tgz
```

Prefer a local file? Download the `.tgz` from
[Releases](https://github.com/mycherish/dsh-plugin-cealum-tint/releases) and
point the command at it. The GUI route works too: **Plugins ▸ Add plugin**.

### Install — from git (builds on your machine)

```sh
dsh plugin --profile desktop add \
  'git+https://github.com/mycherish/dsh-plugin-cealum-tint.git#v0.1.0-rc.3'
```

pnpm 10 blocks dependency build scripts, and this git tree builds
`index.js` / `client.js` in a `prepare` step. The first run fails with pnpm's
`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` error and prints the allow-list entry to
add. Approve the package once, then re-run the same add command:

```sh
# 1. in ~/.dsh/profiles/desktop/pnpm-workspace.yaml add
#    (pnpm 10 names the key onlyBuiltDependencies; newer pnpm prints allowBuilds):
onlyBuiltDependencies:
  - "dsh-plugin-cealum-tint"

# 2. re-run the same `dsh plugin --profile desktop add ...` command
```

`dsh` echoes pnpm's suggestion verbatim, so you never have to guess the key or
the package name. Verified end-to-end with pnpm 10.26: second run fetches the
source, builds via `prepare` (esbuild, 0 audit findings), and registers the
plugin. The Release-tarball and GUI routes need none of this — packages carry
prebuilt files.

### Install — npm

```sh
dsh plugin --profile desktop add dsh-plugin-cealum-tint                # latest
dsh plugin --profile desktop add dsh-plugin-cealum-tint@0.1.0-rc.3    # pinned
```

The package is a pre-release; `latest` tracks the newest rc until 1.0.
Re-running the same command upgrades in place.

### After install

Open **Settings ▸ 云岫着色 (Cealum Tint)**, pick a preset or any hex colour,
and both your manual messages and your answers to AI confirmation questions
take the colour. Changes save and apply live.

### Update

Re-run the install command with the newer version (any route works the same
way; the tarball route always wins on speed):

```sh
dsh plugin --profile desktop add \
  https://github.com/mycherish/dsh-plugin-cealum-tint/releases/download/v0.1.0-rc.3/dsh-plugin-cealum-tint-0.1.0-rc.3.tgz
```

### Uninstall

```sh
dsh plugin --profile desktop remove dsh-plugin-cealum-tint
```

Removal also clears the injected stylesheets and colour variables (the
plugin's cleanup contract), returning bubbles to their native colours.

### Ask your DSH agent to install it

Paste this to any agent in DeepSeek Harness:

```text
Please install the DeepSeek Harness plugin "Cealum Tint" (云岫着色) into this
profile. Download the verified tarball asset of the latest release from
https://github.com/mycherish/dsh-plugin-cealum-tint/releases, save it locally,
install it with the plugin management tooling (install_bundle with the saved
tarball's extracted directory, or the CLI equivalent:
dsh plugin --profile <this profile> add <saved .tgz>), enable it, and confirm
the "cealum-tint" entry appears in the plugin registry. Setup page lives in
Settings ▸ 云岫着色.
```

### From source

```sh
git clone https://github.com/mycherish/dsh-plugin-cealum-tint.git
cd dsh-plugin-cealum-tint
npm install && npm run verify
```

then install the checkout directory into a profile (`dsh plugin --profile
<name> add <checkout-dir>` or **Plugins ▸ Add plugin**).

## Project docs

- Development log (E0–E9):
  [docs/IMPLEMENTATION-LOG.md](docs/IMPLEMENTATION-LOG.md)
- Delivery & acceptance report:
  [docs/DELIVERY-REPORT.md](docs/DELIVERY-REPORT.md)
- Development plan incl. the naming spec (§17):
  [docs/DEVELOPMENT-PLAN.md](docs/DEVELOPMENT-PLAN.md)

## Naming history

The final name is **Cealum Tint** (云岫着色) — spelling is intentionally
"Cealum". Earlier working names dropped during design: *Cealum Hue / Chroma /
Bubble / Glow / Palette / Prism / Canvas*, the typo variant *Caelum Tint*, and
*User Message Color*. They are deprecated and appear nowhere in code. The old
preset id `chatgpt-green` survives only as a migration alias that maps old
saved settings to `deep-green`.

## Features

- **Five presets** — Deep Green `#2C6732`, Ocean Blue `#245B82`, Purple
  `#604B83`, Amber `#805B26`, Graphite `#414141`.
- **Any hex colour** — `#RGB` and `#RRGGBB` are accepted and stored as
  upper-case `#RRGGBB`; an invalid value never reaches the CSS.
- **Text colour** — automatic WCAG-contrast pick (black or white) or an
  explicit colour, with a live AA/AAA read-out.
- **Confirmation answers** — replies you submit to AI confirmation questions
  (the ask/answer cards) get the very same custom bubble colour as your
  manual messages; unanswered cards, AI replies and approval cards stay
  untouched.
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
- a **Client** half that injects two stylesheets —

  ```css
  /* manual user messages */
  div[data-message-bubble]{
    background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));
    color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary));
  }

  /* answered confirmation-flow replies */
  div[data-reply-outcome="answered"] > div:first-child > :first-child{
    background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));
    color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary));
  }
  ```

  — plus two custom properties on the document element. No theme overrides,
  no chat-node takeover, no history rewriting: the plugin styles exactly two
  chat selectors (manual bubbles and answered question replies, sharing the
  same declarations byte for byte) and touches exactly two custom properties
  it names after itself.

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

## Contributing

Issues and pull requests are welcome at
<https://github.com/mycherish/dsh-plugin-cealum-tint>. Please run
`npm run verify` before submitting and keep changes covered by the existing
tests where practical.
