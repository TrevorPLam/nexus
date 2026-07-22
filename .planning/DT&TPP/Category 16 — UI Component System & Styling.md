<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 16 — UI Component System \& Styling

**Recommendation: use Tamagui as the shared design-token and primitive-component
system across Next.js and Expo, but keep platform-specific composite components
in `apps/web` and `apps/mobile`.** Use Tamagui’s tokens, themes,
responsive/media utilities, and accessible primitives for shared foundations;
use web-native CSS/DOM components where web interaction demands them and React
Native-native components where mobile behavior demands them.[^1][^2][^3]

This is the best trade-off for Life OS: it creates a coherent visual system
across web and mobile without forcing identical rendered components for
fundamentally different interfaces such as calendar grids, rich-text editors,
desktop tables, drag-and-drop planning, native sheets, and mobile gestures.

## Core Decision

```text
Shared design system:          Tamagui
Shared styling primitives:     Tamagui core + selected Tamagui UI primitives
Design tokens:                 One versioned token configuration
Themes:                        Light and dark themes from day one
Web application styling:       Tamagui + CSS Modules/CSS where DOM-specific behavior is needed
Mobile application styling:    Tamagui + React Native/Expo-native components where required
Component sharing rule:        Share tokens, icons, behavior, and primitives;
                               do not force all rendered composites to be universal
Form validation:               React Hook Form + Zod
Icons:                         One cross-platform icon set, wrapped in packages/ui
Class utility styling:         Do not adopt NativeWind as the primary system
Full component suite:          Do not adopt a broad Material/Ant-style suite as the design authority
```

Tamagui is a React/React Native styling system with a typed superset of React
Native styles and support for themes, tokens, and responsive media
configuration.[^2][^3][^4]

## Requirements

The UI system must provide:

- Consistent visual language across Next.js and Expo.
- Fast construction of the authenticated product surface.
- Custom product UI rather than an obviously generic dashboard template.
- Design tokens for color, typography, spacing, radii, shadows, motion, and
  semantic status.
- Light/dark/system theme support.
- Responsive desktop web layouts and adaptive native mobile layouts.
- Accessible, keyboard-friendly web interactions and accessible native controls.
- A sustainable component ownership model.
- A practical way to build dense planning/calendar/task interfaces.
- Protection against accidental exposure of sensitive content in loading, error,
  analytics, and screenshot surfaces.

## UI System Options

