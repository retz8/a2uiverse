# Material 3 design references

Collected 2026-09-27. Web values are in CSS px (1dp = 1px).

**Token files.** The `@material/web@2.5.0` npm tarball ships two generated token sets; paths below are relative to that package root.

- **v0.192 token set** — `tokens/versions/v0_192/`. Header: *"Design system display name: Google Material 3 / Design system version: v0.192 / Audience 3P / Platform Web / Scheme Dynamic"*. The stable `md-*` components compile against it (e.g. `tokens/_md-comp-filled-button.scss` does `@use 'versions/v0_192/md-comp-filled-button'`).
- **34.0.21 token set** — `tokens/versions/latest/sass/`. Header: *"Design system: Google Material 3 / Version: 34.0.21 / audience: 3p, font: static, platform: web"*. Added in 2.5.0 ("tokens: add expressive token versions"); includes M3 Expressive; used only by `labs/gb`. The tables currently on m3.material.io match this set (baseline colours, state opacities). `tokens/versions/README.md`: *"may introduce breaking changes at any point across minor and patch updates"*.

Where the two sets differ, both values are given.

---

## 1. `@material/web` package status

| Item | Value | Source |
|---|---|---|
| Latest version | **2.5.0**, published 2026-07-15 (npm 14:39 UTC; GitHub release v2.5.0 14:38 UTC). Previous: 2.4.1 (2025-10-27), 2.4.0 (2025-08-21), 2.3.0 (2025-03-27). Nightly tag: `2.5.1-nightly.cbd34a8.0` | `npm view @material/web time`; GitHub releases |
| Licence | Apache-2.0 | `package.json`, `LICENSE` |
| Dependencies | `lit ^2.8.0 \|\| ^3.0.0`, `@lit/context ^1.1.6`, `tslib ^2.4.0` | `package.json` |
| Browsers | Chrome 120+, Edge 120+, Firefox 119+, Safari 16.4+ (older Safari with an `ElementInternals` polyfill) | repo `docs/support.md` |

**Maintenance mode — yes.**

- Discussion #5642, "❗MWC is in maintenance mode", posted 2024-06-10 by asyncliz: *"Material Design is focusing on support for Google's large-scale internal Wiz framework, and has reassigned the engineers working on Material Web Components. This places MWC into maintenance mode. MWC is not deprecated or going away, but Material Design is no longer actively staffing its development. … New features and components are no longer planned. GitHub PRs will not be accepted by default."* — https://github.com/material-components/material-web/discussions/5642
- README in 2.5.0: *"MWC is in maintenance mode pending new maintainers."*
- `docs/roadmap.md` (reviewed 2026-07-31): *"There is no current work planned for new features or components. Bug fixes or other contributions may be added on a case-by-case basis."*
- m3.material.io/develop/web: *"Material Web Components are currently in maintenance mode. No updates are currently being made to this library. Material 3 Expressive is not implemented on Web."*
- 2.5.0 still added experimental Expressive "utility class" components under `labs/gb` (see below).

**Stable components** (tags from `custom-elements.json` / `all.js`):

| Area | Elements |
|---|---|
| Buttons | `md-filled-button`, `md-filled-tonal-button`, `md-outlined-button`, `md-text-button`, `md-elevated-button` |
| Icon buttons | `md-icon-button` (standard), `md-filled-icon-button`, `md-filled-tonal-icon-button`, `md-outlined-icon-button` |
| FAB | `md-fab` (`variant`: surface [default] / primary / secondary / tertiary; `size`: small / medium [default] / large; `label` → extended), `md-branded-fab` |
| Chips | `md-assist-chip`, `md-filter-chip`, `md-input-chip`, `md-suggestion-chip`, `md-chip-set` |
| Selection | `md-checkbox`, `md-radio`, `md-switch`, `md-slider` |
| Text input | `md-filled-text-field`, `md-outlined-text-field`, `md-filled-select`, `md-outlined-select`, `md-select-option`, `md-filled-field`, `md-outlined-field` |
| List / menu | `md-list`, `md-list-item`, `md-menu`, `md-menu-item`, `md-sub-menu` |
| Other | `md-dialog`, `md-divider`, `md-tabs`, `md-primary-tab`, `md-secondary-tab`, `md-circular-progress`, `md-linear-progress`, `md-icon` |
| Primitives | `md-elevation`, `md-ripple`, `md-focus-ring`; `typography/md-typescale-styles.css` (`.md-typescale-*` classes) |

**Labs** (`labs/README.md`: *"experimental features that are not recommended for production. Breaking changes may occur that do not bump the major version"*): `md-badge`, `md-elevated-card` / `md-filled-card` / `md-outlined-card`, `md-item`, `md-navigation-bar`, `md-navigation-drawer`, `md-navigation-drawer-modal`, `md-navigation-tab`, `md-outlined-segmented-button(-set)`. `labs/gb` (new in 2.5.0, built on the 34.0.21 token set): `md-gb-badge`, `-button` (sizes xs–xl, round/square, toggle), `-card`, `-checkbox`, `-divider`, `-fab`, `-icon`, `-icon-button`, `-list`, `-list-item`, `-menu`, `-menu-group`, `-menu-item`, `-radio`, `-split-button`, `-switch`, plus `labs/gb/styles/m3.css` and a "Material for Tailwind" `tailwind.css`.

**Not shipped as stable components** (roadmap "New components … we have not built yet"): autocomplete, badge, banner, bottom app bar, bottom sheet, card, data table, date picker, navigation bar, navigation drawer, navigation rail, search, segmented button, snackbar, time picker, top app bar, tooltip. Badge, card, navigation bar/drawer and segmented button exist only in labs. The v0.192 token set still carries token files for all of them (search-bar, search-view, navigation-drawer, navigation-rail, snackbar, plain/rich tooltip, top-app-bar-*, date-picker-*, time-picker, sheet-*, …: 84 component token files).

