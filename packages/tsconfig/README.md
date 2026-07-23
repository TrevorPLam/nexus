# @life-os/tsconfig

Shared TypeScript configurations for the Life OS monorepo. This package
centralizes TS rules to ensure consistency across all packages and applications.

## 📂 Configurations

- `base.json`: The foundational TypeScript configuration (Strict Mode, ESM,
  etc.).
- `app-base.json`: Base configuration for applications.
- `nextjs.json`: Specific rules for Next.js applications.
- `expo.json`: Specific rules for Expo/React Native applications.
- `node.json`: Specific rules for Node.js backend services.

## 🏁 Usage

Extend the configuration in your local `tsconfig.json`:

```json
{
  "extends": "@life-os/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
