<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 15 — Mobile Application Framework \& Navigation

**Recommendation: select Expo managed workflow with React Native, Expo Router, and EAS Development Builds. Use Expo Router as the sole navigation layer, with a native tab shell for primary destinations, nested stacks for detail flows, and modal routes for creation and focused actions.** Expo Router gives the app file-based routing plus universal deep linking, while still using React Navigation primitives underneath.[^1][^2][^3]

The mobile app is the primary offline-first product surface. It should therefore optimize for reliable native behavior, PowerSync/SQLite integration, secure authentication, deep links, notifications, and predictable navigation—not maximum web/mobile screen-code sharing.

## Requirements

The mobile framework must support:

- iOS and Android from one TypeScript codebase.
- Expo-compatible PowerSync/SQLite, Clerk, secure storage, notifications, calendar authorization, and native development tooling.
- A clean offline-first Today experience.
- Deep links for Clerk auth redirects, Google OAuth completion, notification taps, account recovery, and future shared links.
- EAS development, preview, and production builds.
- Native navigation patterns: tabs, stack flows, modals, and system back behavior.
- Accessibility, performance, and a low-friction release workflow.

Expo Router is a file-based router for React Native and web applications, and it defines every screen through files in the route directory.[^2][^1]

## Framework Options (2026 Update)

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Expo managed workflow + Expo Router** | Fastest cross-platform path for TS teams; EAS builds/updates; strong Expo ecosystem; file-based routing; deep links built in; excellent PowerSync integration; New Architecture (Fabric/TurboModules) eliminates old bridge performance issues; largest talent pool | Some native configuration still requires development builds; Expo SDK upgrade cadence must be managed; slightly larger bundle size than Flutter | **Select** |
| Expo managed workflow + React Navigation directly | Mature navigation ecosystem and maximum navigation configuration control | More boilerplate; manual deep-link configuration; loses Expo Router's route/file conventions | Reject |
| Flutter 4.x (Impeller 2.0) | Pixel-perfect UI consistency; excellent animation performance (60-120 FPS); smaller performance gap with RN New Architecture; strong desktop support; ~46% cross-platform market share | Requires Dart (smaller talent pool than JS); no reuse of React/TypeScript ecosystem; separate hiring pipeline; larger bundle size (~17MB vs ~13MB RN); PowerSync integration less mature than RN | Reject |
| Kotlin Multiplatform 2.0 + Compose Multiplatform | Native performance with zero bridge overhead; excellent for sharing business logic; stable iOS support (May 2025); fastest cold-start times; best for Android teams | Requires macOS for iOS builds (higher CI costs); Kotlin talent pool smaller than JS; Compose Multiplatform on iOS still maturing for complex UI; ecosystem smaller than RN/Flutter | Reject for MVP |
| Tauri 2 Mobile | Extremely small bundles (2-15MB); Rust backend security; system WebView; good for desktop+mobile from one codebase | Mobile ecosystem still maturing; WebView rendering inconsistencies; Rust learning curve; plugin ecosystem smaller than RN/Flutter; not optimized for gesture-heavy offline apps | Reject |
| Bare React Native + React Navigation | Full native control and unrestricted native modules | Higher iOS/Android build, signing, dependency, and upgrade burden; loses Expo tooling advantages | Reject for MVP |
| Native Swift + Kotlin | Best platform-specific UX/performance; full hardware access | Two teams/codebases; slower product iteration; duplicates domain UI/business behavior; highest 3-year TCO | Reject |
| Ionic/Capacitor 7 | Web development familiarity; fast for simple apps; good for web-to-mobile migration | Weaker native feel/performance for planning, gesture-heavy, offline-data application; WebView limitations on iOS | Reject |
| Expo universal app for both mobile and web | More code sharing | Compromises the selected Next.js web strategy and web-specific UX/SEO needs; mobile performance suffers from web-first approach | Reject |

React Native recommends React Navigation as a general starting point for mobile navigation.  Expo Router remains the better choice here because it provides the same native navigation patterns while giving Life OS first-class URL/deep-link mapping and conventions compatible with the broader Expo toolchain.[^4]

## 2026 Framework Landscape Analysis

### React Native New Architecture (Default Since 0.76)

The React Native ecosystem underwent a fundamental architectural shift that is now complete and production-stable:

- **Fabric**: The new rendering system replaces the old asynchronous bridge with JSI (JavaScript Interface), enabling synchronous communication between JavaScript and native code
- **TurboModules**: Lazy-loading native modules that eliminate the historical serialization bottleneck
- **Hermes**: JavaScript engine is now default on both platforms, improving startup performance
- **Performance impact**: Cold-start times ~350-410ms, 60fps consistency at 95.8% (vs 98.2% for Flutter), memory usage ~68MB idle

The old narrative that "React Native is slow due to the bridge" is now obsolete. The New Architecture has closed the performance gap significantly, and for typical business apps, users cannot distinguish React Native from native performance.

### Flutter 4.x with Impeller 2.0

Flutter's 2026 evolution centers on its rendering engine:

- **Impeller 2.0**: Replaced Skia as the default renderer on iOS and Android, using pre-compiled shaders and a graph-based pipeline
- **Performance**: Consistent 60-120 FPS under heavy animation load, cold-start ~280-320ms, memory usage ~52MB idle
- **Bundle size**: Larger than React Native (~17MB vs ~13MB minimum)
- **Market position**: ~46% cross-platform market share (highest among frameworks)

**Why Flutter was rejected for Life OS:**
- Dart talent pool is 5.9% of developers vs 66% for JavaScript (Stack Overflow 2025)
- No ecosystem reuse with the existing TypeScript/React web stack
- PowerSync integration exists but is less mature than React Native
- The performance advantage only materializes in animation-heavy UIs, which is not Life OS's primary use case
- Hiring cost and time-to-productivity are higher for Dart teams

### Kotlin Multiplatform 2.0

KMP reached stability in November 2023 and has matured significantly:

- **Stability**: Officially stable since Kotlin 1.9.20; Compose Multiplatform for iOS stable since May 2025
- **Performance**: Best-in-class cold-start (276ms Android, 298ms iOS), smallest bundle size (14.2MB APK, 16.8MB IPA)
- **Architecture**: Share business logic with native UI (SwiftUI on iOS, Jetpack Compose on Android) OR share UI via Compose Multiplatform
- **Adoption**: 23% cross-platform market share, growing fast; used by Duolingo, Airbnb, Google Workspace, McDonald's

**Why KMP was rejected for Life OS:**
- Requires macOS for iOS builds, doubling CI costs for teams with 100+ daily builds
- Kotlin talent pool smaller than JavaScript; no reuse with existing TypeScript stack
- Compose Multiplatform on iOS still has gaps in animation fidelity and platform-specific behaviors
- Ecosystem smaller than React Native/Flutter; third-party library availability is limited
- Best fit for teams with existing Android/Kotlin investment, which Life OS does not have

### Tauri 2 Mobile

Tauri extended its Rust-plus-web model to mobile in 2024:

- **Architecture**: Rust backend with system WebView (WKWebView on iOS, Android WebView on Android)
- **Bundle size**: Extremely small (2-15MB typical)
- **Performance**: Cold-start 200-500ms, memory 20-80MB idle
- **Security**: Strong permission model with granular capability declarations

**Why Tauri was rejected for Life OS:**
- Mobile ecosystem is still maturing; plugin ecosystem smaller than RN/Flutter
- WebView rendering inconsistencies across platforms require cross-browser-style QA
- Rust learning curve is steep for non-Rust teams
- Not optimized for gesture-heavy, offline-first apps with complex native integrations
- PowerSync and other offline-first sync engines have less mature Tauri integration

### Offline-First Sync Engine Landscape (2026)

The offline-first sync space has consolidated significantly:

| Engine | Status | React Native Support | Notes |
|--------|--------|---------------------|-------|
| **PowerSync** | Production-stable | Excellent (first-class SDK) | Selected for Life OS; Drizzle driver integration; Rust-based sync client default |
| RxDB v16 | Production-stable | Good (SQLite via op-sqlite) | 15+ sync adapters; CRDT support; broader platform support |
| WatermelonDB | Maintained | Excellent (native SQLite) | React Native specialist; web support uses unmaintained LokiJS |
| ElectricSQL | Pivoted (Apr 2026) | Limited | Removed automatic offline sync; focus on agents |
| TinyBase | Emerging | Good | ~5KB bundle; CRDT semantics; newer ecosystem |

**PowerSync remains the best choice for Life OS because:**
- First-class React Native SDK with Drizzle driver integration
- Rust-based sync client (default since v1.35.9) for performance
- Direct PostgreSQL integration matches Life OS backend
- `localOnly` flag enables dual-zone privacy architecture
- Strong offline-first semantics with reactive queries
- Production-proven at scale

