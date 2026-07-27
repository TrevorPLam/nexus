# Expo SDK

## Overview

Expo SDK is a framework for building native iOS and Android applications using React Native. It provides a set of tools, services, and APIs that simplify the development process, allowing developers to build, deploy, and iterate on mobile apps quickly.

## Latest Stable Version

**Version**: `52.0.0` (July 2026)

**Compatibility**:
- React Native: 0.76.0
- iOS: 13.0+
- Android: API 21+ (Android 5.0+)
- Node.js: 18.0.0+, 20.0.0+
- Package Managers: npm, pnpm, yarn

**Key Features**:
- Expo Router for file-based routing
- Expo Modules for native functionality
- Over-the-air (OTA) updates
- Build service (EAS Build)
- Submit to app stores (EAS Submit)
- Development tools (Expo CLI)
- TypeScript support
- Web support

## Core Concepts

- **Expo Go**: Development client for quick iteration
- **Development Builds**: Custom development clients
- **EAS Build**: Cloud build service
- **EAS Submit**: App store submission
- **OTA Updates**: Over-the-air updates
- **Expo Router**: File-based routing
- **Expo Modules**: Native functionality
- **Config**: app.json/app.config.js configuration

## Key Features

- **Quick Start**: Get started in minutes with Expo Go
- **Development Builds**: Custom dev clients with native modules
- **OTA Updates**: Update apps without app store review
- **EAS Build**: Build iOS and Android apps in the cloud
- **EAS Submit**: Submit to app stores automatically
- **Expo Router**: File-based routing similar to Next.js
- **Expo Modules**: Access native functionality
- **TypeScript**: Full TypeScript support
- **Web Support**: Build for web from the same codebase
- **DevTools**: Enhanced debugging and development experience

## Basic Usage

```bash
# Create new Expo app
npx create-expo-app my-app

# Start development server
npx expo start

# Run on device
npx expo start --ios
npx expo start --android
```

## Installation

```bash
# Create new app
npx create-expo-app my-app

# Add to existing project
npm install expo

# Install Expo CLI globally
npm install -g expo-cli
```

## Project Structure

```
my-app/
├── app/                    # Expo Router (file-based routing)
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home screen
│   └── (tabs)/             # Tab navigation
├── assets/                 # Static assets
├── components/             # Shared components
├── hooks/                  # Custom hooks
├── constants/              # App constants
├── app.json                # Expo config
├── package.json
└── tsconfig.json
```

## Configuration

### app.json

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.myapp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.myapp"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### app.config.js

```javascript
export default {
  name: 'My App',
  slug: 'my-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.myapp'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.myapp'
  },
  web: {
    favicon: './assets/favicon.png'
  }
}
```

## Expo Router

### Basic Routing

```typescript
// app/index.tsx
export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to Expo!</Text>
    </View>
  )
}
```

### Dynamic Routes

```typescript
// app/users/[id].tsx
import { useLocalSearchParams, useNavigation } from 'expo-router'

export default function UserDetail() {
  const { id } = useLocalSearchParams()
  const navigation = useNavigation()

  return (
    <View>
      <Text>User ID: {id}</Text>
    </View>
  )
}
```

### Tab Navigation

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  )
}
```

### Stack Navigation

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="users/[id]" options={{ title: 'User' }} />
    </Stack>
  )
}
```

## Expo Modules

### Camera

```bash
npx expo install expo-camera
```

```typescript
import { CameraView, useCameraPermissions } from 'expo-camera'

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()

  if (!permission.granted) {
    return (
      <Button onPress={requestPermission}>
        Grant Permission
      </Button>
    )
  }

  return (
    <CameraView style={{ flex: 1 }}>
      {/* Camera UI */}
    </CameraView>
  )
}
```

### Location

```bash
npx expo install expo-location
```

```typescript
import * as Location from 'expo-location'

async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    return
  }

  const location = await Location.getCurrentPositionAsync({})
  return location
}
```

### Notifications

```bash
npx expo install expo-notifications
```

```typescript
import * as Notifications from 'expo-notifications'

async function scheduleNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hello',
      body: 'This is a notification'
    },
    trigger: { seconds: 5 }
  })
}
```

### Secure Store

```bash
npx expo install expo-secure-store
```