**React 19.** React 19 *"adds full support for custom elements and passes all tests on Custom Elements Everywhere"*; on the client, props that match a property on the element are set as properties, otherwise as attributes; in SSR, primitive props render as attributes and non-primitives are omitted (react.dev/blog/2024/12/05/react-19). Custom Elements Everywhere scores React ^19 at 100% (16/16 basic, 16/16 advanced); events bind through `on…` props in lowercase, camelCase, kebab-case, CAPS or PascalCase. `@material/web` ships no React/JSX typings — only `HTMLElementTagNameMap` entries — so TSX needs its own `JSX.IntrinsicElements` declarations. 2.5.0 added a `custom-elements.json` manifest.

---

## 2. Colour system

### Colour roles (m3.material.io/styles/color/roles)

- The roles page says there are *"26 standard color roles organized into six groups: primary, secondary, tertiary, error, surface, and outline"*, plus optional add-on roles (fixed accents, surface dim/bright, background, scrim, shadow).
- Naming conventions: **Container** = fill for foreground elements, not for text; **On-X** = text/icons on X; **Variant** = lower-emphasis alternative.
- Uses the site gives: primary = FAB, high-emphasis buttons, active states. Secondary container = tonal buttons, selected nav icon, filter chips. Tertiary = contrasting accents (badges, input fields). Error roles are static across dynamic schemes.
- Surfaces: `surface` = default background. `surface-container-lowest…highest` = five emphasis levels. The default component mappings shown on the page cover low, container, high and highest. *"The most common combination … uses surface for a background area and surface container for a navigation area."* `on-surface` / `on-surface-variant` = text and icons on any surface.
- Inverse roles: snackbar = `inverse-surface` background, `inverse-on-surface` text, `inverse-primary` action.
- Outline: `outline` for important boundaries (text-field border). `outline-variant` for decorative elements such as dividers and card borders; the site's *Don't* examples forbid using `outline` for dividers or cards.
- Role descriptions (34.0.21 `_md-sys-color.scss` doc comments): `on-surface-variant` *"For text and icons to indicate active or inactive component state"*; `surface-variant` *"Alternate surface color, can be used for active states"*; `background` *"legacy color role. It is recommended to use Surface instead"*.

### Baseline scheme (34.0.21 `_md-sys-color.scss` / `_md-sys-color__dark.scss` + `_md-ref-palette.scss`)

Light hex values checked against the expanded token table on m3.material.io/styles/color/static/baseline (all match). The reference palette is identical in both token sets.

| Role | Light (tone) | Light | Dark (tone) | Dark |
|---|---|---|---|---|
| primary | primary40 | `#6750A4` | primary80 | `#D0BCFF` |
| on-primary | primary100 | `#FFFFFF` | primary20 | `#381E72` |
| primary-container | primary90 | `#EADDFF` | primary30 | `#4F378B` |
| on-primary-container ¹ | primary30 | `#4F378B` | primary90 | `#EADDFF` |
| secondary | secondary40 | `#625B71` | secondary80 | `#CCC2DC` |
| on-secondary | secondary100 | `#FFFFFF` | secondary20 | `#332D41` |
| secondary-container | secondary90 | `#E8DEF8` | secondary30 | `#4A4458` |
| on-secondary-container ¹ | secondary30 | `#4A4458` | secondary90 | `#E8DEF8` |
| tertiary | tertiary40 | `#7D5260` | tertiary80 | `#EFB8C8` |
| on-tertiary | tertiary100 | `#FFFFFF` | tertiary20 | `#492532` |
| tertiary-container | tertiary90 | `#FFD8E4` | tertiary30 | `#633B48` |
| on-tertiary-container ¹ | tertiary30 | `#633B48` | tertiary90 | `#FFD8E4` |
| error | error40 | `#B3261E` | error80 | `#F2B8B5` |
| on-error | error100 | `#FFFFFF` | error20 | `#601410` |
| error-container | error90 | `#F9DEDC` | error30 | `#8C1D18` |
| on-error-container ¹ | error30 | `#8C1D18` | error90 | `#F9DEDC` |
| surface | neutral98 | `#FEF7FF` | neutral6 | `#141218` |
| on-surface | neutral10 | `#1D1B20` | neutral90 | `#E6E0E9` |
| surface-variant | neutral-variant90 | `#E7E0EC` | neutral-variant30 | `#49454F` |
| on-surface-variant | neutral-variant30 | `#49454F` | neutral-variant80 | `#CAC4D0` |
| surface-container-lowest | neutral100 | `#FFFFFF` | neutral4 | `#0F0D13` |
| surface-container-low | neutral96 | `#F7F2FA` | neutral10 | `#1D1B20` |
| surface-container | neutral94 | `#F3EDF7` | neutral12 | `#211F26` |
| surface-container-high | neutral92 | `#ECE6F0` | neutral17 | `#2B2930` |
| surface-container-highest | neutral90 | `#E6E0E9` | neutral22 | `#36343B` |
| surface-dim | neutral87 | `#DED8E1` | neutral6 | `#141218` |
| surface-bright | neutral98 | `#FEF7FF` | neutral24 | `#3B383E` |
| inverse-surface | neutral20 | `#322F35` | neutral90 | `#E6E0E9` |
| inverse-on-surface | neutral95 | `#F5EFF7` | neutral20 | `#322F35` |
| inverse-primary | primary80 | `#D0BCFF` | primary40 | `#6750A4` |
| outline | neutral-variant50 | `#79747E` | neutral-variant60 | `#938F99` |
| outline-variant | neutral-variant80 | `#CAC4D0` | neutral-variant30 | `#49454F` |
| primary-fixed / -fixed-dim | primary90 / 80 | `#EADDFF` / `#D0BCFF` | same | same |
| on-primary-fixed / -fixed-variant | primary10 / 30 | `#21005D` / `#4F378B` | same | same |
| secondary-fixed / -fixed-dim | secondary90 / 80 | `#E8DEF8` / `#CCC2DC` | same | same |
| on-secondary-fixed / -fixed-variant | secondary10 / 30 | `#1D192B` / `#4A4458` | same | same |
| tertiary-fixed / -fixed-dim | tertiary90 / 80 | `#FFD8E4` / `#EFB8C8` | same | same |
| on-tertiary-fixed / -fixed-variant | tertiary10 / 30 | `#31111D` / `#633B48` | same | same |
| background / on-background | neutral98 / 10 | `#FEF7FF` / `#1D1B20` | neutral6 / 90 | `#141218` / `#E6E0E9` |
| scrim, shadow | neutral0 | `#000000` | neutral0 | `#000000` |
| surface-tint ² | = primary | `#6750A4` | = primary | `#D0BCFF` |

