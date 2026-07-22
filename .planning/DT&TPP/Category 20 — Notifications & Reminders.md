<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 20 — Notifications \& Reminders

**Recommendation: use a hybrid notification model: schedule device-local reminders through `expo-notifications` for near-term, user-owned task/time-block reminders, and use backend-scheduled remote push through Expo Push Service for reminders and important account/integration events that must survive device churn or require server authority.** The backend’s `pg-boss` worker remains the scheduling authority for remote delivery; local notifications improve offline reliability and latency on the active device.[^1][^2][^3]

Do not treat push delivery as guaranteed, do not put personal task/note/calendar content in push payloads, and do not use realtime Broadcast as a notification channel.

## Core Decision

```text
Mobile client library:          expo-notifications
Mobile local reminders:         expo-notifications scheduled notifications
Remote push transport, MVP:     Expo Push Service
Underlying platform transports: APNs on iOS, FCM v1 on Android
Remote scheduling authority:    PostgreSQL + pg-boss worker
Device registration:            Authenticated Hono API endpoint
Notification deep links:        Expo Router routes, opaque entity identifiers only
Web notifications:              In-app status/toast initially; browser push deferred
Analytics:                      Privacy-minimized aggregate delivery/interaction telemetry
```

Expo’s notifications library can retrieve push tokens and present, schedule, receive, and respond to notifications.  Expo’s Push Service simplifies delivery across APNs and FCM, allowing one server integration for iOS and Android.[^2][^1]

## Notification Principles

Life OS is a personal productivity product. Notification quality is a trust issue, not merely a technical delivery problem.

1. **User intent first.** A reminder must correspond to an explicitly enabled reminder policy, task, event, or plan commitment.
2. **Minimal disclosure.** The notification body should remain useful without exposing sensitive private information on a lock screen.
3. **Graceful degradation.** No single notification channel is guaranteed; the app remains correct without delivery.
4. **One reminder, one authoritative schedule.** Local and remote schedules must be coordinated to avoid duplicates.
5. **Actionable deep links.** A tap should open the relevant app context, subject to authentication and current authorization.
6. **Respectful frequency.** Quiet hours, focus modes, throttling, and bundling are product requirements.
7. **No content leakage in telemetry.** Record delivery state and type, not task titles, note content, or calendar details.

## Delivery Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Hybrid local + Expo Push** | Local works offline and is immediate on installed device; remote supports server-authoritative schedules and multiple devices; Expo simplifies APNs/FCM integration; actively maintained (v56.0.14, May 2026) | Requires deduplication, token lifecycle, and careful policy to avoid double delivery; 600 notifications/second volume limit via Expo Push Service | **Select** |
| Local notifications only | Works without backend/network after scheduling; simple for personal reminders | Cannot reliably adapt to server-side schedule changes, multiple devices, revoked access, or reminders created elsewhere | Use for near-term device-local reminders only |
| Remote push only via Expo Push Service | One cross-platform server integration; centralized timing/controls; free tier | Device offline/OS behavior can delay/drop; requires token lifecycle; does not work as an offline fallback; 600 notifications/second limit | Use for server-authoritative delivery |
| Direct APNs + FCM | Full platform control, direct delivery feedback, avoids Expo relay; APNs shows better performance (66ms median vs 88ms for FCM, 0% error rate vs 0.02%) | Separate iOS/Android server implementations and credential operations; higher operational complexity | Defer until scale/compliance/control need justifies it |
| Firebase Cloud Messaging only | Strong Android support, rich capabilities; cross-platform (Android, iOS, web) | Does not solve iOS without APNs; adds separate Apple integration and less Expo abstraction; inconsistent OEM behavior on Android | Reject as cross-platform primary |
| react-native-notify-kit (Notifee fork) | Rich local notifications; Android channel control; FCM Mode for unified display; actively maintained community fork; New Architecture (TurboModules) | Notifee was archived April 2026; Expo Go not supported (requires dev build); adds complexity if rich features not needed; separate from Expo ecosystem | Consider only if advanced Android channel features or rich local notifications are required |
| OneSignal / customer-engagement platform | Segmentation, campaigns, dashboards, experimentation; generous free tier (10k subscribers) | Extra vendor/data sharing; product-led reminder model does not need marketing automation initially; overkill for transactional reminders | Defer/reject for MVP |
| Email reminders | Works without mobile push permissions | Noisy and slow for immediate planning; privacy/frequency issues | Optional future fallback, not primary |
| SMS | High delivery/attention | Intrusive, expensive, compliance-heavy, inappropriate for routine task reminders | Reject |
| Browser push | Useful for web-first users | Permission fatigue, browser variation, additional token/service-worker design | Defer |
| Realtime Broadcast | Fast while application is open | Not delivered to backgrounded/offline device; not durable | Reject for notifications |

