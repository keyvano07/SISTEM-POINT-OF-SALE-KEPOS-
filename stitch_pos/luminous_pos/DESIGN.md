---
name: Luminous POS
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#525657'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b6e70'
  on-tertiary-container: '#eff1f3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  price-display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is built for high-end retail and hospitality environments that demand a tool as refined as their physical space. The brand personality is **composed, efficient, and premium**. It rejects the cluttered, high-contrast aesthetic of traditional point-of-sale systems in favor of a **Modern Minimalist** approach with a tactile, layered depth.

The UI should evoke a sense of calm under pressure. By utilizing a "Soft-Ui" philosophy—mixing clean lines with diffused depth—the system reduces cognitive load for operators. The aesthetic moves away from harsh digital borders toward organic layering, making the interface feel like a physical, high-quality object rather than a flat screen.

## Colors

The palette is anchored in a sophisticated range of "Atmospheric Neutrals." 

- **Primary (Soft Blue):** Used sparingly for primary actions and active states. It provides a clear signal of intent without overwhelming the minimalist aesthetic.
- **Secondary (Muted Slate):** Used for supporting information, secondary icons, and less prominent interactive elements.
- **Backgrounds (Whites & Off-whites):** We use a tiered white system (#FFFFFF for elevated cards, #F8FAFC for the base canvas) to create natural separation.
- **Typography & Accents (Charcoal/Black):** Deep neutrals ensure high legibility and a grounded, professional feel.

## Typography

This design system utilizes **Inter** exclusively to leverage its systematic, utilitarian, and highly legible characteristics. 

The type hierarchy prioritizes clarity in fast-paced environments. Large numeric displays (prices) use tighter letter-spacing and heavier weights to ensure they are the first thing an operator sees. Labels and secondary metadata use increased letter-spacing and uppercase styling to distinguish themselves from actionable body text.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The sidebar (Cart/Transaction) remains at a fixed width (e.g., 400px) to provide a stable anchor for the most critical information, while the product catalog utilizes a fluid grid that expands to fill the available screen real estate.

Spacing follows an 8px rhythmic scale. Generous internal padding within cards and containers is mandatory to maintain the minimalist, premium feel. 

**Breakpoints:**
- **Desktop (1440px+):** 12-column grid, 32px margins.
- **Tablet (768px - 1439px):** 8-column grid, 24px margins. Sidebar may become a collapsible drawer or a bottom sheet.
- **Mobile (<767px):** 4-column grid, 16px margins. Focus is placed on single-task views (e.g., just the cart or just the catalog).

## Elevation & Depth

This design system uses **Ambient Shadows** and **Tonal Layering** to create a sense of hierarchy. Surfaces do not rely on borders to define their edges; instead, they use varying levels of elevation:

- **Level 0 (Canvas):** The base background layer (#F8FAFC).
- **Level 1 (Sub-Containers):** Slightly recessed or flat with a subtle 1px stroke (#F1F5F9).
- **Level 2 (Active Cards):** White background (#FFFFFF) with a soft, diffused shadow (0px 4px 20px rgba(15, 23, 42, 0.05)).
- **Level 3 (Modals/Popovers):** Prominent white background with a deep, dramatic shadow (0px 20px 50px rgba(15, 23, 42, 0.1)).

Interaction is conveyed through elevation shifts. When a user taps a product card, it should visually "sink" or "lift" slightly through shadow modification, reinforcing the tactile nature of the UI.

## Shapes

The shape language is **Rounded**, using a 0.5rem (8px) base radius. This softens the interface, making it feel approachable and modern. Larger components like main container cards or primary action buttons should use the `rounded-xl` (24px) setting to emphasize their importance and create a "friendly-tech" aesthetic. 

Form inputs and small chips maintain the 8px base to ensure they remain structured and professional without feeling "bubbly."

## Components

- **Buttons:** Primary buttons use a solid slate or primary blue fill with white text. Secondary buttons are "Ghost" style—using a subtle light gray background fill rather than a border.
- **Product Cards:** These are the centerpiece. Use a white background, no border, and Level 2 elevation. Images should be slightly desaturated to fit the minimalist palette until hovered or selected.
- **Transaction List:** Use subtle horizontal dividers (1px, #F1F5F9) instead of boxes for each item. Active items are highlighted with a vertical 4px "Soft Blue" bar on the left edge.
- **Input Fields:** Fields should be "filled" style with a very light gray background (#F1F5F9) and no border, becoming white with a soft shadow when focused.
- **Chips/Status Tags:** Use a semi-transparent version of the state color (e.g., soft blue background with deep blue text) for a "glass" effect that doesn't break the minimalist flow.
- **Keypad:** The POS keypad uses large, circular or highly rounded buttons with generous spacing to prevent miss-taps, utilizing Level 1 elevation as the default state.