¹ The v0.192 token set maps the light `on-*-container` roles to tone 10: `#21005D`, `#1D192B`, `#31111D`, `#410E0B`. `@material/web` compiled CSS uses these as fallbacks, e.g. `var(--md-sys-color-on-secondary-container, #1d192b)`.
² The 34.0.21 set marks `surface-tint` as `@deprecated This token should no longer be used and its function/usage has been replaced by the tonal surface colors`.

Theming `@material/web`: set `--md-sys-color-<role>` custom properties. The Sass mixins `color.light-theme` / `color.dark-theme` live in `color/_color.scss`. Dark mode is not automatic (`docs/support.md`).

### Generating a scheme from a seed — `@material/material-color-utilities` (MCU)

- Version **0.4.0**, published 2026-01-21 (previous 0.3.0 on 2024-06-24). Licence **Apache-2.0**. ESM; relative imports have no file extension, so run it through a bundler (plain Node ESM fails with `ERR_MODULE_NOT_FOUND`).
- m3.material.io "How the system works": source colour → five key colours (primary, secondary, tertiary, neutral, neutral variant) → tonal palettes (tones 0–100) → tones assigned to roles, computed in the HCT colour space (hue, chroma, tone). The site describes two algorithms: *"user-generated"* (wallpaper) and *"content-based"* (*"tones are adjusted to match the appearance of the source image"*).
- API: `new Scheme<Variant>(sourceColorHct, isDark, contrastLevel, specVersion?, platform?)`. `contrastLevel` runs from -1 to 1 (0 = standard). `specVersion` is `'2021'` (default) or `'2025'`; `platform` is `'phone'` (default) or `'watch'`. Read roles with `new MaterialDynamicColors().<role>().getArgb(scheme)`.
- `Scheme`, `CorePalette` and `themeFromSourceColor` are deprecated in favour of `DynamicScheme`. Migration guide: https://github.com/material-foundation/material-color-utilities/blob/main/make_schemes.md
- Variants (`dynamiccolor/variant.js`): MONOCHROME, NEUTRAL, TONAL_SPOT, VIBRANT, EXPRESSIVE, FIDELITY, CONTENT, RAINBOW, FRUIT_SALAD.
- Palette rules for the 2021 spec (`dynamiccolor/dynamic_scheme.js`; each palette is hue, chroma):

| Variant | Doc comment | Primary | Secondary | Tertiary | Neutral / N-variant |
|---|---|---|---|---|---|
| TonalSpot | *"low to medium colorfulness … The default Material You theme on Android 12 and 13"* | hue, 36 | hue, 16 | hue+60°, 24 | hue, 6 / hue, 8 |
| Fidelity | *"places the source color in `primaryContainer`"* | hue, source chroma | hue, max(C−32, C·0.5) | complement from `TemperatureCache` (disliked hues fixed) | C/8 / C/8+4 |
| Content | same as Fidelity | hue, source chroma | hue, max(C−32, C·0.5) | `analogous(3, 6)[2]` | C/8 / C/8+4 |
| Vibrant | *"maxes out colorfulness"* | hue, 200 | rotated hue, 24 | rotated hue, 32 | hue, 10 / 12 |
| Expressive | *"intentionally detached from the source color"* | hue+240°, 40 | rotated, 24 | rotated, 32 | hue+15°, 8 / 12 |
| Neutral / Monochrome | *"near grayscale"* / *"grayscale"* | 12 / 0 | 8 / 0 | 16 / 0 | 2 / 0 |

  In both specs the error palette is hue 25, chroma 84. The 2025 spec changes TonalSpot primary chroma to 32 (26 on phone in dark mode) and tertiary to a rotated hue at chroma 28 (phone).
- Observed: `SchemeTonalSpot` seeded with `#6750A4` (2021 spec, light) gives primary `#65558F`, primary-container `#E9DDFF`, surface `#FDF7FF`, error `#BA1A1A`. It does **not** reproduce the baseline hex values above.

---

## 3. Typography

The typeface is **Roboto** for both `brand` (display, headline, title-large) and `plain` (everything else). Weights: regular 400, medium 500, bold 700. Source: `_md-ref-typeface.scss` in both token sets; m3.material.io: *"Roboto is the default for both typefaces."* The sizes below are identical in both token sets (`_md-sys-typescale.scss`).

| Style | Size | Line height | Weight | Tracking | Face |
|---|---|---|---|---|---|
| display-large | 57px (3.5625rem) | 64px | 400 | −0.25px (−0.015625rem) | brand |
| display-medium | 45px | 52px | 400 | 0 | brand |
| display-small | 36px | 44px | 400 | 0 | brand |
| headline-large | 32px | 40px | 400 | 0 | brand |
| headline-medium | 28px | 36px | 400 | 0 | brand |
| headline-small | 24px | 32px | 400 | 0 | brand |
| title-large | 22px | 28px | 400 | 0 | brand |
| title-medium | 16px | 24px | 500 | 0.15px | plain |
| title-small | 14px | 20px | 500 | 0.1px | plain |
| body-large | 16px | 24px | 400 | 0.5px | plain |
| body-medium | 14px | 20px | 400 | 0.25px | plain |
| body-small | 12px | 16px | 400 | 0.4px | plain |
| label-large | 14px | 20px | 500 | 0.1px | plain |
| label-medium | 12px | 16px | 500 | 0.5px | plain |
| label-small | 11px | 16px | 500 | 0.5px | plain |

