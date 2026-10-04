# Cody1StoreKit

Local-first App Store marketing asset generator for iOS and Mac apps.

**Cody1StoreKit never generates fake app interfaces.** Production output uses genuine screenshots captured from your real app (simulator or device). Development placeholders are clearly labelled and blocked from production export.

Repository: [github.com/cestrian77/cody1StoreKit](https://github.com/cestrian77/cody1StoreKit)

## Requirements

- **Node.js 20+**
- **macOS** recommended (desktop `.app` build; dev server runs on any OS that supports Node + Sharp)

## Installation

```bash
git clone https://github.com/cestrian77/cody1StoreKit.git
cd cody1StoreKit
npm install
npm run dev
```

Open **http://localhost:4321** (or the port shown in the terminal).

Works fully offline after `npm install`.

### Download (macOS)

Pre-built **unsigned** `.dmg` / `.zip` files are attached to [GitHub Releases](https://github.com/cestrian77/cody1StoreKit/releases). For the latest version, open the newest release and download the macOS artifact. First launch may require right-click → **Open** (see Desktop app below).

To build from source, clone this repo and run `npm run dist:mac`.

## Desktop app (macOS)

Run without a terminal after the first build:

```bash
npm run desktop
```

Uses the **`apps/` folder inside your clone** (same data as `npm run dev`).

### Installable `.app` / DMG

```bash
npm run dist:mac
```

Output: `release/mac-arm64/Cody1StoreKit.app` plus optional `.dmg` / `.zip`.

Builds are **unsigned** by default. macOS may block the first launch — right-click the app → **Open**, or allow in **System Settings → Privacy & Security**.

To sign for wider distribution, set a valid Apple Developer ID and remove `identity: null` from `package.json` → `build.mac`.

The installed app stores your apps under:

`~/Library/Application Support/Cody1StoreKit/apps/`

On first launch it seeds the bundled **example** app config. Use the menu **Open Apps Folder** to add screenshots and more apps.

**After pulling updates**, rebuild and reinstall — an old `.app` may keep stale bundled assets:

```bash
npm run dist:mac
```

To work directly in the repo, use `npm run dev` or `npm run desktop` from your clone.

## Quick start

The repo includes a minimal **`example`** app (five screens, placeholder screenshots in dev). Use it to learn the workflow, then **Add App** in the UI for your real product.

1. Open the app (`npm run dev` or the macOS `.app`), select your app and each screen in **Screen set**.
2. Use **Upload for this screen** (or drag PNG/JPEG onto the drop zone). Files are saved under that app’s `screenshots/raw/` with managed names — no manual renaming.
3. Adjust copy and layout, pick another screenshot from the thumbnails if needed, then **Save project** (config, locale copy, and screenshot links).

Optional: copy files into `apps/<id>/screenshots/raw/` yourself if you prefer the filesystem.

4. Generate production assets:

```bash
npm run generate -- --app example --locale en-GB --preset iphone69
```

Output:

```text
apps/example/output/en-GB/iphone69/
apps/example/output/previews/
```

## Browser UI

The local editor (`npm run dev` or the macOS `.app`) is a three-column workspace:

| Area | What you can do |
|------|-----------------|
| **Top bar** | Switch apps, **Add App** (id, name, starter template, iOS/Mac targets, optional duplicate-from). |
| **Screen set** (left) | Pick each marketing screen in your set. |
| **Preview** (centre) | Live render at the selected **output preset**. **Drag** the device frame to reposition it. Buttons: **Preview**, **Validate**, **Generate All** (production — blocks placeholders), **Generate (dev)** (allows demo placeholders), **Save project** (writes `app.config.json`, locale copy, and screenshot links). |
| **Inspector** (right) | Edit headline and supporting copy, **Upload for this screen** or drag PNG/JPEG, pick from screenshot thumbnails, choose **Template** and **Background**, switch **Output preset**, and adjust **Device** type (iPhone / iPad / Mac), scale, X/Y, and rotation sliders. **Reset Screen** / **Reset App** reload from disk. |

Unsaved edits prompt before switching apps. Uploads are stored immediately under `apps/<id>/screenshots/raw/`; use **Save project** so config and locale keys point at the right files.

Packaged macOS builds use **Open Apps Folder** (menu) for the same `apps/` layout under Application Support.

## Commands

| Command | Description |
|--------|-------------|
| `npm run dev` | Browser UI + local API (placeholder mode for missing shots) |
| `npm run generate -- --app <id>` | Production PNG set (fails on placeholders) |
| `npm run generate -- --app <id> --dev` | Allow demo placeholders |
| `npm run generate -- --app <id> --all` | All locales × all presets |
| `npm run validate -- --app <id>` | Pre-flight validation |
| `npm run preview -- --app <id>` | Low-res preview render |
| `npm run package -- --app <id> --locale en-GB` | Marketing package under `dist/` |
| `npm test` | Vitest suite |
| `npm run typecheck` | TypeScript |

## Adding your app

Use **Add App** in the UI (or `POST /api/apps` on the dev server). Optionally **duplicate from** an existing app id to copy layout and locale structure.

Creates:

```text
apps/<id>/
  app.config.ts
  app.config.json
  screenshots/raw/
  locales/en-GB.json
  assets/
  output/
```

See `apps/README.md` for folder conventions.

## Configuring screens

Edit `apps/<id>/app.config.json` in the UI or on disk (layout, device, backgrounds) and `apps/<id>/locales/<locale>.json` (marketing copy). Save with **Save config**.

Copy references use locale keys, e.g. `screens.screen1.headline`.

## Output presets

Central definitions: `src/presets/output-presets.ts`

| ID | Size (portrait) | Notes |
|----|-----------------|-------|
| `iphone69` | 1320×2868 | Primary iPhone class ([Apple spec](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)) |
| `iphone67` | 1290×2796 | Also accepted in 6.9" class |
| `iphone65` | 1284×2778 | Fallback class if 6.9" not supplied |
| `ipad13` | 2064×2752 | iPad 13" class |
| `ipad13_alt` | 2048×2732 | Also accepted for 13" |
| `mac2880` | 2880×1800 | Mac 16:10 (preferred) |
| `mac2560` | 2560×1600 | Mac 16:10 |
| `mac1440` | 1440×900 | Mac 16:10 |
| `mac1280` | 1280×800 | Mac 16:10 |

Mac exports are flattened (no alpha). iOS configs can preview Mac presets: device chrome maps to a generic MacBook frame automatically.

Re-verify dimensions when Apple updates App Store Connect requirements.

## Templates

Fourteen presets share one renderer (`src/renderer/`). Pick per screen in the UI or set a default in `app.config.json`.

| Group | IDs |
|-------|-----|
| **Utility** | `utility-clean`, `utility-minimal`, `utility-pro`, `utility-editorial`, `utility-mint` |
| **Puzzle** | `puzzle`, `puzzle-soft`, `puzzle-vivid`, `puzzle-night` |
| **Arcade** | `arcade`, `arcade-neon`, `arcade-retro`, `arcade-candy` |

Definitions and starter layouts: `src/templates/catalog.ts`.

## Background presets

`soft-blue`, `warm-cream`, `soft-lavender`, `soft-green`, `soft-coral`, `clean-white`, `dark-game`, `bright-game`, `slate-pro`, `mint-fresh`, `ocean-deep`, `candy-pop`, `neon-night`, `sunset-warm`

## Localisation

Add `apps/<id>/locales/de-DE.json` (and matching keys). Generate with:

```bash
npm run generate -- --app example --locale de-DE
npm run generate -- --app example --all-locales
```

No automatic translation.

## Validating assets

```bash
npm run validate -- --app example
```

Production `generate` runs validation automatically.

## Marketing package

```bash
npm run package -- --app example --locale en-GB --zip
```

Produces `dist/example-en-GB/` with screenshots, metadata, and `manifest.json`.

## Architecture

```text
src/ui/          React browser UI (Vite)
src/server/      Local Express + Vite middleware
src/renderer/    Sharp/SVG compositor (UI-agnostic)
src/schemas/     Zod app config
src/validation/  Pre/post checks
apps/<id>/       Per-app config, locales, raw screenshots, output
```

Rendering accepts buffers/paths via clean interfaces so a future hosted UI could upload screenshots without filesystem coupling in core logic.

## Git hygiene

- **Do not commit** `node_modules`, `dist/`, `release/`, or ephemeral caches.
- **Generated** `apps/*/output/**` is gitignored by default (see `.gitignore`). Commit configs and source screenshots for your apps as you prefer.
- Placeholder manifest `.cody1storekit-placeholders.json` is gitignored.

## Roadmap

- **Xcode automation** — planned simulator capture (`src/capture/xcode/README.md`), separate from rendering.
- **Hosted rendering** — optional future static UI + worker; the local tool is complete without external services.

## License

MIT — see [LICENSE](LICENSE).