```typescript
import * as SecureStore from 'expo-secure-store'

async function saveToken(token: string) {
  await SecureStore.setItemAsync('authToken', token)
}

async function getToken() {
  return await SecureStore.getItemAsync('authToken')
}
```

## Development Builds

### Create Development Build

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Run Development Build

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## EAS Build

### Production Build

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

### Configuration

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "autoIncrement": true
      }
    }
  }
}
```

## EAS Submit

### Submit to App Stores

```bash
# iOS
eas submit --platform ios --latest

# Android
eas submit --platform android --latest
```

## OTA Updates

### Publish Update

```bash
eas update --branch production --message "Fix login bug"
```

### Configuration

```json
{
  "updates": {
    "url": "https://u.expo.dev/your-project-id"
  }
}
```

## Advanced Patterns

### Custom Hooks

```typescript
import { useState, useEffect } from 'react'
import * as Location from 'expo-location'

function useLocation() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Permission denied')
        return
      }

      const currentLocation = await Location.getCurrentPositionAsync({})
      setLocation(currentLocation)
    })()
  }, [])

  return { location, error }
}
```

### Environment Variables

```typescript
import Constants from 'expo-constants'

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.example.com'
```

### Platform-Specific Code

```typescript
import { Platform } from 'react-native'

function PlatformSpecificComponent() {
  if (Platform.OS === 'ios') {
    return <IOSComponent />
  }
  return <AndroidComponent />
}
```

## Anti-Patterns

### 1. Not Using Expo Router

**BAD**:
```typescript
// Using React Navigation manually
```

**GOOD**:
```typescript
// Using Expo Router for file-based routing
```

**Why**: Expo Router provides better TypeScript support and simpler configuration.

### 2. Not Handling Permissions

**BAD**:
```typescript
const location = await Location.getCurrentPositionAsync({})
```

**GOOD**:
```typescript
const { status } = await Location.requestForegroundPermissionsAsync()
if (status !== 'granted') {
  return
}
const location = await Location.getCurrentPositionAsync({})
```

**Why**: Permissions are required for sensitive features.

### 3. Hardcoding Values

**BAD**:
```typescript
const API_URL = 'https://api.example.com'
```

**GOOD**:
```typescript
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.example.com'
```

**Why**: Environment variables allow different configurations per environment.

### 4. Not Using Development Builds

**BAD**:
```typescript
// Using Expo Go for everything
```

**GOOD**:
```typescript
// Use development builds for native modules
```

**Why**: Development builds support native modules that Expo Go doesn't include.

## Performance Optimization

### 1. Use Memoization

```typescript
import { useMemo } from 'react'

const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])
```

### 2. Optimize Images

```typescript
import { Image } from 'expo-image'

<Image
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 200, height: 200 }}
  contentFit="cover"
/>
```

### 3. Use Fast Refresh

Expo automatically supports Fast Refresh for React components.

### 4. Lazy Loading

```typescript
import { Suspense } from 'react'
import { lazy } from 'react'

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
# Create new app
npx create-expo-app my-app

# Start development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android

# Build development build
eas build --profile development --platform ios

# Build production build
eas build --profile production --platform ios

# Submit to app store
eas submit --platform ios

# Publish OTA update
eas update --branch production

# Install Expo module
npx expo install expo-camera
```

## Troubleshooting

### Common Issues

**Metro bundler errors**:
- Clear cache: `npx expo start -c`
- Restart development server
- Check for TypeScript errors

**Build failures**:
- Check EAS configuration
- Verify environment variables
- Review build logs

**Module not found**:
- Install missing modules
- Check package.json
- Clear node_modules and reinstall

### Debugging

```bash
# Enable debug mode
npx expo start --dev

# Check logs
npx expo start --tunnel
```

## Best Practices

1. **Use Expo Router** for file-based routing
2. **Handle permissions** properly
3. **Use environment variables** for configuration
4. **Test on real devices** frequently
5. **Use development builds** for native modules
6. **Optimize images** for performance
7. **Use TypeScript** for type safety
8. **Implement error boundaries**
9. **Test OTA updates** before production
10. **Use EAS Build** for consistent builds
11. **Keep dependencies updated**
12. **Use Fast Refresh** during development
13. **Monitor app performance**
14. **Test on multiple devices**
15. **Follow Expo guidelines** for best practices

## Resources

- [Official Expo Documentation](https://docs.expo.dev)
- [Expo GitHub Repository](https://github.com/expo/expo)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction)
