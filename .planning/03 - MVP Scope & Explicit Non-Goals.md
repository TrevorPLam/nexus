# 3. MVP Scope & Explicit Non-Goals

## Purpose of the MVP

The Minimum Viable Product exists to validate the core daily planning loop and establish whether users will repeatedly trust Life OS to answer: *“What should I do next, given my actual time and priorities?”* The MVP must be a complete, usable system for a single individual, but it deliberately excludes everything that does not directly serve the planning loop. It is the smallest product that can generate the success signals defined in the validation plan.

## Core Capabilities

The MVP delivers a functioning personal planning spine with the following modules and behaviors:

### Inbox
A universal capture point for any item entering the system: tasks, notes, ideas, and commitments. The Inbox is designed for speed, allowing a user to offload something in seconds without categorizing or structuring it. It serves as the front door to the Clarify step of the core loop.

### Tasks & Projects
Users can create, organize, and manage tasks and projects with sufficient depth to support meaningful daily planning. Key attributes include:
- Priority levels
- Estimated duration (supporting both exact minutes and pre-defined buckets)
- Due dates and deadlines
- Recurrence rules
- Statuses (active, completed, deferred, dropped)
- Nesting into projects and areas

### Today Screen
The primary surface where users view and interact with their daily plan. It must present:
- The next upcoming calendar commitment
- Up to three user-selected daily outcomes (high-level intentions)
- A combined timeline of external calendar events and internally generated focus blocks
- A flexible, reorderable task queue for remaining work
- A persistent quick-capture entry point
- Simple, fast task actions: complete, defer, split, reschedule, drop

The Today screen must function as the “home base” that the user returns to throughout the day, and it must feel responsive and calm even with only a connected calendar and a handful of entered tasks.

### Plan View (Week)
A weekly overview that allows users to see upcoming days, drag tasks onto specific days, and create internal time blocks (native focus blocks). These blocks are stored within Life OS and are not written back to Google Calendar.

### Google Calendar Integration (Read-Only)
Users can connect one or more Google Calendars using OAuth with the minimum necessary scope. The integration is read-only in V1; Life OS reads external events to build a complete picture of available time but does not create, update, or delete events in Google Calendar. The system must:
- Perform incremental synchronization using sync tokens
- Listen for push notifications to trigger near-real-time updates
- Fall back to periodic polling to catch missed changes
- Display a visible “last synced” status
- Handle expired permissions and sync failures with clear user messaging

### Lightweight Notes
Notes can be created and attached to tasks, projects, or areas. They are simple, searchable, and support rich text, but they are not a full document editor.

### Areas & Goals
Minimal structure for categorizing projects and tasks into life areas (e.g., Health, Career, Finances) and for setting high-level goals. This provides the context the planning engine needs to prioritize work against the user’s declared intentions.

### Daily Shutdown
A structured end-of-day ritual that helps the user close the day cleanly. It allows them to:
- Mark remaining tasks as complete, deferred, rescheduled, split, or dropped
- Reflect on what was accomplished versus planned
- Set the stage for the next day’s plan

### Weekly Review
A lightweight guided review process to maintain system health. The review prompts the user to:
- Clear and process the Inbox
- Review active projects and ensure each has a next action
- Look ahead at the upcoming calendar
- Set or review weekly outcomes
- Archive or adjust stale items

### Universal Command Bar / Search
A single input surface that works across the application for:
- Quick capture of any item without navigating to a specific module
- Instant navigation to any entity (task, project, note, event)
- Performing actions (complete a task, create a time block) from a keyboard or mobile prompt

### Privacy & Account Settings
Users must have full control over their data and account:
- Disconnect calendar integrations
- Export all personal data in a portable format
- Initiate account deletion from within the application
- Manage notification preferences

## What “Works” Means

The MVP must be a satisfying, complete experience for a single user who connects only a calendar and enters a rough task list. It does not require heavy data entry to deliver value. A user should be able to open the app in the morning and immediately see a timeline of their day with their commitments, even if they have not yet built elaborate project hierarchies.

## Explicit V1 Non-Goals

These features are intentionally excluded from the MVP. Their presence in this list is a commitment: the team will not build them until the daily planning loop has been validated and retained users at the target thresholds. Each is a valid future capability, but building it before proving the core value risks diluting focus and fragmenting the user experience.

**Financial Operations**
- Bank account aggregation (Plaid or similar)
- Budget creation and tracking
- Bill payment or management
- Transaction categorization
- Investment portfolio tracking
- Net worth dashboards
- Tax preparation tools
- Subscription tracking

**Health & Wellness**
- Health metric logging (weight, blood pressure, etc.)
- Symptom or pain journals
- Medication management and reminders
- Fitness and workout planning
- Nutrition and meal tracking
- Sleep tracking
- Mood or mental health logging
- Menstrual cycle or fertility tracking
- HealthKit or Google Fit integration

**Habits & Routines**
- Habit tracking with streaks
- Morning/evening routine templates
- Gamification or rewards

**Collaboration & Sharing**
- Multi-user households
- Shared task lists and calendars
- Permissions and roles
- Real-time collaborative editing

**Additional Calendar Providers**
- Microsoft Outlook integration
- iCloud Calendar integration
- Any calendar beyond Google Calendar

**Advanced Content Creation**
- Full Notion-style document and database builder
- Wikis, spreadsheets, or rich multi-media pages
- Public sharing or publishing

**Communication**
- Email client or inbox integration
- Built-in chat or messaging
- CRM with pipeline management
- Social feed aggregation

**Platform Expansion**
- Browser extensions for capture
- Desktop-native applications (Electron or similar)
- Plugin or template marketplace

**AI & Automation**
- Autonomous AI agents that rearrange calendars or modify tasks without confirmation
- Automatic natural-language task parsing with AI (manual capture is sufficient)
- AI-generated weekly summaries or plans
- Any AI feature marketed as a product capability

**Enterprise & Team Features**
- Complex team project management (Gantt charts, resource allocation, dependencies)
- Multiple workspaces per user beyond personal organization
- Billing for teams or organizations

## Rationale for Restraint

Every excluded feature represents a real user need, and the long-term vision includes many of them. However, each also carries a significant risk: it adds complexity to the user interface, increases the surface area for bugs and support, and most importantly, distracts from the single question the MVP must answer: *Do people trust Life OS to plan their day, and do they return to it repeatedly?*

If that question is answered positively, subsequent versions will open these gates one domain at a time, using the same validation discipline that governs the MVP. If it is answered negatively, the team will have learned the lesson with the minimum possible investment, and can pivot without having built a sprawling, unused super app.