FCM is a cross-platform messaging service capable of notification and data messages, but Android delivery still requires a trusted server component and client configuration.  Direct FCM is not selected because Expo provides a simpler unified first implementation across Android and iOS.  Performance benchmarks from 2026 show APNs has faster median response times (66ms vs 88ms) and more consistent delivery (p99: 180ms vs 281ms) than FCM, but Expo Push Service abstracts both adequately for MVP scale.[^4][^5][^2]

## Why Hybrid Wins

### Local reminders cover offline and short horizon

A device-local notification can fire even when the device has no network connection, provided the OS permits it and the notification was scheduled previously. This is valuable for a productivity app: a user who plans a focus block on a train should still receive the reminder even if connectivity disappears.

Use local scheduling for:

- A task reminder created or updated on the current device.
- A native time block starting soon.
- Daily planning prompt.
- Near-term reminders within a bounded horizon, initially 24–72 hours.
- A locally available task/time block whose current reminder schedule is known.


### Remote push covers authoritative, cross-device changes

Use backend-triggered push for:

- Reminders created on another device.
- Schedule changes made by calendar sync or worker projection.
- Reminders beyond the local scheduling horizon.
- Important integration health changes, such as Calendar reauthorization required.
- Data export ready.
- Account security or deletion workflow events.
- Reminder reconciliation after a device has been offline.
- Multi-device policy where the system intentionally notifies one or more registered devices.

The `pg-boss` worker already supports delayed/scheduled, retryable jobs. It should schedule remote notification work after authoritative state changes rather than relying on a mobile app to remain running.[^3][^6]

## Notification Categories

### MVP categories

| Category | Default | Delivery | Content policy |
| :-- | :-- | :-- | :-- |
| Task due/starting soon | Opt-in or user-configured | Local preferred, remote fallback | Generic by default |
| Native time block starting | Opt-in | Local preferred, remote fallback | Generic by default |
| Daily planning prompt | Opt-in | Local schedule initially | Generic |
| Calendar connection needs repair | Opt-in, important | Remote push + in-app state | Generic, no provider details |
| Sync issue needing action | In-app first; optional push | Remote only if persistent/material | Generic |
| Export ready | Opt-in | Remote | Generic |
| Account/security event | Required only where justified | Remote + email if security policy later requires | Generic |
| Marketing/engagement | Disabled | None in MVP | Not applicable |

Do **not** ship a broad “You have 17 tasks due” engagement engine initially. The product should help users execute intentional plans, not generate attention-grabbing noise.

### Deferred categories

- Browser/web push.
- Collaborative workspace activity notifications.
- Email/SMS reminders.
- Rich notification actions that mutate tasks from the lock screen.
- AI-generated nudges.
- Provider-specific calendar event alerts beyond user-controlled calendar provider settings.
- Marketing campaigns or behavioral re-engagement flows.


## Data Model

### Device registration

Create a server-owned device installation record:

```text
device_installations
  id                         UUID
  app_user_id                UUID
  platform                   ios | android
  environment                development | preview | production
  expo_push_token            encrypted or protected at rest
  device_id_hash             opaque stable installation identifier
  app_version
  runtime_version
  locale
  timezone
  notification_permission    unknown | granted | denied | provisional
  enabled                    boolean
  last_seen_at
  last_token_refresh_at
  invalidated_at
  created_at
  updated_at
```

Required behavior:

- Register/update only through an authenticated endpoint, for example `PUT /v1/devices/push-token`.
- Associate the token with the verified authenticated `app_user`, never a body-supplied user ID.
- Scope tokens by environment to prevent development/preview messages reaching production devices.
- Treat tokens as sensitive identifiers; never expose them to other clients or logs.
- Update permission state and timezone at app launch/resume and when application settings change.
- Invalidate/delete tokens on sign-out, explicit device disable, provider receipt indicating invalid token, and account deletion.
- Permit multiple installations per user; do not assume one device.


### User reminder preferences

```text
notification_preferences
  app_user_id
  workspace_id nullable
  enabled
  task_reminders_enabled
  time_block_reminders_enabled
  daily_planning_enabled
  daily_planning_local_time
  default_lead_minutes
  quiet_hours_start_local
  quiet_hours_end_local
  timezone
  lock_screen_detail_level       generic | title_only | detailed
  permitted_channels             local | push
  updated_at
```

