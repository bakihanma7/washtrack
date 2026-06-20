---
name: Luminous Care
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a46'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6b7a76'
  outline-variant: '#bacac5'
  surface-tint: '#006b5f'
  primary: '#006b5f'
  on-primary: '#ffffff'
  primary-container: '#2dd4bf'
  on-primary-container: '#00574d'
  inverse-primary: '#3cddc7'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#55615a'
  on-tertiary: '#ffffff'
  tertiary-container: '#b4c1b9'
  on-tertiary-container: '#444f49'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#62fae3'
  primary-fixed-dim: '#3cddc7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#d9e6dd'
  tertiary-fixed-dim: '#bdcac1'
  on-tertiary-fixed: '#131e19'
  on-tertiary-fixed-variant: '#3e4943'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  stat-value:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 2rem
  card-gap: 1.5rem
  section-margin: 2.5rem
  inner-padding: 1.25rem
  gutter-md: 1rem
---

## Brand & Style

This design system establishes a high-end, professional atmosphere for automotive care management. It bridges the gap between industrial utility and premium service by employing a **Modern Minimalist** aesthetic. The goal is to evoke a sense of cleanliness, transparency, and effortless precision—mimicking the feeling of a vehicle after a showroom-quality detail.

The visual narrative focuses on "clarity through whitespace." By utilizing soft gradients and a light-drenched interface, the complexity of managing car wash operations and maintenance schedules is distilled into a calm, approachable experience. It moves away from the dark, heavy "grease-monkey" stereotypes of the industry, opting instead for an "executive-clean" look that builds trust with high-value clientele.

## Colors

The palette is anchored in a refreshing **Mint Teal** and **Sky Blue**, symbolizing water, freshness, and technological precision. 

- **Primary (Mint Teal):** Used for growth indicators, successful statuses, and primary action highlights.
- **Secondary (Sky Blue):** Used for maintenance-specific categories and informative data visualizations.
- **Surface & Backgrounds:** We use a tiered system of off-whites and extremely pale grays to create soft separation without harsh lines. 
- **Accent Gradients:** Subtle linear gradients (Teal to Blue) are reserved for premium call-outs and "Pro" features, adding depth to the flat surface.
- **Semantic Colors:** Soft reds and ambers are used sparingly for alerts and inventory warnings, maintaining a low-stress environment.

## Typography

The typography system balances the technical nature of maintenance with a friendly, service-oriented tone. **Hanken Grotesk** is used for headlines and high-impact data points to provide a sharp, contemporary edge. **Plus Jakarta Sans** handles body copy and labels, offering excellent legibility with its soft, open apertures.

Large numerical values (Revenue, Service Counts) should use the `stat-value` style to ensure they are the primary focal point of dashboard cards. Letter spacing is slightly tightened for headlines to maintain a compact, professional appearance.

## Layout & Spacing

The layout follows a **structured fluid grid** with a focus on modular card-based dashboards. 

- **Desktop:** A sidebar-oriented navigation is swapped for a top-centered "pill" navigation to maximize horizontal space for data widgets. Content is grouped into logical clusters (Revenue, Services, Inventory) using a 12-column grid.
- **Tablet:** Containers reflow to a 2-column stacked layout. Margins reduce to 1.5rem.
- **Mobile:** Single column layout with 1rem safe-area margins.

The spacing rhythm is generous, allowing each data point "room to breathe." This prevents the dashboard from feeling overwhelming, even when displaying high-density information like service distribution charts or inventory alerts.

## Elevation & Depth

Depth is established through **Tonal Layering** rather than traditional shadows. Surfaces use light color shifts and soft, semi-transparent borders to indicate hierarchy.

1.  **Canvas:** The base background is a very light, cool grey (#F8FAFC).
2.  **Cards:** Primary containers are pure white with a 1px border (#F1F5F9).
3.  **Raised Elements:** Modals and active dropdowns utilize a "Long-Soft" shadow (0px 20px 40px rgba(0,0,0, 0.04)) to appear as if floating just above the surface.
4.  **Glass Effects:** The top navigation bar uses a subtle backdrop blur (12px) with a semi-transparent white fill (80% opacity) to provide context of the content scrolling beneath it.

## Shapes

The shape language is consistently **Rounded**, reinforcing the approachable and high-end brand personality. 

- **Cards:** Use `rounded-lg` (1rem) to create a soft, modern container feel.
- **Buttons & Inputs:** Use `rounded-md` (0.5rem) for a standard, clickable appearance.
- **Navigation & Badges:** Use "Pill" styling (full radius) for status indicators and the main navigation hub.
- **Graphs:** Bar charts and progress bars must have rounded caps to match the UI's geometry. Avoid sharp 90-degree corners in all illustrative or functional elements.

## Components

### Cards & Widgets
Dashboard widgets should be treated as white "vessels." Each card includes a subtle 1px border and a localized header. Use icon-background pairings (e.g., a teal icon on a pale teal circular background) to categorize different data types at a glance.

### Buttons
- **Primary:** Gradient fill (Teal to Blue) with white text. High-end, "action-oriented" feel.
- **Secondary:** Transparent background with a 1px teal border and teal text.
- **Icon Buttons:** Circular or softly squared with no background, using the `neutral-color` for the icon.

### Data Inputs
Input fields should use a light grey background (#F1F5F9) instead of a white background to clearly distinguish them from the white card surfaces. Focus states are indicated by a 2px teal border.

### Status Chips
Use the pill shape for status tags (e.g., "In Progress," "Completed"). These should use the secondary color palette with low-opacity fills and high-saturation text to maintain readability without adding visual noise.

### Charts
Line and area charts should utilize "smooth" curves (splines) rather than jagged lines. Gradients should be used under line charts to connect the data to the bottom axis visually, using the primary/secondary theme colors.