- v0.192 also defines `label-large-weight-prominent` and `label-medium-weight-prominent` = 700. The navigation drawer's active label uses the first.
- **Emphasized** set (M3 Expressive; 34.0.21 `_md-sys-typescale-emphasized.scss`): same sizes. Weight becomes 500 for display, headline, title-large and body; 700 for title-medium, title-small and all labels. The m3 site: *"Material components don't use emphasized type styles by default."*
- m3.material.io/styles/typography/fonts: *"Static fonts like Roboto are currently applied by default to all Material 3 components. Variable fonts like Roboto Flex … aren't yet part of the M3 typescale."* Recommended fallback order: Roboto Flex → Roboto → Noto Sans.

---

## 4. Shape scale

From `_md-sys-shape.scss`; m3.material.io/styles/shape/corner-radius-scale lists the same ten steps.

| Step | Radius | In v0.192 |
|---|---|---|
| none | 0 | ✓ |
| extra-small | 4px | ✓ (+ `extra-small-top` 4 4 0 0) |
| small | 8px | ✓ |
| medium | 12px | ✓ |
| large | 16px | ✓ (+ `-top` 16 16 0 0, `-start` 16 0 0 16, `-end` 0 16 16 0) |
| large-increased | 20px | 34.0.21 only |
| extra-large | 28px | ✓ (+ `-top` 28 28 0 0) |
| extra-large-increased | 32px | 34.0.21 only |
| extra-extra-large | 48px | 34.0.21 only |
| full | `9999px` in tokens (fully rounded) | ✓ |

---

## 5. Elevation

- Levels (`_md-sys-elevation.scss`, dp): level0 0, level1 1, level2 3, level3 6, level4 8, level5 12. `@material/web` overrides these to the level numbers 0–5 for its `md-elevation` math (`tokens/_md-sys-elevation.scss`).
- m3.material.io: *"An element's resting state can be on levels 0 to +3, while levels +4 and +5 are reserved for user-interacted states such as hover and dragged."* Scrim = `scrim` role at **32 %** opacity.
- Shadows (`elevation/internal/_elevation.scss`): two layers in `md.sys.color.shadow` — a key shadow at opacity 0.3 and an ambient shadow at opacity 0.15.

| Level | Key `x y blur spread` (α 0.3) | Ambient (α 0.15) |
|---|---|---|
| 0 | 0 0 0 0 | 0 0 0 0 |
| 1 | 0 1px 2px 0 | 0 1px 3px 1px |
| 2 | 0 1px 2px 0 | 0 2px 6px 2px |
| 3 | 0 1px 3px 0 | 0 4px 8px 3px |
| 4 | 0 2px 3px 0 | 0 6px 10px 4px |
| 5 | 0 4px 4px 0 | 0 8px 12px 6px |

- **Surface tint vs surface containers.** Current M3 separates layers by tonal difference, not tint overlays. The m3 site: *"By default, Material 3's surfaces use tonal difference to indicate separation"*, and the surface roles *"are not tied to elevation"*. `surface-tint` is deprecated in the 34.0.21 set (§2). `md-elevation` draws shadows only, and components pick a `surface-container-*` fill: elevated card and elevated button → `surface-container-low`; menu → `surface-container`; dialog and search bar → `surface-container-high`.

---

## 6. State layers

The state layer uses the colour of the content (usually the `on-` role) at a fixed opacity; it is 40dp inside a 48dp target (m3.material.io/foundations/interaction/states/state-layers).

| State | v0.192 | 34.0.21 = m3.material.io today |
|---|---|---|
| hover | 0.08 | 0.08 |
| focus | 0.12 | 0.10 |
| pressed | 0.12 | 0.10 |
| dragged | 0.16 | 0.16 |
| disabled (content) | 0.38 (component tokens) | 0.38 (`disabled-state-layer-opacity`) |

- Disabled containers: on-surface at 0.12 in v0.192; 0.1 for the 34.0.21 `button-filled`.
- `@material/web` ripple defaults: hover 0.08, pressed 0.12. Its buttons list the focus state-layer tokens as `unsupported-tokens`; focus is drawn by `md-focus-ring` instead: 3px ring (8px during the grow animation), colour `secondary`, 2px outward offset, 600 ms, `cubic-bezier(0.2, 0, 0, 1)` (`focus/internal/focus-ring-styles.css`).

---

## 7. Component specs

Colours are role names. Spacing comes from `@material/web` compiled CSS (`*/internal/*-styles.css`) where the token sets have none. "Expressive" = the 34.0.21 set / current m3.material.io.

### Buttons (filled, tonal, outlined, text, elevated)

| | Filled | Tonal | Outlined | Text | Elevated |
|---|---|---|---|---|---|
| Container | primary | secondary-container | transparent + 1px `outline` | transparent | surface-container-low, level1 |
| Label & icon | on-primary | on-secondary-container | primary | primary | primary |
| Hover elevation | level1 | level1 | – | – | level2 |
| Padding (no icon) | 24 / 24 | 24 / 24 | 24 / 24 | 12 / 12 | 24 / 24 |
| Padding (leading icon) | 16 / 24 | 16 / 24 | 16 / 24 | 12 / 16 | 16 / 24 |

