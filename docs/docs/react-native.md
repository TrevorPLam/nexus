# React Native

## Overview

React Native is a framework for building native mobile applications using React. It allows developers to use React along with native platform capabilities to build iOS and Android apps from a single codebase while delivering truly native performance and feel.

## Latest Stable Version

**Version**: `0.76.0` (July 2026)

**Compatibility**:
- iOS: 13.0+ (iOS 13+)
- Android: API 21+ (Android 5.0+)
- Node.js: 18.0.0+, 20.0.0+
- Package Managers: npm, pnpm, yarn

**Key Features**:
- Cross-platform development
- Native performance
- Hot reloading
- JavaScriptCore/Hermes engine
- Native modules
- Debugging tools
- TypeScript support
- Platform-specific code

## Core Concepts

- **Components**: Building blocks of React Native apps
- **Props**: Data passed to components
- **State**: Component-specific data
- **Native Modules**: Bridge to native platform APIs
- **Style**: JavaScript-based styling
- **Layout**: Flexbox-based layout system
- **Navigation**: Screen navigation and routing
- **Platform**: Platform-specific code

## Key Features

- **Cross-Platform**: Write once, run on iOS and Android
- **Native Performance**: Uses native components and APIs
- **Hot Reloading**: See changes instantly without recompiling
- **JavaScriptCore**: Fast JavaScript execution
- **Hermes Engine**: Optimized JavaScript engine
- **Native Modules**: Access native platform features
- **Flexbox Layout**: CSS-like layout system
- **TypeScript**: Full TypeScript support
- **Debugging**: Chrome DevTools and Flipper

## Basic Usage

```bash
# Create new React Native app
npx react-native@latest init MyApp

# Start Metro bundler
npx react-native start

# Run on iOS
npx react-native run-ios

# Run on Android
npx react-native run-android
```

## Installation

```bash
# Create new app
npx react-native@latest init MyApp

# Or use Expo
npx create-expo-app MyApp

# Install dependencies
npm install
```

## Project Structure

```
MyApp/
├── android/                # Android native code
├── ios/                    # iOS native code
├── src/                    # Source code
│   ├── components/         # Reusable components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation configuration
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript types
├── App.tsx                 # Root component
├── package.json
├── tsconfig.json
└── metro.config.js
```

## Components

### Basic Component

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

function Greeting({ name }: { name: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello, {name}!</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold'
  }
})

export default Greeting
```

### ScrollView

```typescript
import { ScrollView, Text, View } from 'react-native'

function ScrollableList() {
  return (
    <ScrollView>
      {Array.from({ length: 50 }).map((_, i) => (
        <View key={i} style={{ padding: 20, borderBottomWidth: 1 }}>
          <Text>Item {i}</Text>
        </View>
      ))}
    </ScrollView>
  )
}
```

### FlatList

```typescript
import { FlatList, Text, View } from 'react-native'

function EfficientList() {
  const data = Array.from({ length: 100 }).map((_, i) => ({ id: i, title: `Item ${i}` }))

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View style={{ padding: 20, borderBottomWidth: 1 }}>
          <Text>{item.title}</Text>
        </View>
      )}
    />
  )
}
```

## Styling

### StyleSheet

```typescript
import { StyleSheet, View, Text } from 'react-native'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  }
})

function StyledComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Styled Text</Text>
    </View>
  )
}
```

### Inline Styles

```typescript
function InlineStyledComponent() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, color: 'blue' }}>Inline Styled</Text>
    </View>
  )
}
```

### Platform-Specific Styles

```typescript
import { Platform, StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        backgroundColor: '#f0f0f0'
      },
      android: {
        backgroundColor: '#e0e0e0'
      }
    })
  }
})
```

## Navigation

### React Navigation

```bash
npm install @react-navigation/native @react-navigation/native-stack
```

```typescript
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

const Stack = createNativeStackNavigator()

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

### Tab Navigation

```bash
npm install @react-navigation/bottom-tabs
```

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

const Tab = createBottomTabNavigator()

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}
```

## Hooks

### useState

```typescript
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
    </View>
  )
}
```

### useEffect

```typescript
import { useState, useEffect } from 'react'

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchUser(userId).then(setUser)
  }, [userId])

  if (!user) return <Text>Loading...</Text>

  return <Text>{user.name}</Text>
}
```

### useLayoutEffect

```typescript
import { useLayoutEffect } from 'react'

function ScreenWithHeader({ navigation }: any) {
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'My Screen' })
  }, [navigation])

  return <View>{/* Content */}</View>
}
```

## Platform-Specific Code

### Platform Module

```typescript
import { Platform, View, Text } from 'react-native'