| Option                                              | Advantages                                                                                                                                                                               | Disadvantages                                                                                                                                                                                                                                                | Decision                                                     |
| :-------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **Tamagui shared primitives + platform composites** | Unified tokens/themes; React Native and web support; typed styling; optimizing compiler; active development (v2.4.5, July 2026); SSR-first atomic CSS; strong Next.js + Expo integration | Setup/compiler configuration; universal abstractions can become restrictive for advanced platform UI                                                                                                                                                         | **Select**                                                   |
| NativeWind + Tailwind CSS                           | Familiar utility-first workflow; works with Expo and React Native; v5 preview with Tailwind v4; fast for simple screens                                                                  | **Critical: NativeWind v5 does NOT support Next.js** (gluestack-ui v5 dropped Next.js support for this reason); Class-heavy component markup; less ideal as a design-system source; web/mobile abstraction leaks; Tailwind configuration becomes another API | Reject as primary                                            |
| gluestack-ui v5                                     | Universal components; accessible; NativeWind v5 integration; good mobile DX                                                                                                              | **Dropped Next.js support in v5 (July 2026)**; now React Native/Expo only; copy-paste model; smaller component coverage (~30)                                                                                                                                | Reject for cross-platform needs                              |
| React Native Paper + separate web system            | Mature mobile component library; Material Design 3 support (v6 alpha); strong theming                                                                                                    | Material-first visual language; no strong Next.js/web unification; separate design systems emerge; MD3 aesthetic may not fit calm Life OS design                                                                                                             | Reject                                                       |
| shadcn/ui on web + custom RN mobile                 | Excellent web ecosystem; 80% satisfaction (State of React 2024); defaults to Base UI; copy-paste ownership; supports React Aria base                                                     | **Web-only, no React Native support**; two independently implemented systems; token drift and duplicate behavioral work                                                                                                                                      | Consider only for web-specific components                    |
| otf-kit (universal)                                 | True cross-platform parity (198 web + 80 native components); Tamagui-powered native + Radix web; 17 pre-built themes; npm distribution; full-stack kits available                        | Commercial kits ($99); newer ecosystem; less battle-tested than Tamagui alone                                                                                                                                                                                | Consider as alternative if broader component coverage needed |
| MUI on web + React Native Paper mobile              | Large component libraries; Material UI Next.js integration (@mui/material-nextjs); comprehensive documentation                                                                           | Heavy, generic Material aesthetic; two systems, bundle/override complexity; Material Design may not fit Life OS calm aesthetic                                                                                                                               | Reject                                                       |
| Chakra UI on web + separate mobile styling          | Accessible web primitives; Ark UI foundation; good DX; React Server Components support                                                                                                   | No native parity; still requires a second system; web-only                                                                                                                                                                                                   | Reject                                                       |
| React Aria Components (web headless)                | Best-in-class accessibility; Adobe-tested across devices; style-free; works with any styling solution                                                                                    | Web-only; no React Native support; requires significant styling work                                                                                                                                                                                         | Consider for advanced web accessibility patterns             |
| MUI Base UI (web headless)                          | Unstyled components; from creators of Radix/Floating UI; 35 accessible components; strong MUI backing                                                                                    | Web-only; no React Native support; newer (v1.0, Feb 2026)                                                                                                                                                                                                    | Consider for web headless needs                              |
| Kuma UI (web)                                       | Zero-runtime CSS; hybrid approach; RSC support; headless components                                                                                                                      | Web-only; no React Native support; smaller ecosystem; requires React 19 for v2 features                                                                                                                                                                      | Reject for cross-platform needs                              |
| Plain React Native `StyleSheet` + CSS Modules       | Maximum control and minimal dependency                                                                                                                                                   | Higher duplication and slower token/component consistency work                                                                                                                                                                                               | Fallback only if Tamagui evaluation fails                    |
| Custom design system from scratch                   | Full product control                                                                                                                                                                     | Slowest path; requires building primitives, theming, accessibility patterns, documentation, and tooling                                                                                                                                                      | Reject for MVP                                               |

**Critical 2026 Update:** NativeWind v5 (preview) and gluestack-ui v5 have
dropped Next.js support, making them unsuitable as primary systems for Life OS
which requires both Next.js (web) and Expo (mobile) from a unified design
system. This reinforces Tamagui as the best cross-platform choice.

## Why Tamagui Wins

### Shared foundation, not forced sameness

Tamagui is specifically designed for React and React Native and can optimize its
output differently for web and native. That maps well to the product’s actual
needs:[^6]

```text
Shared:
  Colors, typography, spacing, semantic states, iconography, button logic,
  form-field logic, card/list primitives, theme behavior, empty/error states

Web-specific:
  Command palette, desktop data tables, keyboard shortcuts, drag/drop,
  calendar grid, hover tooltips, complex popovers, rich-text editor,
  full keyboard navigation, dense dashboard layouts

Mobile-specific:
  Native tabs, sheets, haptics, swipe actions, safe areas, keyboard avoidance,
  gesture interactions, platform pickers, dynamic type behavior
```

The goal is not 100 percent component reuse. The goal is **one product
language** with appropriate platform implementations.

### Token-first design

The product will contain many semantically meaningful states:

```text
Default action
Destructive action
Success/completed
Warning/at-risk
Overdue
Conflict
Pending sync
Sync failed
Offline/stale
Calendar busy
Focus block
Sensitive/private
```

These should not be hard-coded colors scattered through components. Tamagui
supports a central configuration for tokens, themes, and media queries. Build
semantic tokens over raw palette values so the product can change visual
identity or meet accessibility requirements without rewriting every screen.[^4]

### Next.js and Expo viability

Tamagui provides a Next.js integration path, including server-side styling
behavior and generated theme/token CSS. It also supports current React Native
styling capabilities and provides Expo/Next integration guidance.[^7][^1]

The implementation must validate the actual selected Expo SDK, React Native
version, and Next.js version together in the monorepo before broad adoption.
This is a bounded setup risk and materially smaller than maintaining independent
visual systems.

## Design System Architecture

### Package boundaries

