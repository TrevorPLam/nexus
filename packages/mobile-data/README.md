# @life-os/mobile-data

The data synchronization layer for the Life OS mobile application. It defines the **PowerSync** schema that bridges the PostgreSQL backend with the local SQLite database.

## 🚀 Features

- **Offline-First**: Defines tables and columns that are synchronized to the mobile device for offline access.
- **Relational Mapping**: Maps the `@life-os/database` Drizzle schema to PowerSync-compatible definitions.
- **Type Safety**: Leverages shared contracts to ensure data consistency during sync.

## 📂 Project Structure

- `src/schema.ts`: The authoritative PowerSync `AppSchema` definition.

## 🏁 Usage

The schema is consumed by the mobile application to initialize the PowerSync database:

```typescript
import { powersyncSchema } from '@life-os/mobile-data';
// Use with PowerSync React Native provider
```

## 🧪 Testing

```bash
pnpm test
```
