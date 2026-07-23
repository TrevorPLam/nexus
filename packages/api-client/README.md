# @life-os/api-client

A fully typed, Zod-validated TypeScript client for interacting with the Life OS
API. It is used by both the Web and Mobile applications to ensure consistent and
safe data fetching.

## 🚀 Features

- **Type Safety**: Automatically derived types from `@life-os/contracts`.
- **Validation**: Incoming and outgoing data is validated using Zod schemas.
- **Token Management**: Customizable `TokenProvider` interface for seamless
  integration with Supabase Auth.
- **Error Handling**: Unified error parsing for clear API diagnostics.

## 🏁 Usage

```typescript
import { apiClient } from '@life-os/api-client';

// Fetch work data
const projects = await apiClient.getProjects(workspaceId);
```

### With Auth

```typescript
const client = new ApiClient(BASE_URL, {
  getAccessToken: async () =>
    supabase.auth.getSession().then((s) => s.data.session?.access_token),
});
```

## 🧪 Testing

```bash
pnpm test
```