## Why Expo Router Wins

### Native-first navigation with URL semantics

Every Expo Router route maps to a URL path. That route can be used in a browser where applicable, as a custom-scheme deep link, or as an iOS Universal Link/Android App Link.  This is valuable for flows Life OS will need:[^1]

```text
lifeos://auth/callback
https://app.lifeos.example/oauth/google/callback
https://app.lifeos.example/today
https://app.lifeos.example/tasks/<task-id>
https://app.lifeos.example/notifications/<notification-id>
```

Expo recommends Expo Router for deep-link handling because it automatically enables deep links for app routes, avoiding separate runtime route configuration.[^3]

### Better conventions, less navigation boilerplate

Expo Router provides layouts, route groups, stacks, tabs, modals, dynamic segments, deep links, and typed route patterns without manually composing a large tree of navigators. The root `_layout.tsx` is the right place for providers, font loading, splash-screen coordination, and initial application setup.[^1]

### Correct fit for production mobile dependencies

The product requires native dependencies and configurations for secure token storage, PowerSync/SQLite, notifications, authentication redirect handling, and likely calendar or file capabilities. Expo Go should be used only for early UI experiments; regular development must use EAS Development Builds.

Expo distinguishes development builds from Expo Go and provides specific guidance for development builds and EAS Build workflows.  The project should not delay this transition until late in the implementation, when native configuration differences become expensive to uncover.[^5]

## Mobile Runtime Decision

```text
Framework:                  React Native
Toolchain:                  Expo managed workflow
Navigation:                 Expo Router
Development runtime:        EAS Development Build
Preview distribution:       EAS internal/preview builds
Production distribution:    App Store Connect and Google Play production builds
Web implementation:         Separate Next.js app, not Expo web
Offline data:               PowerSync local SQLite
Authentication:             Clerk Expo SDK + SecureStore-backed token cache
```

“Managed workflow” does not mean “no native code ever.” It means Expo owns the native project generation and build configuration until a concrete requirement demands a custom native module or configuration plugin. If such a requirement appears, use a config plugin and development build first; do not eject reflexively.

## Navigation Structure

### Primary tabs

Use a small number of high-frequency tabs:


| Tab | Primary purpose | Notes |
| :-- | :-- | :-- |
| **Today** | Daily plan, upcoming blocks, focus actions, capture | Default authenticated route |
| **Plan** | Task list, projects, goals, unscheduled work | May begin as “Tasks” if Plan is too broad for V1 |
| **Calendar** | Calendar timeline, native blocks, availability | Calendar source visibility and planning actions |
| **Notes** | Notes, reference, linked knowledge | Optional in first navigation release if scope demands |
| **More** | Search, inbox/capture, settings, integrations, account | Avoid a sixth persistent tab initially |

Do not make every product entity a tab. Projects, areas, goals, contacts, task detail, calendar-event detail, and settings should be nested stack destinations or presented through contextual navigation.

### Suggested route structure

```text
apps/mobile/src/app/
├── _layout.tsx
├── index.tsx                         # Bootstrap redirect only
├── (auth)/
│   ├── _layout.tsx
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   └── callback.tsx
├── (onboarding)/
│   ├── welcome.tsx
│   ├── workspace.tsx
│   └── calendar-consent.tsx
├── (app)/
│   ├── _layout.tsx                   # Authenticated root stack
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Today
│   │   ├── plan.tsx
│   │   ├── calendar.tsx
│   │   ├── notes.tsx
│   │   └── more.tsx
│   ├── tasks/
│   │   ├── [taskId].tsx
│   │   └── [taskId]/history.tsx
│   ├── projects/[projectId].tsx
│   ├── goals/[goalId].tsx
│   ├── events/[eventId].tsx
│   ├── notes/[noteId].tsx
│   ├── settings/
│   │   ├── index.tsx
│   │   ├── account.tsx
│   │   ├── integrations.tsx
│   │   ├── notifications.tsx
│   │   ├── privacy.tsx
│   │   └── billing.tsx
│   └── modals/
│       ├── capture.tsx
│       ├── create-task.tsx
│       ├── task-schedule.tsx
│       ├── plan-review.tsx
│       └── sync-issues.tsx
├── +not-found.tsx
└── +native-intent.tsx                # Only if custom third-party URL handling is needed
```