The final schema should separate user-global preferences from workspace-specific planning defaults if multiple workspaces become meaningful. Use user locale/timezone only as a default; preserve time-zone intent for each reminder.

### Reminder instances

Represent reminders explicitly rather than inferring them ad hoc from every task:

```text
reminders
  id
  workspace_id
  source_type                 task | time_block | daily_plan | system_event
  source_id
  trigger_at_utc
  intended_local_time
  timezone
  channel_policy              local_preferred | remote_preferred | remote_only
  status                      scheduled | delivered | skipped | cancelled | failed
  idempotency_key
  revision
  scheduled_local_device_id nullable
  delivered_at
  cancelled_at
  created_at
  updated_at
```

A reminder must be invalidated/rescheduled whenever its task/time block is completed, deleted, deferred, rescheduled, moved to a different workspace, or loses reminder eligibility.

## Scheduling Model

### Server is authoritative

The backend owns the canonical reminder calculation:

```text
Command / calendar sync / planning projection change
  -> PostgreSQL transaction updates task/time block/reminder state
  -> audit + outbox
  -> worker computes next valid reminder instance
  -> schedules/cancels pg-boss delayed push job
  -> emits safe in-app/realtime status hint if useful
```

The device receives reminder schedule metadata through PowerSync and creates/cancels its local notification for a bounded horizon.

```text
PowerSync local reminder state changes
  -> mobile scheduler reconciles scheduled OS notifications
  -> only schedules notifications assigned to current installation
  -> stores local OS notification identifier
```

The local scheduler is an optimization and offline resilience layer, not the authority.

### Prevent duplicate notifications

A hybrid model must define ownership for each reminder instance:

```text
Reminder instance:
  one logical idempotency key
  -> primary delivery channel for each device/horizon
  -> explicit cancellation/replacement on revision change
```

Recommended initial policy:


| Situation | Delivery policy |
| :-- | :-- |
| Reminder within 48 hours, current active device has granted permission and recently checked in | Local notification on that device; suppress remote push to that same device |
| Reminder within 48 hours, other eligible device installations exist | Remote push to those devices unless user chooses a single-primary-device policy |
| Reminder beyond local horizon | Server-scheduled remote push |
| Device has not checked in recently | Remote push is allowed; stale local schedule cannot be trusted |
| Reminder changes/cancels | Server updates revision; current device reconciles/cancels local ID; remote job validates revision before send |
| Device offline when schedule changes | Existing local notification may fire; notification tap must revalidate current state in app |
| Permission denied | No push/local delivery; in-app reminder status and settings recovery only |

Start with a conservative **one primary notification per reminder per user**, not all devices. The primary device can be the most recently active eligible device; later offer a user setting for “notify all my devices” if user research supports it.

### Job validation at send time

The remote delivery job must reload authoritative data immediately before sending:

```text
1. Is reminder still scheduled?
2. Does stored revision match current revision?
3. Is source task/time block still active and eligible?
4. Is the user allowed notifications now (quiet hours, preferences, timezone)?
5. Is selected device installation active and permission-granted?
6. Has this idempotency key already produced an accepted delivery attempt?
7. Is delivery still useful, or is it too late?
```

If any answer fails, mark the job skipped/cancelled rather than sending stale notification content.

## Permission Strategy

### Ask at the moment of value

Do not request notification permission on first launch. Ask only after the user has:

- Created a task with a reminder.
- Scheduled a time block.
- Enabled daily planning.
- Explicitly turned on reminders in settings.

Show a pre-permission explanation:

```text
“Get a reminder when your planned focus block starts.
You can choose what appears on your lock screen and change this anytime.”
```

Then request OS permission. If denied:

- Do not repeatedly prompt.
- Show an unobtrusive in-app explanation and a settings deep link only when the user tries to enable a reminder again.
- Preserve reminder intent in app data, but mark delivery unavailable.
- Avoid implying the reminder will fire.

Expo Notifications provides APIs to obtain notification permissions and push tokens.  Push-notification testing and real credentials require configured native builds; Expo documents EAS setup for Android FCM v1 and iOS credentials.[^1][^2]

### Android channels

Create a small, stable Android channel taxonomy:


