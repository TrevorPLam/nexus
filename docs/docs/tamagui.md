# Tamagui

## Overview

Tamagui is a universal UI kit for React that works across web, React Native, and
Expo. It provides a set of styled components that are optimized for performance
and can be used across platforms with minimal configuration.

## Latest Stable Version

**Version**: `1.100.0` (July 2026)

**Compatibility**:

- React: 17.x, 18.x
- React Native: 0.70+
- Expo: 47+
- Next.js: 13+, 14+, 15+, 16+
- Browsers: Modern browsers (Chrome, Firefox, Safari, Edge)
- Package Managers: npm, pnpm, yarn

**Key Features**:

- Cross-platform components
- Performance-optimized
- TypeScript support
- Customizable theming
- Animation support
- Accessibility features
- Server components support
- Zero-config setup

## Core Concepts

- **Universal Components**: Components that work on web and native
- **Styled Components**: Tamagui's styling system
- **Themes**: Customizable design tokens
- **Animations**: Built-in animation support
- **Media Queries**: Responsive design
- **Accessibility**: A11y features built-in
- **Server Components**: Support for React Server Components

## Key Features

- **Cross-Platform**: Same components work on web and native
- **Performance**: Optimized for fast rendering
- **TypeScript**: Full type safety
- **Theming**: Customizable design system
- **Animations**: Smooth animations
- **Accessibility**: A11y-first design
- **Responsive**: Media queries built-in
- **Server Components**: Next.js App Router support

## Basic Usage

```bash
# Install Tamagui
npm install tamagui @tamagui/config

# Install for web
npm install @tamagui/core

# Install for React Native
npm install @tamagui/core react-native-svg
```

## Installation

### Web Setup

```bash
npm install tamagui @tamagui/config @tamagui/core
```

### React Native Setup

```bash
npm install tamagui @tamagui/config @tamagui/core react-native-svg
```

### Expo Setup

```bash
npx expo install tamagui @tamagui/config @tamagui/core react-native-svg
```

## Configuration

### tamagui.config.ts

```typescript
import { config } from '@tamagui/config/v3';

export default config({
  tokens: {
    color: {
      primary: '#007AFF',
      secondary: '#5856D6',
      background: '#FFFFFF',
      foreground: '#000000',
    },
    space: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
    },
    fontSize: {
      1: 12,
      2: 14,
      3: 16,
      4: 18,
    },
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
});
```

### Next.js Setup

```typescript
// next.config.js
const { withTamagui } = require('@tamagui/next-plugin');

module.exports = withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui'],
});
```

## Components

### Basic Components

```typescript
import { View, Text, Button, Input } from 'tamagui'

function MyComponent() {
  return (
    <View padding="$4" backgroundColor="$background">
      <Text fontSize="$4" color="$foreground">
        Hello Tamagui
      </Text>
      <Button backgroundColor="$primary" color="white">
        Click me
      </Button>
      <Input placeholder="Enter text" />
    </View>
  )
}
```

### Styled Components

```typescript
import { styled } from 'tamagui'

const StyledView = styled(View, {
  name: 'StyledView',
  backgroundColor: '$background',
  padding: '$4',
  borderRadius: '$2'
})

function MyComponent() {
  return (
    <StyledView>
      <Text>Styled content</Text>
    </StyledView>
  )
}
```

### Custom Components

```typescript
import { View, Text, createTamagui } from 'tamagui'

const CustomCard = createTamagui(View)({
  name: 'CustomCard',
  backgroundColor: '$background',
  padding: '$4',
  borderRadius: '$2',
  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        color: 'white'
      },
      secondary: {
        backgroundColor: '$secondary',
        color: 'white'
      }
    }
  }
})

function MyComponent() {
  return (
    <CustomCard variant="primary">
      <Text>Custom card</Text>
    </CustomCard>
  )
}
```

## Theming

### Theme Configuration

```typescript
import { config } from '@tamagui/config/v3';

export default config({
  themes: {
    light: {
      color: {
        background: '#FFFFFF',
        foreground: '#000000',
        primary: '#007AFF',
      },
    },
    dark: {
      color: {
        background: '#000000',
        foreground: '#FFFFFF',
        primary: '#0A84FF',
      },
    },
  },
});
```

### Theme Switching

```typescript
import { useTheme, setTheme } from 'tamagui'

function ThemeSwitcher() {
  const theme = useTheme()

  const toggleTheme = () => {
    setTheme(theme.name === 'light' ? 'dark' : 'light')
  }

  return <Button onPress={toggleTheme}>Toggle Theme</Button>
}
```

## Animations

### Basic Animation

```typescript
import { AnimatePresence, View } from 'tamagui'

function AnimatedComponent({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <View
          animation="fadeIn"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        >
          <Text>Animated content</Text>
        </View>
      )}
    </AnimatePresence>
  )
}
```

### Custom Animation

```typescript
import { styled } from 'tamagui';

const AnimatedView = styled(View, {
  animation: 'quick',
  variants: {
    active: {
      scale: 1.1,
    },
    inactive: {
      scale: 1,
    },
  },
});
```

## Responsive Design

### Media Queries