- Common: height 40, shape full, icon 18, label `label-large`. Disabled: container on-surface at 0.12, label on-surface at 0.38. Sources: v0.192 `_md-comp-{filled,filled-tonal,outlined,text,elevated}-button.scss`; `button/internal/*-styles.css`.
- **Expressive** (`_md-comp-button-{xsmall…xlarge}.scss`; m3.material.io/components/buttons/specs):

  | Size | Height | Side padding | Icon | Icon–label gap | Label | Square corner | Pressed corner |
  |---|---|---|---|---|---|---|---|
  | XS | 32 | 12 | 20 | 8 | label-large | 12 | 8 |
  | S (default) | 40 | 16 | 20 | 8 | label-large | 12 | 8 |
  | M | 56 | 24 | 24 | 8 | title-medium | 16 | 12 |
  | L | 96 | 48 | 32 | 12 | headline-small | 28 | 16 |
  | XL | 136 | 64 | 40 | 16 | headline-large | 28 | 16 |

  The site marks the 24dp small-button padding *"Not recommended. Use 16dp"*. Outlined buttons now use `outline-variant` with an `on-surface-variant` label. Toggle buttons: filled unselected = surface-container / on-surface-variant; tonal selected = secondary / on-secondary; outlined selected = inverse-surface / inverse-on-surface.

### Icon buttons

| | Standard | Filled | Tonal | Outlined |
|---|---|---|---|---|
| Container | none (40 state layer) | primary | secondary-container | 1px `outline` |
| Icon | on-surface-variant | on-primary | on-secondary-container | on-surface-variant |
| Toggle, unselected | icon on-surface-variant | surface-container-highest, icon primary | surface-container-highest, icon on-surface-variant | as default |
| Toggle, selected | icon primary | primary / on-primary | secondary-container / on-secondary-container | inverse-surface / inverse-on-surface |

- Size 40×40, icon 24, shape full (`iconbutton/internal/*-styles.css`; v0.192).
- **Expressive** sizes XS / S / M / L / XL: height 32 / 40 / 56 / 96 / 136, icon 20 / 24 / 24 / 32 / 40, square corner 12 / 12 / 16 / 28 / 28. Outlined uses `outline-variant`, width 1 / 1 / 1 / 2 / 3. Filled unselected = surface-container; tonal selected = secondary / on-secondary. XS and S need a ≥ 48×48 target.

### FAB and extended FAB

- `md-fab` (`fab/internal/fab-styles.css`, `shared-styles.css`):
  - Sizes: medium 56×56 with corner 16 (large) and icon 24; small 40×40 with corner 12 (medium); large 96×96 with corner 28 (extra-large) and icon 36.
  - Elevation level3; lowered level1.
  - Default variant `surface`: surface-container-high container, icon/label primary.
  - `primary` = primary-container / on-primary-container; `secondary` and `tertiary` follow the same pattern.
- Extended FAB (`label` set): height 56, padding 16 start / 20 end, icon–label gap 12, label `label-large`. v0.192 `extended-fab-primary`: primary-container, on-primary-container, level3. m3 baseline table: width *"Dynamic, 80dp min"*, shape 16.
- **Expressive**:
  - FAB 56 (corner 16, icon 24); medium FAB 80 (corner 20, icon 28); large 96 (corner 28, icon 36). Small FAB and surface FAB are *"no longer recommended"* (m3 FAB specs).
  - Extended FAB small 56 (padding 16, gap 8, icon 24), medium 80 (padding 26, gap 12, icon 28), large 96 (padding 28, gap 16, icon 36). Margins 16.

### Chips (assist, filter, input, suggestion)

- Common: height 32, corner 8 (small), label `label-large`, icons 18, padding 16 (8 on an icon side), icon–label gap 8.
- Outline: 1px `outline` in v0.192; `outline-variant` in 34.0.21. The m3 chips page text lists "Outline" for assist and "Outline variant" for filter and input.
- Assist: label on-surface, icon primary. Elevated variant: surface-container-low, level1.
- Filter: unselected label on-surface-variant, leading icon primary. Selected: secondary-container fill, no outline, on-secondary-container label and icons.
- Input: unselected label on-surface-variant. Selected: secondary-container / on-secondary-container. Avatar 24 (full in tokens; m3 page says 12dp radius), avatar padding 4 left / 8 right, close-icon target ≥ 48.
- Suggestion: label on-surface-variant, icon primary.
- Sources: v0.192 `_md-comp-{assist,filter,input,suggestion}-chip.scss`; `chips/internal/*-styles.css`; m3 chips specs.

### List items

- Heights: one-line 56, two-line 72, three-line 88 (`_md-comp-list.scss`, both sets).
- Container `surface`, shape none. Padding: 16 leading / 16 trailing (m3 table: trailing element right padding 24). Vertical padding: `@material/web` 12; 34.0.21 10. Gap between slots: `@material/web` 16; 34.0.21 12.
- Text:

  | Element | Typescale | Colour |
  |---|---|---|
  | Label | body-large | on-surface |
  | Supporting text | body-medium | on-surface-variant |
  | Overline | label-small | on-surface-variant |
  | Trailing supporting text | label-small | on-surface-variant |

- Leading and trailing slots:

  | Element | Size / shape | Colour |
  |---|---|---|
  | Leading icon | 24 | on-surface-variant |
  | Leading avatar | 40, full | primary-container fill, on-primary-container label in `title-medium` |
  | Leading image | 56×56 | – |
  | Leading video | width 100 | – |
  | Trailing icon | 24 | on-surface-variant |

- Alignment at ≥ 88 height: label and leading/trailing elements go top-aligned; leading icon top padding becomes 12 instead of 8. Divider inset 16 left, 24 right.
- `@material/web` `md-list-item` slots: `start`, default/`headline`, `overline`, `supporting-text`, `trailing-supporting-text`, `end`. Its focus-ring radius is 8.
- **Expressive lists** (the site says baseline is *"Not recommended. Use expressive lists instead"*):
  - Segmented style; container corner 16.
  - Unselected item: inner corners 4, outer 16. Selected item: all corners 16; secondary-container fill with on-secondary-container text.
  - Expressive icon size 20.

### Navigation drawer items

m3.material.io/components/navigation-drawer/specs; v0.192 `_md-comp-navigation-drawer.scss`.