Route groups, such as `(auth)` and `(tabs)`, organize navigation without becoming part of the public URL. Expo Router documents route groups as a way to organize the initial and nested navigation tree without affecting the resulting path.[^1]

## Navigation Rules

### Tabs are destinations, not actions

Tabs should preserve user context and support return to a known primary destination. Do not use tabs for:

- Create task.
- Quick capture.
- Schedule task.
- Search.
- Scan/upload attachment.
- Settings sub-actions.

Use a globally accessible floating action button, header action, or modal route for quick capture. This avoids an action-shaped tab that breaks expected mobile navigation behavior.

### Detail screens use stacks

Push entity detail screens onto the current stack:

```text
Today -> Task detail
Plan -> Project detail -> Task detail
Calendar -> Event detail -> Related task
Notes -> Note detail -> Linked project/task
```

A back action must return to the actual prior context, not a generic home screen.

### Creation and focused work use modals

Use modal routes for:

- Quick capture.
- Create/edit task.
- Schedule/defer/split task.
- Create native time block.
- Search/command palette.
- Plan review.
- Sync issues.
- Calendar connection confirmation.

A modal should represent an interruptible task. If the user enters a multi-step, long-lived workflow—such as account deletion, export, or onboarding—use a stack flow with explicit progress and recovery instead.

### Navigation state must not be product state

A route parameter such as `taskId` identifies a screen target; it does not prove authorization or provide a trustworthy task snapshot. Every screen must load from PowerSync’s local replica or the Hono API and handle:

```text
Record exists and is authorized
Record is absent because sync is incomplete
Record was deleted
Record belongs to a different workspace
Record is unavailable while offline
```

Never serialize full task/note/calendar data into route parameters, URLs, analytics, or push payloads.

## Auth and Bootstrap Flow

### Root initialization

The root layout should initialize only essential providers:

```text
Clerk provider
Secure token cache
PowerSync provider/connection manager
Theme provider
Safe-area provider
Global error boundary
Telemetry with redaction
```

Do not make the root layout wait for every optional service before rendering. The user should see an intentional splash/bootstrap state while authentication and local-replica identity are resolved.

### Bootstrap state machine

```text
1. App launches.
2. Restore Clerk session from secure storage.
3. If no valid session: show auth flow.
4. If session exists: resolve app profile and permitted workspace.
5. Initialize PowerSync replica for app-user + active workspace.
6. If replica is ready: enter authenticated tabs.
7. If replica is opening/syncing: show usable local bootstrap state, not a frozen splash.
8. If token/membership fails: disconnect replica, clear unsafe state, show recovery/sign-in path.
```

The auth route group should never mount the authenticated tab navigator, and the authenticated group should not render sensitive local content before the replica’s user/workspace identity has been confirmed.

## Deep Linking

### Supported link categories

| Link category | Example | Handling rule |
| :-- | :-- | :-- |
| Clerk auth redirect | `lifeos://auth/callback` | Handle only through approved Clerk flow |
| Google OAuth callback | Universal Link to controlled callback route | Backend validates OAuth state; mobile receives only safe completion result |
| Notification action | `https://app.lifeos.example/tasks/<id>` | Authenticate, resolve record locally/server-side, then navigate |
| Task/project/note link | `https://app.lifeos.example/tasks/<id>` | Require membership; no data in URL beyond opaque ID |
| Calendar reminder | `https://app.lifeos.example/calendar?date=...` | Validate date format and resolve local view |
| Future shared link | Separate explicit sharing model | Do not assume private entity URLs are shareable |
| Password/account recovery | Clerk-controlled URL | Use provider-supported redirect allowlist |

Expo explains that universal links and Android App Links require a domain-controlled verification file, while custom schemes are useful for app-specific deep links.  Prefer verified `https` Universal Links/App Links for production links, with a custom `lifeos://` scheme retained for development and provider compatibility.[^3]

### Security rules

- Register only controlled redirect domains and app schemes in Clerk, Google, and any provider settings.
- Never use an unvalidated `redirectTo` query parameter.
- Never put access tokens, refresh tokens, calendar authorization codes, session material, task titles, note content, or workspace metadata in a URL.
- Treat inbound URL parameters as untrusted Zod-validated input.
- Require a valid session and membership before loading a private deep-linked resource.
- If a notification refers to deleted/unavailable content, display a safe “no longer available” state.
- Test cold start, warm start, logged-out state, expired session, and offline deep-link behavior on both platforms.


## EAS Build and Release Channels

Use three environments, each with separate configuration and secrets:


