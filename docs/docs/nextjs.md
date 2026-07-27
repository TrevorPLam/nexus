# Next.js

## Overview

Next.js is a React framework for building full-stack web applications. It provides features like server-side rendering, static site generation, file-based routing, API routes, and optimized performance out of the box.

## Latest Stable Version

**Version**: `16.0.0` (July 2026)

**Compatibility**:
- Node.js: 18.18.0+, 20.0.0+, 22.0.0+
- Browsers: Modern browsers (Chrome, Firefox, Safari, Edge)
- Package Managers: npm, pnpm, yarn, bun

**Key Features**:
- App Router (React Server Components)
- Server-Side Rendering (SSR)
- Static Site Generation (SSG)
- File-based routing
- API routes
- Image optimization
- Font optimization
- Built-in CSS support
- TypeScript support
- Edge runtime support

## Core Concepts

- **App Router**: New routing system using React Server Components
- **Server Components**: Components that render on the server
- **Client Components**: Components that render on the client
- **Server Actions**: Server-side functions called from client components
- **Route Handlers**: API endpoints
- **Middleware**: Request/response modification
- **Static Generation**: Pre-rendering at build time
- **Server-Side Rendering**: Rendering on each request
- **Incremental Static Regeneration**: Updating static content

## Key Features

- **React Server Components**: Reduced client bundle size
- **File-based Routing**: Automatic route generation
- **API Routes**: Build API endpoints
- **Image Optimization**: Automatic image optimization
- **Font Optimization**: Automatic font optimization
- **TypeScript Support**: Built-in TypeScript support
- **CSS Support**: CSS Modules, Tailwind CSS, and more
- **Edge Runtime**: Run on edge networks
- **Server Actions**: Direct server function calls
- **Streaming**: Progressive rendering

## Basic Usage

```bash
# Create new Next.js app
npx create-next-app@latest my-app

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Installation

```bash
# Create new app
npx create-next-app@latest my-app

# Add to existing project
npm install next@latest react@latest react-dom@latest
```

## Project Structure

```
my-app/
├── app/                    # App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── about/             # About route
│   │   └── page.tsx
│   └── api/               # API routes
│       └── hello/
│           └── route.ts
├── public/                # Static assets
├── components/            # Shared components
├── lib/                   # Utility functions
├── next.config.js         # Next.js config
├── tsconfig.json          # TypeScript config
└── package.json
```

## App Router

### Pages

```typescript
// app/page.tsx
export default function Home() {
  return (
    <main>
      <h1>Welcome to Next.js</h1>
    </main>
  )
}
```

### Dynamic Routes

```typescript
// app/posts/[id]/page.tsx
export default function Post({ params }: { params: { id: string } }) {
  return <div>Post {params.id}</div>
}
```

### Layouts

```typescript
// app/layout.tsx
export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav>Navigation</nav>
        {children}
      </body>
    </html>
  )
}
```

### Loading States

```typescript
// app/loading.tsx
export default function Loading() {
  return <div>Loading...</div>
}
```

### Error Handling

```typescript
// app/error.tsx
'use client'

export default function Error({
  error,
  reset
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

## Server Components vs Client Components

### Server Components (Default)

```typescript
// app/page.tsx (Server Component)
async function getData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.title}</div>
}
```

### Client Components

```typescript
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

## Data Fetching

### Server-Side Fetching

```typescript
// app/page.tsx
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    cache: 'force-cache' // or 'no-store', 'no-cache'
  })
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.title}</div>
}
```

### Client-Side Fetching

```typescript
'use client'

import { useEffect, useState } from 'react'

export default function DataFetcher() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('https://api.example.com/data')
      .then(res => res.json())
      .then(setData)
  }, [])

  return <div>{data?.title}</div>
}
```

## Server Actions

### Form Actions

```typescript
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  // Process data
}

// app/page.tsx
import { createPost } from './actions'

export default function Page() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  )
}
```

## API Routes

### Route Handlers

```typescript
// app/api/hello/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Hello' })
}

export async function POST(request: Request) {
  const body = await request.json()
  return NextResponse.json({ received: body })
}
```

## Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Modify request/response
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}
```

## Advanced Patterns

### Streaming

```typescript
// app/page.tsx
async function getData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <DataComponent data={data} />
      </Suspense>
    </div>
  )
}
```