| Element | Value |
|---|---|
| Drawer | width 360, full height |
| Standard container | surface, level0, corners 0 16 16 0 (`corner-large-end`) |
| Modal container | surface-container-low, level1 |
| Active indicator | height 56, width 336, shape full (m3: "28dp"), inset 12 |
| Active item colours | secondary-container indicator; on-secondary-container icon and label |
| Inactive item colours | on-surface-variant icon and label |
| Label | `label-large`; active weight = `label-large-weight-prominent` 700 |
| Other text | headline `title-small` on-surface-variant; badge label `label-large` |
| Spacing | icon 24; label padding 28 left / right; 0 between items |

- m3 site: *"The navigation drawer is no longer recommended in the Material 3 Expressive update … use an expanded navigation rail."*
- Expanded rail (34.0.21 `_md-comp-nav-rail-*`): width 220–360, container surface (modal: surface-container, level2, corner 16). Item: 56 high, full-shape indicator, 16 side padding, gap 8. Active colours: indicator secondary-container, icon on-secondary-container, label secondary.
- `@material/web` has only a labs container (`md-navigation-drawer`), no drawer item element.

### Search bar

v0.192 `_md-comp-search-bar.scss`, `_md-comp-search-view.scss`; m3.material.io/components/search/specs.

| Element | Value |
|---|---|
| Container | height 56, shape full, surface-container-high, elevation level3; width min 360 / max 720 |
| Leading icon | on-surface |
| Input text | `body-large`, on-surface |
| Placeholder (supporting text) | `body-large`, on-surface-variant |
| Trailing icon | on-surface-variant |
| Icons / avatar | icons 24; avatar 30, full |
| Padding | 34.0.21 tokens: 16 leading / trailing, 16 between icon and label. m3 table (Expressive): outer margin 24 unfocused, 12 focused |
| Search view (docked) | corner 28, header 56 |
| Search view (full-screen) | corner 0, header 72 |

- Divider in the search view: `outline`.
- m3: the *"Divided (baseline)"* style is *"Not recommended. Use contained."*
- Not in `@material/web`.

### Cards

| | Elevated | Filled | Outlined |
|---|---|---|---|
| Container | surface-container-low | surface-container-highest | surface |
| Elevation | level1 | level0 | level0 |
| Border | – | – | 1px `outline-variant` |

- All three: corner 12 (medium), icon 24 primary. m3: left/right padding 16, *"Padding between cards 8dp max"*.
- Same values in both token sets.
- `@material/web`: labs only.

### Checkbox

- Box 18×18, corner 2, unselected outline 2px on-surface-variant.
- Selected: primary fill, check on-primary, no outline. Error: `error` / `on-error`.
- State layer 40, full shape; target 48.
- Sources: both token sets; m3 checkbox specs.

### Divider

- 1px, `outline-variant` (both sets).
- m3: full-width 100%; inset left 16; middle inset 16 / 16; 4 above supporting text.

### Tabs

- Container surface, height 48; 64 with icon and label. Label `title-small`; icon 24; padding 0 16; inline icon–label gap 8. The divider (1px, `outline-variant` on the m3 page) sits inside the height.
- Primary tab: active indicator primary, 3px high, shape `3 3 0 0`, inset 2 each side, min length 24. Active label/icon primary; inactive on-surface-variant.
- Secondary tab: indicator primary, 2px. Active label/icon on-surface; inactive on-surface-variant.
- Sources: v0.192 `_md-comp-{primary,secondary}-navigation-tab.scss`; `tabs/internal/*-styles.css`; m3 tabs specs.

### Text fields (outlined, filled)

| | Outlined | Filled |
|---|---|---|
| Container | transparent, corner 4 | surface-container-highest, corners 4 4 0 0 |
| Enabled border | 1px `outline` | 1px active indicator, on-surface-variant |
| Focused border | 2px primary | 2px primary |
| Vertical padding | 16 / 16 | 16 / 16; 8 / 8 when a label is present |
| Populated label | notched into the outline, 4px padding | floats inside the container |

- Common: height 56 (the 34.0.21 token is deprecated for multi-line). Side padding 16 (12 on a side with an icon), icon–text gap 16, icons 24 on-surface-variant.
- Text: input `body-large` on-surface; label `body-large` → `body-small` when populated, colour on-surface-variant (primary when focused); supporting text `body-small` on-surface-variant, 4 above; caret primary.
- Error: `error` for outline, label, supporting text and trailing icon.
- Sources: v0.192 `_md-comp-{outlined,filled}-text-field.scss`; `textfield/internal/*-styles.css`; m3 text-field specs.

### Dialog

- Container surface-container-high, level3, corner 28.
- Width min 280, max 560; `@material/web` also sets max-height `min(560px, 100% - 48px)` and min-height 140.
- Text: headline `headline-small` on-surface; supporting `body-medium` on-surface-variant; optional icon 24 in `secondary`; actions are text buttons in primary.
- Padding 24; 16 between title and body and between icon and title; 24 between body and actions; 8 between buttons (`@material/web` actions padding: 16 24 24).
- Scrim `scrim` at 32 %.
- Full-screen dialog: corner 0, header 56.
- Sources: both token sets; `dialog/internal/dialog-styles.css`; m3 dialog specs.

### Menu

- **Baseline:**
  - Container surface-container, level2, corner 4; width 112 min / 280 max; 8 vertical padding.
  - Item: height 48, side padding 12, gap 12, `label-large` on-surface, icons 24 on-surface-variant. Selected item: secondary-container / on-secondary-container.
  - Divider: 8 above and below.
  - Sources: v0.192 `_md-comp-menu.scss`, 34.0.21 `_md-comp-menu.scss`, m3 menu specs.
- `@material/web` `md-menu-item` reuses the list item instead: min-height 56, padding 12 / 16, `body-large`.
- **Expressive vertical menu** (34.0.21 `_md-comp-menus*.scss`):
  - Container surface-container-low, corner 16.
  - Item: height 44, padding 16 × 8, icons 20, shape 4; selected item corner 12.
  - Selected colours: tertiary-container / on-tertiary-container. The *vibrant* style is tertiary-based.
  - Groups: 2 gap, corner 8.

### Badge