| Environment | Purpose | Distribution |
| :-- | :-- | :-- |
| Development | Local development builds, test identities, local/staging API | Engineers only |
| Preview / staging | QA, stakeholder review, realistic integration tests | Internal testers |
| Production | Store release, real users, real backend | App Store / Play Store |

Each environment needs isolated values for:

```text
Expo application IDs/package IDs
API base URL
Clerk publishable key/instance
PowerSync endpoint
PowerSync token audience
Deep-link domains and schemes
Sentry/telemetry environment
Push-notification configuration
Google OAuth client IDs/redirect URIs
```

Do not use one universal app identifier or one Clerk/PowerSync configuration across development, staging, and production. It turns routine testing into an account/data-isolation risk.

### Update policy

- Use EAS Update only for JavaScript/assets compatible with the currently installed native runtime.
- Publish updates by runtime version/channel, never indiscriminately to all builds.
- Native dependency, permission, configuration-plugin, Expo SDK, or runtime changes require a new binary.
- Maintain a rollback plan for over-the-air updates.
- Do not use OTA updates to alter authentication/security behavior without staged testing.


## Native Permissions

Request permissions only when the user invokes the feature that needs them:


| Permission/capability | Request timing |
| :-- | :-- |
| Notifications | After explaining reminder value and asking at a user-beneficial moment |
| Calendar | During explicit Google Calendar connection/enablement; OAuth is separate from OS calendar permissions |
| Camera/photo library | When attaching/scanning content |
| Biometrics | Only if optional app lock or sensitive-action verification is implemented |
| Location | Do not request for MVP unless a clear location-based feature exists |
| Contacts | Do not request for MVP unless importing contacts is explicitly offered |

Never request every permission at onboarding. A productivity app should earn trust incrementally, especially because it is likely to handle highly personal calendar and note data.

## Offline and Sync Navigation Behavior

Navigation must be resilient to local-data states:


| State | UI behavior |
| :-- | :-- |
| Local replica ready, offline | Navigate normally and show locally available content |
| Local replica stale | Show last-known content with discreet stale/sync indicator |
| Screen target not yet replicated | Show a bounded loading/retry state; offer return/navigation recovery |
| Command pending upload | Show pending state on the relevant entity/action |
| Command rejected | Show Sync Issues entry and actionable reconciliation |
| Membership revoked | Stop sync, clear protected local data, return to a safe signed-out/restricted state |
| Account switched | Dispose old navigation/data state and initialize a new replica before showing app tabs |

Do not prevent navigation just because the device is offline. Prevent only actions whose result cannot be safely represented locally or whose permissions/entitlement must be verified online.

## State Management Boundaries

| Concern | Recommended owner |
| :-- | :-- |
| Replicated tasks, projects, calendar, notes | PowerSync SQLite reactive queries |
| Offline command state and sync failures | Local mobile-data tables / command queue |
| Authentication/session | Clerk Expo SDK + secure token cache |
| Navigation state | Expo Router |
| Global UI state: theme, temporary composer state | React context/Zustand only if needed |
| Form state | React Hook Form + Zod |
| Server-only state: entitlement, OAuth initiation | Typed Hono API client |
| Screen route params | Expo Router, validated before use |

Do not use React Query as a duplicate source of truth for PowerSync-replicated entity data. It may be appropriate for non-replicated server state, but task/event/note views should read their local SQLite replica.

## Accessibility and Native UX

- Use native accessible labels, roles, hints, and state announcements for task completion, scheduling, sync status, and errors.
- Ensure tab labels are meaningful and persistent; do not rely only on icons.
- Support Dynamic Type/font scaling without truncating important task titles or deadline context.
- Respect reduced-motion preferences, especially for drag/reorder and plan animations.
- Provide haptic feedback sparingly for completed tasks, successful capture, and meaningful scheduling actions.
- Support platform conventions: iOS back gestures, Android hardware back, safe areas, keyboard avoidance, and modal dismissal behavior.
- Never use color alone to convey overdue, conflict, pending sync, or completion status.


## Testing

### Required device coverage

