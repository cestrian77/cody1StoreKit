# Apps folder

Each subdirectory under `apps/` is one product you are marketing on the App Store.

## What ships in this repository

**`example`** is a minimal five-screen starter: generic copy, standard filenames (`screen-1.png` …), and the folder layout the UI and CLI expect. It is for learning and smoke tests — replace screenshots and copy with your own app, or delete it and use **Add App** only.

Your real apps stay in **your** clone or in `~/Library/Application Support/Cody1StoreKit/apps/` when using the packaged macOS app. Do not commit proprietary screenshots or unreleased product configs unless you intend to publish them.

## Per-app layout

```text
apps/<id>/
  app.config.ts       Source config (optional if you only edit JSON)
  app.config.json     Layout, screens, presets (UI edits this)
  locales/<locale>.json   Marketing copy keyed by screen
  screenshots/raw/    Genuine captures only (never generated UI)
  assets/             Optional icons or overlays
  output/             Generated PNGs (gitignored by default)
```

## Fields worth knowing

- `targets`: `["ios"]`, `["mac"]`, or `["ios", "mac"]` — filters output presets in the UI
- `defaultPreset` / `defaultMacPreset` — primary export sizes
- `template`: `utility-clean`, `puzzle`, or `arcade`

Duplicate an existing app id in **Add App** when you want to reuse screen structure and tweak from there.
