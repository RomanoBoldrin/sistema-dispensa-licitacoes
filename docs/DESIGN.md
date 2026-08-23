---
name: SISD Design System
colors:
  surface: "#f6fafb"
  surface-dim: "#d6dbdc"
  surface-bright: "#f6fafb"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f0f4f5"
  surface-container: "#eaeff0"
  surface-container-high: "#e5e9ea"
  surface-container-highest: "#dfe3e4"
  on-surface: "#181c1d"
  on-surface-variant: "#3e494a"
  inverse-surface: "#2c3132"
  inverse-on-surface: "#edf1f2"
  outline: "#6e797b"
  outline-variant: "#bdc9ca"
  surface-tint: "#006874"
  primary: "#00646f"
  on-primary: "#ffffff"
  primary-container: "#087f8c"
  on-primary-container: "#effdff"
  inverse-primary: "#79d4e2"
  secondary: "#546162"
  on-secondary: "#ffffff"
  secondary-container: "#d7e5e6"
  on-secondary-container: "#5a6768"
  tertiary: "#884a1a"
  on-tertiary: "#ffffff"
  tertiary-container: "#a66230"
  on-tertiary-container: "#fff8f6"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#95f1ff"
  primary-fixed-dim: "#79d4e2"
  on-primary-fixed: "#001f24"
  on-primary-fixed-variant: "#004f57"
  secondary-fixed: "#d7e5e6"
  secondary-fixed-dim: "#bbc9ca"
  on-secondary-fixed: "#111e1f"
  on-secondary-fixed-variant: "#3c494a"
  tertiary-fixed: "#ffdcc7"
  tertiary-fixed-dim: "#ffb786"
  on-tertiary-fixed: "#311300"
  on-tertiary-fixed-variant: "#703706"
  background: "#f6fafb"
  on-background: "#181c1d"
  surface-variant: "#dfe3e4"
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: "600"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: "600"
    lineHeight: "1.3"
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: "500"
    lineHeight: "1.4"
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: "500"
    lineHeight: "1.4"
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.6"
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.6"
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: "1.5"
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "600"
    lineHeight: "1"
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is engineered for the high-stakes environment of public-sector procurement. It balances the gravity of government operations with the efficiency of modern SaaS. The brand personality is **Professional, Systematic, and Calm**, aiming to reduce the cognitive load associated with complex administrative workflows.

The visual style is **refined minimalism**. It utilizes a structured grid, significant negative space, and a restrained color palette to create an interface that feels more like a high-end productivity tool than a traditional bureaucratic portal. Visual hierarchy is established through precise typography and subtle tonal shifts rather than aggressive colors or heavy ornamentation.

## Colors

The palette is anchored by a sophisticated **Muted Cyan-Blue**, providing a sense of stability and institutional trust.

- **Primary (#087F8C):** Used for primary actions, active states, and key brand moments.
- **Surface Accents (#EAF8F9):** A low-vibrancy tint used for highlight backgrounds, selected list items, and subtle categorizations.
- **Foundations:** Pure White (#FFFFFF) is the primary workspace color, while the Secondary Background (#F7FBFC) provides soft contrast for sidebar navigation and layout containers.
- **Typography:** Primary text uses a deep blue-gray to ensure high legibility without the harshness of pure black. Secondary text uses a neutral gray for metadata and captions.

## Typography

This design system uses a dual-font approach. **Geist** is utilized for headlines to provide a modern, technical, and precise feel. **Inter** is used for all body text and interface labels to maximize readability across dense data tables and long-form procurement documents.

For mobile devices, `headline-lg` should scale down to 24px and `display-lg` to 32px. Use `body-md` as the standard for all data entries. Maintain generous line-heights (1.5x or higher) to ensure that dense text remains approachable.

## Layout & Spacing

The design system employs a **12-column fluid grid** for main content areas, with a maximum container width of 1440px to prevent excessive line lengths on ultra-wide monitors.

- **Desktop:** 24px margins and 24px gutters.
- **Tablet:** 16px margins and 16px gutters.
- **Mobile:** 16px margins, single-column layout.

The spacing scale is strictly linear, based on a 4px baseline. Use `lg` (32px) for spacing between major sections and `sm` (16px) for internal component padding. This creates a rhythm that feels organized and intentional.

## Elevation & Depth

To maintain a clean SaaS aesthetic, this design system avoids heavy shadows. Depth is conveyed primarily through **Tonal Layering** and **Micro-Shadows**.

1.  **Level 0 (Floor):** Background color (#F7FBFC). Used for the main application canvas.
2.  **Level 1 (Card):** White surfaces (#FFFFFF) with a 1px border (#E2E8F0). No shadow.
3.  **Level 2 (Interactive):** Elements like dropdowns or active cards use a very soft, diffused shadow: `0px 4px 12px rgba(0, 0, 0, 0.05)`.
4.  **Level 3 (Overlay):** Modals use a slightly more defined shadow and a soft backdrop blur (4px) to focus user attention.

Avoid using shadows on buttons; use color shifts and borders to indicate state instead.

## Shapes

The shape language is defined by **Medium Roundedness**. This softens the "industrial" feel of procurement software while maintaining a professional structure.

- **Components (Buttons, Inputs):** 0.5rem (8px).
- **Large Containers (Cards, Modals):** 1rem (16px).
- **Small Elements (Tags, Badges):** 0.25rem (4px) or fully pill-shaped depending on the context of the data.

Consistent corner radii across all elements are essential to reinforce the "systematic" nature of the platform.

## Components

### Buttons

- **Primary:** Solid `#087F8C` with white text. 8px radius.
- **Secondary:** Ghost style with `#087F8C` border and text.
- **Tertiary:** Text-only for low-emphasis actions like "Cancel".

### Input Fields

- Use a 1px solid border (#E2E8F0).
- On focus, the border changes to `#087F8C` with a soft 2px outer glow of `#EAF8F9`.
- Labels should always be visible above the input, never just as placeholders.

### Data Tables (Crucial for SISD)

- Use `body-sm` for table cells to maximize information density.
- Row hover state should use the Secondary Accent color (#EAF8F9).
- Borders should be horizontal-only to emphasize the flow of data.

### Progress Indicators (Status Steppers)

- Use for procurement stages.
- Completed stages: Primary color icon.
- Active stage: Primary color text with bold weight.
- Pending stages: Neutral gray text.

### Cards

- Use for dashboard metrics.
- Keep them flat with 1px borders. Use `headline-sm` for metric values to make them prominent.