| Test type | Scope |
| :-- | :-- |
| Unit | Navigation utilities, deep-link parsing, route parameter validation, bootstrap state transitions |
| Component | Tab labels, modals, task detail interactions, accessibility state |
| Integration | Clerk session restoration, PowerSync replica initialization, account switching, command-pending UI |
| E2E | Maestro/Detox on iOS and Android development builds |
| Deep-link E2E | Cold/warm start, authenticated/logged-out, notification tap, OAuth return |
| Offline E2E | Airplane mode launch, create/complete task, restart, reconnect, conflict/rejection |
| Release validation | Preview build install/upgrade, permission prompts, push tokens, OTA rollback |
| Accessibility | Screen-reader walkthroughs and dynamic-text tests for Today/capture/settings |

Critical E2E scenarios include:

1. First launch -> sign in -> workspace bootstrap -> Today.
2. Offline launch with an existing replica -> create/complete task -> reconnect.
3. Sign out -> confirm replica removal -> sign in as second user -> verify no first-user data.
4. Notification deep link -> correct task/calendar destination.
5. Google OAuth start -> browser -> callback -> safe app return.
6. Expired Clerk/PowerSync token -> successful refresh or safe recovery.
7. Android hardware back and iOS back gesture from nested task/project/event details.

## Trade-Offs (2026 Update)

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| Expo managed workflow | Faster iteration, EAS tooling, lower native maintenance, largest talent pool | Must follow Expo SDK/native compatibility discipline; slightly larger bundle than Flutter |
| Expo Router over direct React Navigation | File routing and automatic deep-link paths, typed routes, zero-config deep linking | Less manual navigator-level control; route conventions must stay clean |
| React Native over Flutter | TypeScript/React ecosystem reuse, easier hiring, shared mental models with web team, better PowerSync integration | Slightly lower animation performance under extreme load; platform-specific UI inconsistencies possible |
| React Native over KMP | No macOS CI requirement, larger talent pool, mature ecosystem, better web code sharing | Slightly slower cold-start; bridge overhead (though minimized with New Architecture) |
| Development builds over Expo Go | Real native dependency/configuration fidelity | Requires EAS build setup and installed dev binaries |
| Separate Next.js web app | Best web SEO/UX and independent deployment | Less literal screen-component sharing |
| Tabs plus stacks/modals | Familiar native information architecture | Requires careful rules to avoid route sprawl |
| Universal links over custom scheme only | Safer, shareable, verified production URLs | Requires domain association configuration |
| PowerSync as mobile entity data owner | Genuine offline behavior, Drizzle integration, dual-zone privacy support | Developers must avoid duplicate query caches; Rust-based client requires native builds |

## Final Decision

Lock the following mobile foundation:

```text
Mobile framework:              React Native with Expo managed workflow
Navigation:                    Expo Router only
Development workflow:          EAS Development Builds, not Expo Go for core work
Primary destinations:          Today, Plan/Tasks, Calendar, Notes, More
Detail navigation:             Nested stacks
Create/focused interactions:   Modal routes
Deep linking:                  Expo Router; verified Universal Links/App Links in production,
                               custom scheme for development/provider compatibility
Web strategy:                  Separate Next.js web application
Authentication:                Clerk Expo integration with secure token storage
Offline entity data:           PowerSync local SQLite
Non-replicated remote state:   Typed API client; narrowly scoped TanStack Query if needed
Environment isolation:         Separate dev, preview/staging, and production app/API/auth/sync config
Native permissions:            Just-in-time, feature-triggered requests
```

The next category in dependency order is **UI Component System \& Styling**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://docs.expo.dev/router/basics/core-concepts/

[^2]: https://docs.expo.dev/router/introduction/

[^3]: https://docs.expo.dev/linking/overview/

[^4]: https://reactnative.dev/docs/navigation

[^5]: https://docs.expo.dev/develop/development-builds/faq/

[^6]: https://reactnativerelay.com/article/complete-guide-expo-router-file-based-routing-react-native-2026

[^7]: https://reactnativerelay.com/article/deep-linking-react-native-expo-router-universal-links-app-links

[^8]: https://github.com/expo/expo/blob/main/docs/pages/router/create-pages.mdx

[^9]: https://www.agilesoftlabs.com/blog/2026/06/expo-router-file-based-navigation-deep

[^10]: https://evanbacon.dev/blog/router-rfc

[^11]: https://github.com/expo/expo/blob/main/docs/pages/develop/file-based-routing.mdx

[^12]: https://sharpskill.dev/en/blog/react-native/expo-router-react-native-file-based-navigation-guide

[^13]: https://github.com/expo/expo/issues/27429

[^14]: https://www.youtube.com/watch?v=RglRiycD0oQ

[^15]: https://reactnavigation.org/docs/from-expo-router/