| | Small | Large |
|---|---|---|
| Size | 6 dot | 16 high, min-width 16, max 16×34 with 4 horizontal padding |
| Shape | full (m3: 3dp radius) | full (m3: 8dp radius) |
| Text | – | `label-small`, on-error |
| Placement from the icon's top-trailing corner | 6×6 | 14×12 |

- Colour: `error` fill for both.
- Sources: both token sets; `labs/badge/internal/badge-styles.css`; m3 badge specs.

---

## 8. Fonts and licences

| Family | On Google Fonts since (catalog `dateAdded`) | Axes on Google Fonts | Licence |
|---|---|---|---|
| Roboto | 2013-01-08 | wdth 75–100, wght 100–900 | OFL-1.1 (`google/fonts` `ofl/roboto`) |
| Roboto Flex | 2022-05-02 | GRAD, XOPQ, XTRA, YOPQ, YTAS, YTDE, YTFI, YTLC, YTUC, opsz 8–144, slnt, wdth 25–151, wght 100–1000 | OFL-1.1 |
| **Google Sans Flex** | **2025-11-12** (press: released 2025-11-18) | GRAD 0–100, ROND 0–100, opsz 6–144, slnt −10–0, wdth 25–151, wght 1–1000 | **OFL-1.1**, no Reserved Font Names |
| **Google Sans** | **2025-12-09** (press: released 2025-12-10) | GRAD −50–200, opsz 17–18, wght 400–700 (+ italic) | **OFL-1.1**, no Reserved Font Names |
| Google Sans Code | 2025-02-26 | MONO, wght 300–800 | OFL-1.1 |

- **Google Sans Text**: the `googlefonts/googlesans` README says the opsz axis runs 17–18, and *"the min optical size design is named 'Google Sans Text' and the max optical size design is named 'Google Sans'"*. The licensed way to get the Text design is therefore Google Sans at opsz 17. The CSS API also answers `family=Google+Sans+Text` (`fonts.gstatic.com/s/googlesanstext/v29`), but that family is not in the fonts.google.com catalog.
- Trademarks (`ofl/googlesans/TRADEMARKS.md`, same in `googlesansflex`): *"'Google', and 'Google Sans' are trademarks of Google LLC."* The names may be used only with the original or modified font and *"may not be incorporated as part of your company name, product name, domain name…"*.
- Upstream repositories (OFL-1.1): `googlefonts/googlesans` (latest release v14.000, 2026-06-10) and `googlefonts/googlesans-flex` (v4.007, 2026-08-21).
- **Loading**
  - Google Fonts CSS API (checked 2026-09-27):
    - `https://fonts.googleapis.com/css2?family=Google+Sans:opsz,wght@17..18,400..700&display=swap`
    - `…family=Google+Sans+Flex:opsz,wght@6..144,1..1000`
    - `…family=Roboto:wght@400;500;700` (the `@material/web` quick start uses this one)
    - `…family=Roboto+Flex:opsz,wght@8..144,100..1000`
  - npm (Fontsource, OFL-1.1): `@fontsource/roboto` / `@fontsource-variable/roboto` 5.3.0; `@fontsource-variable/roboto-flex` 5.3.0; `@fontsource/google-sans` / `@fontsource-variable/google-sans` 5.3.1; `@fontsource/google-sans-flex` / `@fontsource-variable/google-sans-flex` 5.3.1. There is no `@fontsource/google-sans-text`.

---

## 9. Icons — Material Symbols

- Three variable-font families: **Outlined**, **Rounded**, **Sharp**. Axes (`google/material-design-icons` README):
  - `FILL` 0–1 (default 0)
  - `wght` 100–700 (default 400)
  - `GRAD` −50–200 (default 0; −50 suggested for light-on-dark)
  - `opsz` 20–48 (default 24)
- Only the 20 and 24 px designs are pixel-grid aligned. There is no separate filled font; filled icons come from the `FILL` axis. Upstream files: `variablefont/MaterialSymbols{Outlined,Rounded,Sharp}[FILL,GRAD,opsz,wght].{ttf,woff2,codepoints}`.
- Licence: **Apache-2.0** (repo LICENSE; developers.google.com/fonts/docs/material_symbols). Fontsource's npm metadata labels its copies `OFL-1.1`.
- **Google Fonts CSS API**:
  - `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200` — returns HTTP 200; the response defines the `.material-symbols-outlined` class; currently gstatic `materialsymbolsoutlined/v374`.
  - Recommended subsetting: `&icon_names=home,palette,settings&display=block` (names in alphabetical order).
  - Style axes in CSS: `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`.
  - The docs page (last updated 2024-09-26) also shows a `ROND` axis on `Material Symbols Outlined`. On 2026-09-27 that request returned HTTP 400 for Outlined, Rounded and Sharp. `ROND` is accepted only by an unlisted `family=Material+Symbols` (class `.material-symbols`, gstatic `materialsymbols/v101`).
