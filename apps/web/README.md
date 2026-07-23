# @life-os/web

The modern web application for Life OS, built with **Next.js 16** and **React 18**. It provides a rich desktop-class experience for managing work and calendar data.

## 🚀 Features

- **Modern Architecture**: Built with Next.js **App Router** for optimized performance.
- **Dynamic UI**: Responsive and accessible components using `@life-os/ui` and **Tailwind CSS 4**.
- **State Management**: Robust server-state handling with **TanStack Query 5**.
- **Data Visualization**: Rich views for work projects, tasks, and calendar events.
- **Work Management**: Comprehensive interface for organizing projects and tracking tasks.
- **Calendar**: Full-featured calendar view with drag-and-drop support (via `@dnd-kit`).

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Runtime**: React 18
- **State Management**: [TanStack Query 5](https://tanstack.com/query/latest)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)

## 📂 Project Structure

- `src/app/`: Next.js App Router pages, layouts, and components.
- `src/components/`: Web-specific UI components.
- `src/hooks/`: Custom React hooks for data fetching and UI logic.
- `public/`: Static assets.

## 🏁 Getting Started

### Prerequisites

- Node.js 24+
- pnpm 11+

### Development

```bash
pnpm dev
```

The web app will be available at `http://localhost:3000`.

### Building

```bash
pnpm build
```

## 🧪 Testing

```bash
pnpm test
```