```text
packages/ui/
├── src/
│   ├── config/
│   │   ├── tokens.ts
│   │   ├── themes.ts
│   │   ├── fonts.ts
│   │   ├── media.ts
│   │   └── tamagui.config.ts
│   ├── primitives/
│   │   ├── button.tsx
│   │   ├── icon-button.tsx
│   │   ├── text.tsx
│   │   ├── heading.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── field.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── divider.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-state.tsx
│   │   ├── error-state.tsx
│   │   └── status-indicator.tsx
│   ├── patterns/
│   │   ├── task-row.tsx
│   │   ├── task-status.tsx
│   │   ├── schedule-summary.tsx
│   │   ├── sync-status.tsx
│   │   └── entity-chip.tsx
│   ├── icons/
│   ├── hooks/
│   └── index.ts
├── package.json
└── tamagui.config.ts
```

Platform-specific packages or application directories own complex composites:

```text
apps/web/src/components/
  calendar-grid/
  command-menu/
  task-table/
  desktop-planner/
  rich-text-editor/
  data-table/

apps/mobile/src/components/
  task-swipe-row/
  mobile-calendar-agenda/
  bottom-sheet/
  quick-capture/
  haptic-controls/
  native-date-time-picker/
```

Do not export `apps/web` DOM-dependent components through `packages/ui`, and do
not force Expo to compile browser-only dependencies.

## Token Model

### Raw tokens

Raw tokens establish the design foundation:

```text
Color palette:
  neutral, blue, indigo, violet, green, amber, red

Spacing:
  0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24

Typography:
  display, heading, body, label, caption, mono

Radii:
  none, xs, sm, md, lg, xl, full

Elevation:
  none, low, raised, overlay

Motion:
  instant, fast, normal, slow
```

### Semantic tokens

Components should use semantic meaning, not raw hue names:

```text
background.canvas
background.surface
background.elevated
background.subtle

text.primary
text.secondary
text.muted
text.inverse
text.danger

border.default
border.strong
border.focus

action.primary
action.primaryPressed
action.secondary
action.destructive
action.disabled

status.success
status.warning
status.danger
status.info
status.pending
status.offline
status.conflict

calendar.busy
calendar.focusBlock
calendar.external
calendar.available
```

This enables theme changes and keeps “overdue” or “sync failed” meaningful
across light/dark modes without every screen choosing a new red/orange variant.

## Theme Policy

### Ship light, dark, and system mode

Support three settings:

```text
System default
Light
Dark
```

Persist the user’s preference locally and, when product settings synchronization
exists, to the user profile so web and mobile can converge. Do not automatically
sync theme preference if a user explicitly wants different themes per device;
provide a policy decision later if needed.

### Theme requirements

- Meet WCAG AA contrast for normal text, controls, focus indicators, error
  states, and disabled states.
- Do not use pure black/white by default if it creates glare or harsh contrast;
  use tested near-neutral surfaces.
- Do not use color as the only signal for overdue, completed, conflict, or
  pending sync status.
- Every status color needs a label, icon, or pattern where the state matters.
- Test themes on web, iOS, and Android rather than assuming a token works
  identically in each renderer.
- Avoid visual theme changes that make a task look completed, deleted, or
  pending when only its visual emphasis changed.

React Native Paper supports theming and system light/dark behavior, but
selecting it would impose a separate mobile-first component system rather than
the shared token foundation needed here.[^8]

## Typography

### Recommendation

Use a neutral, readable sans-serif product typeface with a compatible monospace
face for dates, time ranges, keyboard shortcuts, and code-like import/export
details.

Initial policy:

```text
UI/body:         Inter or another fully licensed, readable variable sans-serif
Headings:        Same family initially; use scale/weight/spacing instead of a novelty display font
Monospace:       JetBrains Mono or system mono fallback
Numerals/time:   Tabular figures where schedule alignment matters
```

Use platform fallback stacks and avoid downloading multiple font weights
unnecessarily:

```text
Web:
  next/font or self-hosted font delivery

Mobile:
  Bundled Expo fonts with only approved required weights
```

Do not use a decorative productivity-app aesthetic as a substitute for
information hierarchy. Life OS needs dense but calm planning screens where
timestamps, durations, urgency, labels, and task titles remain legible.

## Core Primitive Set

Build and document the following before feature-specific visual complexity
grows:

| Primitive                   | Required behavior                                                                           |
| :-------------------------- | :------------------------------------------------------------------------------------------ |
| `Button`                    | Variants, loading/pending, disabled, destructive confirmation affordance, accessible label  |
| `IconButton`                | Required accessible name, hit target, pressed state, tooltip on web where needed            |
| `Text` / `Heading`          | Semantic hierarchy, responsive scale, selectable text policy                                |
| `TextField` / `TextArea`    | Label, description, error, required state, keyboard/input mode, disabled/read-only behavior |
| `Select` / `Combobox`       | Accessible web keyboard behavior; native-appropriate picker/sheet implementation            |
| `Checkbox` / `Switch`       | Clear state, label, error, platform interaction semantics                                   |
| `Card` / `Surface`          | Tokenized elevation/background; not used as decorative nesting everywhere                   |
| `Badge` / `StatusIndicator` | Text/icon paired with status color                                                          |
| `Dialog` / `Sheet`          | Focus trap and escape on web; appropriate native modal/sheet behavior                       |
| `Toast`                     | Noncritical feedback only; never sole presentation for destructive/sync failure             |
| `EmptyState`                | Clear explanation, recovery action, no leakage of private data                              |
| `ErrorState`                | Safe message, retry, request/support ID where appropriate                                   |
| `Skeleton`                  | Shape-based loading without implying nonexistent or private content                         |
| `Avatar`                    | Accessible fallback initials and safe image behavior                                        |
| `ListRow`                   | Pressable/focus/disabled states, high-density and comfortable variants                      |

Do not build a generic component merely because a library includes it. Build a
wrapper only when it establishes product tokens, accessibility behavior, or a
stable API that multiple product screens need.

## Product Patterns

Establish consistent patterns early:

```text
Task row:
  completion state, title, scheduling context, project/area, due state,
  sync state, accessible action menu

Task detail:
  title, status, schedule, notes, linked entities, audit/sync state,
  destructive actions behind confirmation

Calendar block:
  source distinction, time range, conflict state, privacy-safe title behavior

Sync status:
  local/pending/synced/failed/offline states with an actionable path

Empty workspace:
  no data yet versus offline/failed-to-load versus access revoked

Destructive confirmation:
  explicit consequence, undo where technically safe, no vague “Are you sure?”

Sensitive content:
  hidden by default in notifications/logging/preview contexts where appropriate
```

Use shared patterns for semantic consistency, but allow each platform to render
them differently. For example, a web `TaskRow` may support hover actions and
keyboard shortcuts; a mobile version may support a swipe action and haptic
confirmation.

## NativeWind Assessment

NativeWind enables Tailwind-style classes in Expo/React Native and works with
Expo through Tailwind, Babel, Metro, and CSS configuration. It is a reasonable
option for teams already deeply invested in Tailwind.[^5]

**Critical 2026 Update:** NativeWind v5 (preview) adopts Tailwind CSS v4's new
CSS-first configuration system. However, **NativeWind v5 does not support
Next.js**. This is a breaking change from v4.1, which had limited Next.js
support through Metro bundling. The gluestack-ui v5 release (July 2026)
explicitly dropped Next.js support for this reason, shifting to React
Native/Expo-only focus.

For Life OS, which requires unified design tokens across both Next.js (web) and
Expo (mobile), this makes NativeWind unsuitable as a primary styling system
in 2026.

| NativeWind strength               | Why it is not selected (2026)                                                                                          |
| :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| Fast utility-first implementation | Life OS needs reusable semantic task/calendar/sync primitives more than one-off layout speed                           |
| Familiarity for web developers    | The project already has distinct Next.js and Expo needs, so literal styling syntax reuse is not the primary constraint |
| Works with Expo                   | **v5 does NOT support Next.js** - creates platform split in design system                                              |
| Tailwind v4 integration           | v5's CSS-first approach is promising but web-only limitation is fatal for cross-platform needs                         |
| Build-time style compilation      | Tamagui's compiler provides similar benefits with true cross-platform parity                                           |

**Policy:** do not use NativeWind and Tamagui together as competing primary
styling systems. That would create duplicate tokens, uncertain component
conventions, and difficult code review. Additionally, NativeWind v5's lack of
Next.js support makes it incompatible with Life OS's cross-platform
architecture.

## Component Library Policy

### Use Tamagui’s UI kit selectively

Tamagui supplies optional UI components in addition to its core styling system.
Use them when they satisfy product requirements without fighting the intended
interaction model:[^6]