- **npm** (community packages; Google's README: *"Google does not currently maintain the npm package … user @marella is hosting the following … Google does not monitor or vet these packages"*):
  - `material-symbols` 0.47.5 (2026-09-22, Apache-2.0): all three styles with every axis; `import 'material-symbols'` or `material-symbols/outlined.css`; classes `.material-symbols-{outlined,rounded,sharp}`.
  - `@material-symbols/font-400` 0.47.5: weight 400 only, GRAD 0, opsz 48; sibling packages `font-100` … `font-700`.
  - `@material-symbols/svg-400` 0.47.5: SVGs.
  - Fontsource: `@fontsource-variable/material-symbols-outlined` / `-rounded` 5.3.7.
  - The legacy Material Icons set is *"no longer updated"*.
- `@material/web` `md-icon` renders a ligature in the font family set by `--md-icon-font` (default `Material Symbols Outlined`).

---

## 10. Colours Google publishes

| Value | Name / use | Source |
|---|---|---|
| `#4285F4` | "Google Ecosystem Blue" | [Firebase Brand Guidelines](https://firebase.google.com/brand-guidelines) |
| `#1F1F1F`, `#303030`, `#474747`, `#757575`, `#8F8F8F`, `#ABABAB`, `#C7C7C7`, `#E3E3E3`, `#F2F2F2`, `#FDFCFB` | Gray 10, 20, 30, 50, 60, 70, 80, 90, 95, 99 | [Firebase Brand Guidelines](https://firebase.google.com/brand-guidelines) |
| `#FFFFFF` fill, `#747775` 1px stroke, `#1F1F1F` text | "Sign in with Google" button, light theme; text "Google Sans Medium 14/20" | [Sign in with Google Branding Guidelines](https://developers.google.com/identity/branding-guidelines) |
| `#131314` fill, `#8E918F` stroke, `#E3E3E3` text | same button, dark theme | same |
| `#F2F2F2` fill, `#1F1F1F` text | same button, neutral theme | same |

## Gaps and discrepancies

- m3.material.io spec pages give many measurements only as images. The figures here come from tokens, the text tables on the spec pages, and `@material/web` CSS. The m3 token tables are collapsed widgets; only the baseline light colour table was expanded and checked.
- Two generations of values coexist. `@material/web` stable components and their fallbacks use the v0.192 set: light `on-*-container` at tone 10, focus/pressed opacity 0.12, chip outlines in `outline`, outlined buttons in `outline`. m3.material.io and the 34.0.21 set use the newer values. Pick one per catalog.
- `@material/web` `md-menu-item` (56px, body-large) differs from the menu spec (48px, label-large).
- Navigation drawer label typography and paddings come from the m3 table (28 / 12); the drawer is superseded by the expanded navigation rail in M3 Expressive.
- `ROND` for Material Symbols: the docs and the live CSS API disagree (see §9).
- Not verified: the exact product styling of Gmail and Google Calendar (e.g. which Google Sans cuts and sizes those apps use). This file covers Material 3 only.
- Local captures of the rendered m3 pages (plain text) are in `m3-pages/` (git-ignored).

---

## Sources

**m3.material.io** (rendered with Playwright, 2026-09-27)
- https://m3.material.io/develop/web
- https://m3.material.io/styles/color/roles
- https://m3.material.io/styles/color/choosing-a-scheme
- https://m3.material.io/styles/color/static/baseline
- https://m3.material.io/styles/color/system/how-the-system-works
- https://m3.material.io/styles/typography/fonts
- https://m3.material.io/styles/typography/type-scale-tokens
- https://m3.material.io/styles/shape/corner-radius-scale
- https://m3.material.io/styles/elevation/applying-elevation
- https://m3.material.io/foundations/interaction/states/state-layers
- https://m3.material.io/styles/icons/overview
- https://m3.material.io/components/{buttons,icon-buttons,floating-action-button,extended-fab,chips,lists,navigation-drawer,search,cards,checkbox,divider,tabs,text-fields,dialogs,menus,badges}/specs

**`@material/web@2.5.0`** (npm tarball, `npm pack @material/web@2.5.0`)
- `package.json`, `LICENSE`, `README.md`, `custom-elements.json`, `all.js`
- `tokens/versions/v0_192/_md-sys-{color,shape,elevation,state,typescale}.scss`, `_md-ref-{palette,typeface}.scss`, `_md-comp-*.scss`
- `tokens/versions/latest/sass/_md-sys-*.scss`, `_md-sys-typescale-emphasized.scss`, `_md-comp-*.scss` (Google Material 3 version 34.0.21)
- `tokens/_md-sys-elevation.scss`, `tokens/_md-comp-filled-button.scss`, `tokens/versions/README.md`
- `elevation/internal/_elevation.scss`; `focus/internal/focus-ring-styles.css`; `ripple/internal/ripple-styles.css`
- `{button,iconbutton,fab,chips,textfield,tabs,dialog,menu,list}/internal/**/*-styles.css`; `labs/{badge,card,navigationdrawer,item}/internal/*-styles.css`; `labs/gb/components/*`
- GitHub: https://github.com/material-components/material-web/discussions/5642 · https://github.com/material-components/material-web/releases/tag/v2.5.0 · `docs/roadmap.md` · `docs/support.md` · `labs/README.md`

**`@material/material-color-utilities@0.4.0`** (npm tarball)
- `README.md`; `scheme/scheme_*.d.ts`; `dynamiccolor/{dynamic_scheme.js,variant.js,color_spec_2025.js}`; `scheme/scheme.d.ts`; `palettes/core_palette.d.ts`
- https://github.com/material-foundation/material-color-utilities

**React**
- https://react.dev/blog/2024/12/05/react-19 (Support for Custom Elements)
- https://custom-elements-everywhere.com/

**Fonts**
- https://fonts.google.com/metadata/fonts (catalog `dateAdded`, axes)
- `google/fonts`: `ofl/{roboto,robotoflex,googlesans,googlesansflex,googlesanscode}/{METADATA.pb,OFL.txt,TRADEMARKS.md}`
- https://github.com/googlefonts/googlesans (README) · https://github.com/googlefonts/googlesans-flex
- https://9to5google.com/2025/11/18/google-sans-flex-font-available/ · https://www.omgubuntu.co.uk/2025/11/google-sans-flex-font-ubuntu · https://en.wikipedia.org/wiki/Product_Sans
- Google Fonts CSS API responses: `https://fonts.googleapis.com/css2?family=…` (2026-09-27)
- npm: `@fontsource/roboto`, `@fontsource-variable/roboto`, `@fontsource-variable/roboto-flex`, `@fontsource(-variable)/google-sans`, `@fontsource(-variable)/google-sans-flex`

**Icons**
- https://github.com/google/material-design-icons (README, LICENSE, `variablefont/`)
- https://developers.google.com/fonts/docs/material_symbols
- npm: `material-symbols@0.47.5`, `@material-symbols/font-400@0.47.5`, `@material-symbols/svg-400@0.47.5`, `@fontsource-variable/material-symbols-outlined@5.3.7`