```typescript
import { View, Text } from 'tamagui'

function ResponsiveComponent() {
  return (
    <View
      padding="$4"
      $sm={{ padding: '$2' }}
      $md={{ padding: '$3' }}
      $lg={{ padding: '$4' }}
    >
      <Text fontSize="$4" $sm={{ fontSize: '$2' }}>
        Responsive text
      </Text>
    </View>
  )
}
```

## Advanced Patterns

### Compound Components

```typescript
import { createTamagui, createStyledContext } from 'tamagui'

const CardContext = createStyledContext({
  variant: 'primary'
})

const Card = createTamagui(View)({
  name: 'Card',
  context: CardContext,
  backgroundColor: '$background',
  padding: '$4',
  borderRadius: '$2'
})

const CardHeader = createTamagui(Text)({
  name: 'CardHeader',
  context: CardContext,
  fontSize: '$4',
  fontWeight: 'bold'
})

function MyCard() {
  return (
    <Card variant="primary">
      <CardHeader>Card Title</CardHeader>
      <Text>Card content</Text>
    </Card>
  )
}
```

### Platform-Specific Components

```typescript
import { Platform } from 'react-native'
import { View, Text } from 'tamagui'

function PlatformComponent() {
  return (
    <View
      $platform-native={{ backgroundColor: '$background' }}
      $platform-web={{ backgroundColor: '$secondary' }}
    >
      <Text>Platform-specific styling</Text>
    </View>
  )
}
```

## Anti-Patterns

### 1. Not Using Tamagui's Tokens

**BAD**:

```typescript
<View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
```

**GOOD**:

```typescript
<View padding="$4" backgroundColor="$background">
```

**Why**: Tokens provide consistency and easier theming.

### 2. Not Using Variants

**BAD**:

```typescript
const PrimaryButton = styled(Button, {
  backgroundColor: '$primary',
});

const SecondaryButton = styled(Button, {
  backgroundColor: '$secondary',
});
```

**GOOD**:

```typescript
const Button = createTamagui(Button)({
  variants: {
    variant: {
      primary: { backgroundColor: '$primary' },
      secondary: { backgroundColor: '$secondary' },
    },
  },
});
```

**Why**: Variants reduce code duplication and improve maintainability.

### 3. Not Optimizing for Performance

**BAD**:

```typescript
// Using inline styles extensively
```

**GOOD**:

```typescript
// Using styled components and variants
```

**Why**: Styled components are optimized for performance.

### 4. Not Using TypeScript

**BAD**:

```typescript
// JavaScript components
```

**GOOD**:

```typescript
// TypeScript components with proper types
```

**Why**: TypeScript provides type safety and better developer experience.

## Performance Optimization

### 1. Use Extracted Styles

```typescript
const styles = StyleSheet.create({
  container: {
    padding: '$4',
    backgroundColor: '$background',
  },
});
```

### 2. Optimize Re-renders

```typescript
import { memo } from 'react'

const OptimizedComponent = memo(function OptimizedComponent({ data }: { data: any }) {
  return <View>{/* Content */}</View>
})
```

### 3. Use Platform-Specific Code

```typescript
import { Platform } from 'react-native'

function PlatformOptimizedComponent() {
  return Platform.select({
    ios: <IOSComponent />,
    android: <AndroidComponent />
  })
}
```

### 4. Lazy Load Components

```typescript
import { lazy, Suspense } from 'react'

const LazyComponent = lazy(() => import('./LazyComponent'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  )
}
```

## Common Commands

```bash
# Install Tamagui
npm install tamagui @tamagui/config

# Install for web
npm install @tamagui/core

# Install for React Native
npm install @tamagui/core react-native-svg

# Install for Expo
npx expo install tamagui @tamagui/config @tamagui/core react-native-svg
```

## Troubleshooting

### Common Issues

**Styling not working**:

- Check tamagui.config.ts configuration
- Verify theme is applied
- Check for conflicting styles

**Platform-specific issues**:

- Ensure platform-specific dependencies are installed
- Check for platform-specific code
- Verify configuration for each platform

**Performance issues**:

- Optimize component re-renders
- Use memoization
- Check for unnecessary prop drilling

### Debugging

```typescript
// Enable debug mode
const config = {
  debug: true,
};
```

## Best Practices

1. **Use design tokens** for consistency
2. **Leverage variants** for component variations
3. **Use TypeScript** for type safety
4. **Optimize for performance** with memoization
5. **Use platform-specific code** when needed
6. **Implement proper theming** for dark mode
7. **Use animations** sparingly for performance
8. **Test on multiple platforms**
9. **Follow accessibility guidelines**
10. **Keep components small** and focused
11. **Use compound components** for complex UI
12. **Implement responsive design** with media queries
13. **Use server components** when possible
14. **Optimize bundle size**
15. **Follow Tamagui conventions**

## Resources

- [Official Tamagui Documentation](https://tamagui.dev)
- [Tamagui GitHub Repository](https://github.com/tamagui/tamagui)
- [Tamagui Examples](https://tamagui.dev/examples)
- [Tamagui Components](https://tamagui.dev/docs/core/components)
- [Tamagui Styling](https://tamagui.dev/docs/core/styling)
