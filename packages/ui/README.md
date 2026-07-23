# @life-os/ui

The shared UI component library for Life OS, built with **Tamagui**. It provides a consistent design system that works across both Web (React) and Mobile (React Native).

## 🚀 Features

- **Cross-Platform**: Components designed to run on the web and mobile with high performance.
- **Theming**: Integrated support for light and dark modes via Tamagui's theme system.
- **Accessibility**: Built-in ARIA support and keyboard navigation.
- **Atomic Components**: A library of reusable primitives (Buttons, Inputs, Cards, etc.).

## 📂 Project Structure

- `src/components/`: Core UI components.
    - `Button.tsx`, `Input.tsx`, `Badge.tsx`, `Card.tsx`, etc.
- `src/index.ts`: Public exports for the library.

## 🏁 Usage

Import components in any application:

```tsx
import { Button, Card } from '@life-os/ui';

const MyComponent = () => (
  <Card>
    <Button>Click Me</Button>
  </Card>
);
```

## 🧪 Testing

```bash
pnpm test
```
