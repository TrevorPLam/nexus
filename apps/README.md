# Life OS Applications

This directory contains the deployable services and applications that make up the Life OS ecosystem. Each application is built with a specific platform and use case in mind, sharing core logic through the `packages/` directory.

## 📂 Applications

- **[api](./api)**: The Hono-based backend REST/command API. The authoritative source for data and business logic.
- **[web](./web)**: The Next.js web application. Provides a rich desktop experience for power users.
- **[mobile](./mobile)**: The Expo/React Native application. Designed for on-the-go productivity with offline-first synchronization.
- **[worker](./worker)**: The background job processor for long-running and scheduled tasks.

## 🏗️ Architecture Principles

1. **Shared Contracts**: All applications communicate using the Zod schemas defined in `packages/contracts`.
2. **Platform Specifics**: Each app leverages platform-native features (e.g., Next.js Server Components, React Native SQLite) while maintaining a consistent design via `@life-os/ui`.
3. **Environment Isolation**: Apps manage their own environment variables via `.env` files, validated by `@t3-oss/env-core`.

## 🚀 Running Locally

You can start all applications simultaneously from the root:

```bash
pnpm dev
```

Or target a specific application:

```bash
pnpm --filter @life-os/web dev
```