### Route Groups

```
app/
├── (marketing)/
│   ├── about/
│   └── contact/
└── (dashboard)/
    ├── settings/
    └── profile/
```

### Parallel Routes

```
app/
├── @team/
│   └── page.tsx
├── @analytics/
│   └── page.tsx
└── layout.tsx
```

### Intercepting Routes

```
app/
├── feed/
│   └── [id]/
│       └── page.tsx
├── photo/
│   └── [id]/
│       └── page.tsx
└── @modal/
    └── [id]/
        └── page.tsx
```

## Anti-Patterns

### 1. Using Client Components Unnecessarily

**BAD**:
```typescript
'use client'

export default function StaticContent() {
  return <div>Static content</div>
}
```

**GOOD**:
```typescript
export default function StaticContent() {
  return <div>Static content</div>
}
```

**Why**: Server components reduce client bundle size.

### 2. Fetching Data in Client Components

**BAD**:
```typescript
'use client'

export default function DataComponent() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/data').then(setData)
  }, [])
  return <div>{data}</div>
}
```

**GOOD**:
```typescript
async function getData() {
  const res = await fetch('/api/data')
  return res.json()
}

export default async function DataComponent() {
  const data = await getData()
  return <div>{data}</div>
}
```

**Why**: Server-side fetching is faster and more efficient.

### 3. Not Using Loading States

**BAD**:
```typescript
export default async function Page() {
  const data = await getData()
  return <div>{data}</div>
}
```

**GOOD**:
```typescript
// app/loading.tsx
export default function Loading() {
  return <div>Loading...</div>
}

// app/page.tsx
export default async function Page() {
  const data = await getData()
  return <div>{data}</div>
}
```

**Why**: Loading states improve user experience.

### 4. Not Optimizing Images

**BAD**:
```typescript
<img src="/image.jpg" alt="Image" />
```

**GOOD**:
```typescript
import Image from 'next/image'

<Image src="/image.jpg" alt="Image" width={500} height={300} />
```

**Why**: Next.js Image component optimizes images automatically.

### 5. Using useEffect for Initialization

**BAD**:
```typescript
'use client'

export default function Component() {
  useEffect(() => {
    // Initialization logic
  }, [])
  return <div>Content</div>
}
```

**GOOD**:
```typescript
'use client'

export default function Component() {
  // Initialization logic
  return <div>Content</div>
}
```

**Why**: Server components handle initialization better.

## Performance Optimization

### 1. Use Server Components

Default to server components for better performance.

### 2. Optimize Images

```typescript
import Image from 'next/image'

<Image src="/image.jpg" alt="Image" width={500} height={300} />
```

### 3. Use Streaming

```typescript
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

### 4. Cache Data

```typescript
const res = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // Cache for 1 hour
})
```

### 5. Use Static Generation

```typescript
export const dynamic = 'force-static'
```

## Configuration

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['example.com']
  },
  experimental: {
    serverActions: true
  }
}

module.exports = nextConfig
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Common Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint

# Type check
npm run typecheck

# Create new app
npx create-next-app@latest my-app
```

## Troubleshooting

### Common Issues

**Build errors**:
- Check for circular dependencies
- Verify TypeScript configuration
- Ensure all imports are correct

**Routing issues**:
- Check file structure
- Verify dynamic route syntax
- Ensure layouts are correct

**Performance issues**:
- Use server components
- Optimize images
- Cache data appropriately

### Debugging

```bash
# Build with debug output
npm run build --debug

# Check build analysis
npm run build --analyze
```

## Best Practices

1. **Use server components by default**
2. **Optimize images with next/image**
3. **Use loading states for async operations**
4. **Cache data appropriately**
5. **Use static generation when possible**
6. **Implement error boundaries**
7. **Use TypeScript for type safety**
8. **Organize routes logically**
9. **Use API routes for backend logic**
10. **Implement middleware for auth**
11. **Use environment variables for secrets**
12. **Optimize bundle size**
13. **Use incremental static regeneration**
14. **Test on different devices**
15. **Monitor performance metrics**

## Resources

- [Official Next.js Documentation](https://nextjs.org/docs)
- [Next.js GitHub Repository](https://github.com/vercel/next.js)
- [App Router Documentation](https://nextjs.org/docs/app)
- [API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