```text
Likely acceptable:
  Buttons, text, inputs, labels, cards, separators, stacks, themes,
  simple popovers/dialogs, basic list surfaces

Evaluate carefully:
  Menus, selects, sheets, tabs, tooltips, form controls

Prefer platform-specific implementation:
  Desktop command palette, virtualized task table, calendar timeline,
  rich text editor, drag/drop planner, native date/time controls,
  mobile swipe rows, mobile keyboard-sensitive sheets
```

Do not add a second visual library simply to obtain a single advanced component.
Evaluate a focused, accessible dependency for that component, wrap it behind a
product-owned interface, and document the decision.

### Web headless primitives

If the web app requires advanced accessibility patterns that Tamagui’s selected
primitive does not cover sufficiently, use Radix-based or equivalent headless
primitives **inside web-only components**. This is acceptable for cases such as
robust accessible comboboxes, menus, tooltips, dialogs, and complex popovers.

Keep these dependencies out of the mobile bundle and do not expose raw
third-party component APIs across `packages/ui`.

## Layout System

### Web

Use responsive layouts designed for desktop first, then adapt down:

```text
Wide desktop:
  Persistent sidebar, main planning surface, optional contextual inspector

Laptop:
  Collapsible sidebar, one main surface, contextual panel as overlay

Tablet web:
  Reduced density, drawer navigation, calendar/list mode switch

Mobile web:
  Functional but not treated as the substitute for native mobile app
```

The authenticated product should use CSS Grid for page-level layout and Flexbox
for component-level alignment. Do not recreate a desktop three-column planner
through deeply nested generic stack components if CSS Grid expresses the layout
more clearly.

### Mobile

Use native-safe layout practices:

```text
Safe-area-aware root surfaces
Minimum 44-by-44-point touch targets where applicable
Dynamic type support
Keyboard avoidance
FlatList/FlashList-style virtualization for long task/note lists
Modal/sheet layouts that respect platform gestures and insets
```

Tamagui can provide spacing/typography primitives, but native list
virtualization and gesture performance require mobile-specific implementation
choices.

## Forms

Use:

```text
React Hook Form
+ Zod schemas from packages/contracts or domain-level form schemas
+ product Field / FieldMessage primitives
```

Rules:

- Validate both on change/blur where helpful and always on submit.
- Never rely on client validation as the security boundary; Hono validates
  again.
- Associate labels, descriptions, and errors programmatically.
- Focus/scroll to the first error after submit in web contexts.
- Use native keyboard/input configuration for mobile: email, URL, numeric,
  multiline, date/time as appropriate.
- Preserve user-entered form data on transient network errors.
- For commands queued offline, clearly distinguish “saved locally/pending sync”
  from “accepted by server.”

## Motion and Feedback

Use motion to explain state transitions, not as decoration:

| Interaction         | Guidance                                                               |
| :------------------ | :--------------------------------------------------------------------- |
| Task completion     | Brief visual transition plus optional light haptic on mobile           |
| Drag/reorder        | Immediate positional feedback; reduced-motion alternative              |
| Modal/sheet         | Platform-appropriate transition, dismissible only when safe            |
| Sync/pending        | Small status change; no endless distracting animation                  |
| Error               | Clear message and focus/announcement; avoid shake-only feedback        |
| Calendar scheduling | Animate preview/change only if it improves time-position comprehension |

Respect `prefers-reduced-motion` on web and native reduced-motion settings.
Avoid celebratory animation for every completed task; it becomes distracting in
a high-frequency productivity workflow.

## Accessibility Requirements

### Non-negotiable baseline

- Keyboard navigation and visible focus for all web controls.
- Semantic headings, landmarks, buttons, form controls, lists, dialogs, and
  tables.
- Correct screen-reader labels for icon-only controls.
- Focus trapping and restoration for web dialogs/sheets.
- Minimum contrast and non-color status indicators.
- Dynamic Type and screen-reader support on mobile.
- Minimum touch targets on mobile.
- No hover-only required action.
- No drag-and-drop-only operation; provide keyboard and menu alternatives.
- Clear pending, offline, failed, and completed state text.
- Test critical workflows with VoiceOver, TalkBack, and a desktop screen reader
  before public beta.

Accessibility is particularly important because Life OS is a daily-use tool; a
task completion, date/time change, or destructive action must be unambiguous
under keyboard, screen reader, reduced-motion, and text-scaling conditions.