| Channel | Importance default | Purpose |
| :-- | :-- | :-- |
| `reminders` | High | Explicit task/time-block reminders |
| `planning` | Default | Daily planning/review prompts |
| `account` | Default | Export ready, connection repair, important account changes |
| `sync` | Low | Persistent sync issue only when enabled |

Users control channel behavior at OS level. Do not create a new Android channel for every workspace/task or use high importance for routine sync/background events.

### iOS policy

- Use clear, limited categories.
- Request authorization only after user intent.
- Treat Focus modes, notification summaries, and user settings as authoritative.
- Do not use critical alerts or time-sensitive interruption levels in MVP.
- If later requesting time-sensitive classification, justify it narrowly through product policy and platform review; “productivity” alone does not justify interruptive delivery.


## Content and Privacy Policy

### 2026 privacy landscape

Recent reporting (EFF, April 2026) highlights that notification content can persist on devices and be accessible during forensic collection, even after deletion. Apple addressed part of this issue in iOS 26.4.2 and 18.7.8, but the fundamental risk remains: **sensitive content duplicated outside the protected app context** is a high-risk exposure channel.[^20]

Standard push architectures (FCM/APNs) use TLS in transit but decrypt payloads at the provider gateway, meaning Apple/Google can technically access plaintext content. For Life OS, which handles intimate personal data, this reinforces the need for opaque, minimal payloads and in-app authentication for sensitive details.[^21]

### Default generic content

Notification content should be useful but privacy-preserving:

```text
Title: Life OS
Body: You have a planned task starting now.

Title: Life OS
Body: A reminder is ready.

Title: Life OS
Body: Your calendar connection needs attention.

Title: Life OS
Body: Your data export is ready.
```

If the user explicitly selects detailed lock-screen content, permit a limited title:

```text
Body: Start: “Prepare project brief”
```

Do not include:

- Note body or snippets.
- Calendar event descriptions, locations, attendee lists, or meeting links.
- Full task details, tags that disclose sensitive context, or project/area labels by default.
- Financial, health, relationship, legal, or security-sensitive content.
- OAuth/provider errors or account secrets.
- Authentication/session tokens.
- User email addresses or workspace names unless user has chosen detail level and the risk is acceptable.
- Any content that would be problematic if extracted from device storage during forensic investigation.


### Payload design

Use an opaque, minimal data payload:

```json
{
  "v": 1,
  "kind": "task_reminder",
  "reminderId": "uuid",
  "entityId": "uuid",
  "workspaceId": "uuid",
  "route": "/tasks/uuid"
}
```

Rules:

- No authority in payload. A deep link identifies a target; the app rechecks session, membership, and record availability.
- No title/body duplication in data payload.
- No tokens or provider credentials.
- Validate payload schema on receipt.
- If task no longer exists or access has changed, show a safe unavailable state.
- Do not log raw payloads; log category, version, and outcome only.


## Push Sending

### Select Expo Push Service for MVP

Use Expo’s push endpoint from the worker. Expo abstracts the platform push providers so the backend can use a consistent push model across APNs and FCM.[^2]

Worker flow:

```text
pg-boss delayed notification-deliver job
  -> load reminder + user preferences + active device installations
  -> choose eligible target(s)
  -> create delivery-attempt idempotency record
  -> submit small Expo push batch
  -> persist Expo ticket ID and accepted timestamp
  -> enqueue receipt-check job
  -> receipt result invalidates unregistered/invalid device token if necessary
```

Do not send directly from Hono request handlers. The worker supports retries, rate limits, batching, receipt processing, and transient-failure policies.

### Receipt handling

A push provider accepting a request does not prove a user saw it. Persist separate states:

```text
scheduled
send_attempted
provider_accepted
provider_rejected
delivered_unknown
opened
actioned
suppressed
cancelled
failed
```

Only record `opened` when the app receives a notification response and the user can be associated safely with the displayed notification. Do not claim “delivered” based solely on a send API success.

## Local Notification Handling

### Client scheduler

Implement a single mobile service:

```text
packages/mobile-notifications/
├── src/
│   ├── permissions.ts
│   ├── register-device.ts
│   ├── local-scheduler.ts
│   ├── notification-handler.ts
│   ├── deep-link.ts
│   ├── channels.android.ts
│   ├── schemas.ts
│   └── index.ts
```

Responsibilities:

- Register/update device installation after authenticated bootstrap and permission changes.
- Read only replicated, client-safe reminder metadata from PowerSync.
- Schedule/cancel local notifications for current device and bounded horizon.
- Map each reminder ID/revision to an OS notification identifier.
- Reconcile on app launch, foreground, replica change, timezone change, and notification-permission change.
- Validate notification payload and route response through Expo Router.
- Avoid scheduling while signed out, workspace identity is unresolved, or replica is stale/unsafe.


### Local scheduling constraints

- OS scheduling limits vary; enforce a bounded near-term horizon and cap local scheduled notifications.
- Batch/reschedule efficiently; do not cancel/recreate every notification on every state update.
- Make scheduling idempotent by `reminderId + revision + installationId`.
- Cancel notifications when their source becomes completed/deleted/rescheduled.
- Avoid local task-action buttons in MVP. A notification tap opens the app; all state-changing actions pass through normal command/UI flow.
- Test app terminated, backgrounded, foregrounded, offline, timezone change, reboot, and OS permission changes.


## Deep-Link Handling

On notification interaction:

```text
1. Validate payload schema/version.
2. Route to an authenticated Expo Router destination.
3. If signed out, complete supported auth flow first.
4. Resolve active workspace safely.
5. Load local entity through PowerSync or authoritative API as appropriate.
6. If unavailable/deleted/revoked, show a safe “This item is no longer available” screen.
7. Never apply a task action solely from notification payload.
```

Deep linking remains subject to the mobile category’s rules: opaque IDs only, verified authentication, workspace authorization, and graceful handling of stale/deleted targets.[^7][^8]

## Quiet Hours and Frequency Controls

### Quiet-hours behavior

Use IANA timezone-aware local time:

```text
quiet_hours_start: 22:00
quiet_hours_end:   07:00
timezone:          America/Chicago
```

Rules:

- If a routine reminder falls within quiet hours, defer to quiet-end or suppress based on user policy.
- Do not silently defer hard-deadline/account-security notifications without a defined user policy.
- Recalculate after timezone change and daylight-saving transitions.
- If the user travels, use current device timezone for user-global daily prompts; preserve original local timezone semantics for calendar-bound events if product requirements demand it.
- Record suppression reason, but do not expose sensitive context in logs.


### Frequency caps

Initial conservative caps:

```text
Routine reminders:             Max 3 notifications in any rolling 2-hour window
Daily planning prompt:         Max 1 per local day
Connection-repair reminder:    Max 1 per 24 hours per connection
Sync-issue notification:       Max 1 per 24 hours per issue class
Export-ready notification:     One per export request
Account/security notification: Event-driven, no generic cap but deduplicated
```

If several reminders cluster, bundle:

```text
Life OS
3 planned items are starting soon.
```

Do not aggregate in a way that reveals detailed titles by default.

## Web Notification Policy

Defer browser push. For MVP web:

- Use in-app status banners, inbox/notification center only if product value justifies it.
- Use the selected Supabase Broadcast channel for in-app invalidation/status hints while the browser is open.
- Do not request browser notification permission.
- Do not create a service worker only for productivity reminders before mobile behavior and user demand are validated.

Browser push can be revisited after mobile notification reliability, user preferences, privacy language, and web service-worker architecture are mature.

## Testing

| Scenario | Expected behavior |
| :-- | :-- |
| User creates a task reminder while online | Server creates authoritative reminder; current device schedules local reminder; no duplicate remote push |
| User creates reminder offline | Local command/reminder state persists; local reminder scheduled if policy permits; server converges on reconnect |
| Task completed before reminder | Local schedule cancelled; remote job revalidates and skips |
| Reminder changed on second device | Server revision updates; first device reconciles/cancels old local notification; remote policy follows current revision |
| Device has no network | Existing local reminder can still fire; tap safely resolves available local data |
| Permission denied | No deceptive success state; settings recovery path shown |
| Token becomes invalid | Receipt handling disables/deletes token without repeated failed sends |
| User signs out | Local schedules cancelled; push-token association removed/invalidated; no private reminder remains |
| User changes timezone/DST occurs | Future reminders recalculate correctly according to intended local-time policy |
| Quiet hours | Routine reminder suppressed/deferred correctly; no burst at quiet-end |
| Notification arrives after task deleted | Tap opens safe unavailable state; no action applied |
| Expo/FCM/APNs outage | Job retries appropriately; no claim of confirmed delivery |
| Preview build token | Never receives production notification |

## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| Hybrid local + remote | Offline resilience plus server authority/cross-device coverage | Requires revisioning and deduplication |
| Expo Push Service | Fast cross-platform implementation; actively maintained; abstracts APNs/FCM | Expo is an additional relay/vendor; 600 notifications/second volume limit; less direct provider control |
| Server-authoritative schedule | Correct handling of changes, multiple devices, and permissions | More backend data/job logic |
| Generic default content | Protects lock-screen privacy; mitigates forensic extraction risk | Less immediately descriptive |
| Opaque event IDs in payloads | Prevents provider access to sensitive content; reduces device storage exposure | Requires in-app fetch for full details; adds one network round-trip on tap |
| Just-in-time permission prompt | Higher trust and likely better consent quality; aligns with 2026 UX best practices | Reminder feature may need an extra enablement step |
| One primary device initially | Reduces duplicate attention; simpler implementation | User may expect all devices; needs future preference option |
| No browser push | Avoids another permission/token/service-worker surface | Web-only users get in-app updates only |
| No lock-screen mutation actions | Preserves command validation and reduces mistakes | One extra app-open step for completion/defer |
| expo-notifications over react-native-notify-kit | Official Expo support; simpler integration; sufficient for MVP needs | Less advanced Android channel control; no rich notification grouping or inline replies |

## Final Decision

Lock the following notification architecture:

```text
Mobile SDK:                    expo-notifications
MVP transport:                 Expo Push Service over APNs and FCM
Scheduling authority:          PostgreSQL reminder records + pg-boss delayed jobs
Local reminders:               Scheduled on current eligible device for a bounded near-term horizon
Remote reminders:              Server-scheduled for long-horizon, cross-device, changed, and account/integration events
Deduplication:                 Reminder ID + revision + installation/channel idempotency model
Device tokens:                 Authenticated installation registry, environment-scoped, invalidated by receipts/sign-out/deletion
Deep links:                    Opaque IDs through Expo Router; session/membership always revalidated
Content default:               Generic, privacy-preserving; detailed titles only by explicit user preference
Permissions:                   Requested just in time after reminder-related user intent
Quiet hours/frequency:         Timezone-aware, user configurable, conservative caps and bundling
Android:                       Stable channels for reminders, planning, account, and low-priority sync
iOS:                           No critical/time-sensitive alerts in MVP
Web push:                      Deferred
Realtime Broadcast:            Never used as notification delivery
Direct APNs/FCM:               Deferred until scale/control/compliance requires it
```

The next category in dependency order is **File Storage \& Attachments**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^9]</span>

<div align="center">⁂</div>

[^1]: https://docs.expo.dev/versions/latest/sdk/notifications/

[^2]: https://docs.expo.dev/push-notifications/overview/

[^3]: https://github.com/timgit/pg-boss/blob/master/README.md

[^4]: https://firebase.google.com/docs/cloud-messaging/android/get-started

[^5]: https://firebase.google.com/docs/cloud-messaging

[^6]: https://app.unpkg.com/pg-boss@3.1.1/files/README.md

[^7]: https://docs.expo.dev/linking/overview/

[^8]: https://docs.expo.dev/router/basics/core-concepts/

[^9]: https://docs.expo.dev/guides/using-push-notifications-services/

[^10]: https://github.com/invertase/notifee (archived April 2026)

[^11]: https://github.com/marcocrupi/react-native-notify-kit (community-maintained Notifee fork)

[^12]: https://www.pkgpulse.com/guides/notifee-vs-expo-notifications-vs-onesignal-react-native-2026

[^13]: https://push0.com/blog/apns-vs-fcm-complete-developer-guide/

[^14]: https://knock.app/push-api-benchmarks/compare/apns-vs-fcm (2026 performance data)

[^15]: https://www.courier.com/blog/top-push-notification-providers (2026 comparison)

[^16]: https://encorp.ai/en/blog/ai-data-security-push-notifications-risk-2026-04-11

[^17]: https://medium.com/@YodgorbekKomilo/how-firebase-cloud-messaging-fcm-works-in-android-a-detailed-system-design-5d937f52b033

[^18]: https://push0.com/blog/end-to-end-encrypted-push-notifications-explained/

[^19]: https://docs.aws.amazon.com/sns/latest/dg/sns-fcm-v1-payloads.html

[^20]: https://appbot.co/blog/app-push-notifications-2026-best-practices/

[^21]: https://www.eff.org/deeplinks/2026/04/how-push-notifications-can-betray-your-privacy-and-what-do-about-it

[^22]: https://www.designkey.studio/post/push-notifications-best-practices

[^23]: https://storyie.com/blog/push-notification-expo-sst (2025 architecture case study)