function PlatformComponent() {
  return (
    <View>
      {Platform.OS === 'ios' && <Text>iOS Component</Text>}
      {Platform.OS === 'android' && <Text>Android Component</Text>}
    </View>
  )
}
```

### Platform-Specific Files

```
Component.ios.tsx
Component.android.tsx
```

## Native Modules

### Creating a Native Module

```typescript
// NativeModule.ts
import { NativeModules, Platform } from 'react-native'

const { NativeModule } = NativeModules

export default NativeModule
```

### Using Native Module

```typescript
import NativeModule from './NativeModule'

function Component() {
  const callNativeFunction = async () => {
    const result = await NativeModule.someFunction()
    console.log(result)
  }

  return <Button title="Call Native" onPress={callNativeFunction} />
}
```

## Advanced Patterns

### Custom Hooks

```typescript
import { useState, useEffect } from 'react'

function useLocation() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const position = await Geolocation.getCurrentPosition()
        setLocation(position)
      } catch (err) {
        setError(err)
      }
    })()
  }, [])

  return { location, error }
}
```

### Context API

```typescript
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext('light')

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light')

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  return useContext(ThemeContext)
}
```

### Error Boundaries

```typescript
import React, { Component } from 'react'

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <Text>Something went wrong.</Text>
    }
    return this.props.children
  }
}
```

## Anti-Patterns

### 1. Not Using FlatList for Long Lists

**BAD**:
```typescript
{longArray.map(item => <Item key={item.id} item={item} />)}
```

**GOOD**:
```typescript
<FlatList
  data={longArray}
  renderItem={({ item }) => <Item item={item} />}
  keyExtractor={(item) => item.id}
/>
```

**Why**: FlatList provides virtualization for better performance.

### 2. Inline Functions in Render

**BAD**:
```typescript
<Button onPress={() => console.log('pressed')} />
```

**GOOD**:
```typescript
const handlePress = useCallback(() => {
  console.log('pressed')
}, [])

<Button onPress={handlePress} />
```

**Why**: Inline functions cause unnecessary re-renders.

### 3. Not Using Platform-Specific Code

**BAD**:
```typescript
// Same code for both platforms
```

**GOOD**:
```typescript
// Platform-specific implementations
```

**Why**: Platform-specific code provides better UX.

### 4. Ignoring Safe Areas

**BAD**:
```typescript
<View style={{ flex: 1 }}>
  {/* Content */}
</View>
```

**GOOD**:
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function SafeComponent() {
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* Content */}
    </View>
  )
}
```

**Why**: Safe areas prevent content from being hidden by notches and bars.

## Performance Optimization

### 1. Use Memoization

```typescript
import { memo, useMemo } from 'react'

const ExpensiveComponent = memo(function ExpensiveComponent({ data }: { data: any }) {
  const processedData = useMemo(() => {
    return heavyProcessing(data)
  }, [data])

  return <List data={processedData} />
})
```

### 2. Optimize Images

```typescript
import { Image } from 'react-native'

<Image
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 200, height: 200 }}
  resizeMode="cover"
/>
```

### 3. Use Hermes

```typescript
// In metro.config.js
module.exports = {
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx'],
  },
}
```

### 4. Enable Fast Refresh

React Native supports Fast Refresh by default.

## Common Commands

```bash
# Create new app
npx react-native@latest init MyApp

# Start Metro
npx react-native start

# Run on iOS
npx react-native run-ios

# Run on Android
npx react-native run-android

# Clean build
npx react-native clean

# Link native dependencies
npx react-native link

# Install pods (iOS)
cd ios && pod install
```

## Troubleshooting

### Common Issues

**Metro bundler errors**:
- Clear cache: `npx react-native start --reset-cache`
- Restart Metro bundler
- Check for TypeScript errors

**Build failures**:
- Clean build folder
- Reinstall dependencies
- Check native module compatibility

**Navigation issues**:
- Verify navigation structure
- Check screen names
- Ensure proper navigation setup

### Debugging

```bash
# Enable debug mode
npx react-native start --debug

# Check logs
npx react-native log-ios
npx react-native log-android
```

## Best Practices

1. **Use FlatList** for long lists
2. **Memoize expensive components**
3. **Use useCallback** for event handlers
4. **Handle platform differences** appropriately
5. **Use safe areas** for proper layout
6. **Optimize images** for performance
7. **Use TypeScript** for type safety
8. **Implement error boundaries**
9. **Test on real devices** frequently
10. **Use proper navigation** patterns
11. **Handle permissions** properly
12. **Optimize bundle size**
13. **Use Hermes** for better performance
14. **Keep components small** and focused
15. **Follow React Native** guidelines

## Resources

- [Official React Native Documentation](https://reactnative.dev)
- [React Native GitHub Repository](https://github.com/facebook/react-native)
- [React Navigation Documentation](https://reactnavigation.org)
- [React Native Elements](https://reactnativeelements.com)
- [Ignite CLI](https://github.com/infinitered/ignite)