## Visual Testing and Governance

### Storybook strategy

Use Storybook or an equivalent component playground for `packages/ui` and web
component visual review. It should render:

```text
Light and dark themes
Default, hover, focus, pressed, disabled, loading states
Long text and localization stress cases
Error, empty, pending, offline, and conflict states
Large text / zoom
Web viewport variants
Mobile component screenshots where supported
```

Run visual regression tests only for high-value primitives and patterns
initially:

- Button, Field, Dialog/Sheet, TaskRow, TaskStatus, CalendarBlock, SyncStatus,
  empty/error states.
- Today main layout, task detail, quick capture, settings/integration page.
- Both light and dark themes.

Do not use screenshot tests as a substitute for interaction, accessibility, RLS,
or offline-sync testing.

### Ownership rules

- Every shared primitive has a named owner and documented intended use.
- A new token needs a semantic justification; do not add `blue500Alternative2`.
- A new component requires at least two intended use sites or a documented
  platform need.
- Raw hex values, unbounded inline style objects, and arbitrary z-index values
  are lint/code-review concerns.
- Feature teams cannot silently fork `Button`, `Field`, or `TaskRow`; extend or
  propose a variant.
- Avoid global CSS outside base reset, fonts, and explicitly web-global tokens.

## Trade-Offs

| Choice                                       | Gain                                                           | Cost                                                                 |
| :------------------------------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------- |
| Tamagui shared system                        | Unified tokens/themes and reusable primitives across Expo/Next | Configuration and universal-component constraints require discipline |
| Platform-specific composites                 | Better native and web UX                                       | Some rendering-code duplication                                      |
| Semantic tokens                              | Accessible, maintainable states and easy theming               | Initial design/token work                                            |
| Tamagui selectively, not full kit everywhere | Product-specific visual identity                               | More custom component work                                           |
| No NativeWind primary system                 | One coherent styling authority                                 | Gives up Tailwind utility familiarity/speed                          |
| Separate Next.js and Expo UI adaptations     | Proper desktop/mobile patterns                                 | Lower literal screen-code reuse                                      |
| Storybook/visual governance                  | Stable design language and fewer regressions                   | Setup and maintenance time                                           |

## Final Decision

Lock the following UI and styling architecture:

```text
Design-system foundation:      Tamagui
Shared package:                packages/ui
Shared assets:                 Tokens, themes, fonts, icons, primitives, semantic patterns
Theme support:                 System, light, and dark from initial implementation
Web styling:                   Tamagui plus web-only CSS/DOM tooling for advanced interfaces
Mobile styling:                Tamagui plus native React Native/Expo implementations where required
Component-sharing policy:      Share foundations and simple primitives; do not force complex composites universal
Forms:                         React Hook Form + Zod + accessible field primitives
Icons:                         One wrapped cross-platform icon system
NativeWind:                    Rejected as primary styling system
Material/component suites:     Rejected as visual authority; use focused primitives only when justified
Accessibility:                 Keyboard/screen-reader/dynamic-type/reduced-motion support is required, not deferred
Quality control:               Component playground plus targeted visual regression testing
```

The next category in dependency order is **State Management \& Client Data
Architecture**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^9]</span>

<div align="center">⁂</div>

[^1]: https://tamagui.dev/docs/guides/next-js

[^2]: https://tamagui.dev/

[^3]: https://tamagui.dev/docs/intro/styles

[^4]: https://tamagui.dev/docs/core/configuration

[^5]: https://www.nativewind.dev/docs/getting-started/installation

[^6]: https://github.com/tamagui/tamagui

[^7]: https://tamagui.dev/docs/intro/installation

[^8]: http://oss.callstack.com/react-native-paper/docs/guides/theming/

[^9]:
    https://medium.com/@bargadyahmed/use-tailwindcss-within-expo-react-native-mobile-applications-abf19118eb19

[^10]: https://github.com/expo/examples/blob/master/with-nativewind/README.md

[^11]:
    https://dev.to/y3asin/react-native-expo-with-nativewind-v4-and-typescript-38j3

[^12]: https://www.nativewind.dev/v2/quick-starts/expo

[^13]: https://gist.github.com/Janak-Nirmal/da459756e76b32390ed647faad753898

[^14]: https://madewithreactjs.com/tamagui

[^15]:
    https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-tailwind-setup/SKILL.md
