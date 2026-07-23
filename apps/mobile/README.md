# @life-os/mobile

The cross-platform mobile application for Life OS, built with **Expo** and
**React Native**. It is designed for high-performance offline-first
productivity.

## 🚀 Features

- **Offline-First**: Real-time synchronization with the PostgreSQL backend via
  **PowerSync**.
- **Modern Navigation**: File-based routing using **Expo Router**.
- **Shared UI**: Consistent look and feel using components from `@life-os/ui`
  (Tamagui).
- **Work Management**: Full access to projects, tasks, and time tracking.
- **Calendar**: Integrated calendar views with support for linked tasks.
- **Push Notifications**: (In Development) Integration with Expo Notification
  Service.

## 🛠️ Technology Stack

- **Framework**: [Expo 52](https://expo.dev/)
- **Runtime**: React Native 0.76
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Database (Local)**: SQLite with [PowerSync](https://www.powersync.com/)
- **State Management**: TanStack Query 5 (for remote state)
- **Styling**: [Tamagui](https://tamagui.dev/) via `@life-os/ui`

## 📂 Project Structure

- `app/`: Expo Router file-based pages and layouts.
- `src/lib/`: Mobile-specific utilities and provider configurations.
- `assets/`: Static assets (images, fonts, etc.).

## 🏁 Getting Started

### Prerequisites

- Node.js 24+
- pnpm 11+
- Expo Go (on physical device) or iOS/Android Simulator

### Development

```bash
# Start Expo development server
pnpm dev

# Specific platforms
pnpm ios
pnpm android
```

## 🧪 Testing

```bash
pnpm test
```
