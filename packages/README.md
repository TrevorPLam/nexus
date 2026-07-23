# Life OS Shared Packages

This directory contains reusable libraries and configurations shared across all
applications in the Life OS monorepo.

## 📦 Core Packages

- **[contracts](./contracts)**: Authoritative Zod schemas and TypeScript types
  for the domain model.
- **[database](./database)**: Drizzle ORM schema definitions and migration
  history.
- **[api-client](./api-client)**: Typed TypeScript client for internal and
  external API consumption.
- **[ui](./ui)**: Shared UI component library built with Tamagui.
- **[mobile-data](./mobile-data)**: PowerSync schema definitions for mobile
  offline sync.
- **[tsconfig](./tsconfig)**: Centralized TypeScript configurations.

## 🏗️ Monorepo Conventions

1. **Workspace Protocol**: Internal dependencies must use the `workspace:*`
   protocol.
2. **Version Governance**: Shared dependencies are managed via `pnpm catalogs`
   in the root `pnpm-workspace.yaml`.
3. **Internal Only**: Packages are intended for internal use within the monorepo
   and are marked as `private: true`.

## 🛠️ Development

To build all packages:

```bash
pnpm turbo run build --filter="./packages/*"
```
