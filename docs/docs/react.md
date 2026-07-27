# React

## Overview

React is a JavaScript library for building user interfaces. It enables
developers to create reusable UI components and efficiently update the DOM using
a virtual DOM. React is component-based, declarative, and supports both
client-side and server-side rendering.

## Latest Stable Version

**Version**: `18.3.0` (July 2026)

**Compatibility**:

- Browsers: Chrome, Firefox, Safari, Edge (modern versions)
- Node.js: 12.0.0+ (for build tools)
- Package Managers: npm, pnpm, yarn, bun

**Key Features**:

- Component-based architecture
- Virtual DOM for efficient updates
- JSX syntax
- Hooks for state and side effects
- Server Components (React 18+)
- Concurrent rendering
- Suspense for data fetching
- Context API for state management

## Core Concepts

- **Components**: Reusable UI building blocks
- **Props**: Data passed to components
- **State**: Component-specific data
- **Hooks**: Functions for adding features to components
- **Virtual DOM**: In-memory representation of the DOM
- **JSX**: Syntax extension for JavaScript
- **Context**: Global state management
- **Suspense**: Handling async operations

## Key Features

- **Component-Based**: Build encapsulated components
- **Declarative**: Describe what UI should look like
- **Learn Once, Write Anywhere**: Use on web, mobile, desktop
- **Virtual DOM**: Efficient DOM updates
- **Hooks**: Add state and lifecycle features
- **Server Components**: Render on the server
- **Concurrent Rendering**: Better performance
- **Suspense**: Handle loading states
- **Context API**: Avoid prop drilling

## Basic Usage

```bash
# Install React
npm install react react-dom

# Create React app
npx create-react-app my-app

# Or use Vite
npm create vite@latest my-app -- --template react
```

## Installation

```bash
# Basic installation
npm install react react-dom

# TypeScript types
npm install -D @types/react @types/react-dom
```

## Components

### Functional Components

```typescript
import React from 'react'

function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>
}

export default Greeting
```

### Arrow Function Components

```typescript
const Greeting = ({ name }: { name: string }) => {
  return <h1>Hello, {name}!</h1>
}

export default Greeting
```

## Hooks

### useState

```typescript
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
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

  if (!user) return <div>Loading...</div>

  return <div>{user.name}</div>
}
```

### useContext

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

### useReducer

```typescript
import { useReducer } from 'react'

type State = { count: number }
type Action = { type: 'increment' } | { type: 'decrement' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    case 'decrement':
      return { count: state.count - 1 }
    default:
      return state
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 })

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  )
}
```

### useCallback

```typescript
import { useState, useCallback } from 'react'

function Parent() {
  const [count, setCount] = useState(0)

  const handleClick = useCallback(() => {
    setCount(c => c + 1)
  }, [])

  return <Child onClick={handleClick} />
}
```

### useMemo

```typescript
import { useState, useMemo } from 'react'

function ExpensiveComponent({ data }: { data: any[] }) {
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.id - b.id)
  }, [data])

  return <div>{sortedData.map(item => <div key={item.id}>{item.name}</div>)}</div>
}
```

### useRef

```typescript
import { useRef, useEffect } from 'react'

function InputFocus() {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return <input ref={inputRef} />
}
```

## Advanced Patterns

### Custom Hooks

```typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

### Compound Components

```typescript
function Tabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

function Tab({ children, index }: { children: React.ReactNode; index: number }) {
  const { activeTab, setActiveTab } = useTabs()

  return (
    <button onClick={() => setActiveTab(index)}>
      {children}
    </button>
  )
}
```

### Render Props

```typescript
function Mouse({ children }: { children: (position: { x: number; y: number }) => React.ReactNode }) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  return (
    <div onMouseMove={(e) => setPosition({ x: e.clientX, y: e.clientY })}>
      {children(position)}
    </div>
  )
}
```

### Higher-Order Components

```typescript
function withLoading<P extends object>(Component: React.ComponentType<P>) {
  return (props: P & { loading?: boolean }) => {
    if (props.loading) {
      return <div>Loading...</div>
    }
    return <Component {...props} />
  }
}
```

## Server Components

### Server Component

```typescript
// Server Component (default)
async function UserList() {
  const users = await fetchUsers()
  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  )
}
```

### Client Component

```typescript
'use client'

import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

## Anti-Patterns

### 1. Mutating State Directly

**BAD**:

```typescript
const [count, setCount] = useState(0);
count++; // Direct mutation
```

**GOOD**:

```typescript
const [count, setCount] = useState(0);
setCount(count + 1); // Proper update
```

**Why**: Direct mutations won't trigger re-renders.

### 2. Using Index as Key

**BAD**:

```typescript
{items.map((item, index) => <div key={index}>{item.name}</div>)}
```

**GOOD**:

```typescript
{items.map(item => <div key={item.id}>{item.name}</div>)}
```

**Why**: Index keys can cause issues with list reordering.

### 3. Not Cleaning Up Effects

**BAD**:

```typescript
useEffect(() => {
  const interval = setInterval(() => console.log('tick'), 1000);
  // No cleanup
}, []);
```

**GOOD**:

```typescript
useEffect(() => {
  const interval = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(interval);
}, []);
```

**Why**: Cleanup prevents memory leaks and unintended behavior.

### 4. Overusing Context

**BAD**:

```typescript
// Using context for everything
```

**GOOD**:

```typescript
// Use context for truly global state, props for component-specific data
```

**Why**: Overusing context causes unnecessary re-renders.

### 5. Not Using useMemo/useCallback

**BAD**:

```typescript
function Parent() {
  const handleClick = () => {
    // Expensive calculation recreated on every render
  }
  return <Child onClick={handleClick} />
}
```

**GOOD**:

```typescript
function Parent() {
  const handleClick = useCallback(() => {
    // Memoized
  }, [])
  return <Child onClick={handleClick} />
}
```

**Why**: Memoization prevents unnecessary re-renders.

## Performance Optimization

### 1. Use React.memo

```typescript
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }: { data: any }) {
  return <div>{data}</div>
})
```

### 2. Lazy Loading

```typescript
import { lazy, Suspense } from 'react'

const LazyComponent = lazy(() => import('./LazyComponent'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  )
}
```

### 3. Virtualization

```typescript
import { FixedSizeList } from 'react-window'

function VirtualizedList({ items }: { items: any[] }) {
  return (
    <FixedSizeList
      height={400}
      itemCount={items.length}
      itemSize={35}
      width={300}
    >
      {({ index, style }) => <div style={style}>{items[index].name}</div>}
    </FixedSizeList>
  )
}
```

### 4. Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./Home'));
const About = lazy(() => import('./About'));
```

## Testing

### Testing Library

```bash
npm install -D @testing-library/react @testing-library/jest-dom
```

```typescript
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

test('renders greeting', () => {
  render(<Greeting name="World" />)
  expect(screen.getByText('Hello, World!')).toBeInTheDocument()
})
```

## Common Commands

```bash
# Create React app
npx create-react-app my-app

# Create Vite app
npm create vite@latest my-app -- --template react

# Install React
npm install react react-dom

# Install TypeScript types
npm install -D @types/react @types/react-dom
```

## Troubleshooting

### Common Issues

**Component not re-rendering**:

- Check if state is being updated correctly
- Verify hooks are called at the top level
- Ensure proper dependency arrays in useEffect

**Memory leaks**:

- Clean up effects in useEffect
- Remove event listeners
- Clear intervals/timeouts

**Performance issues**:

- Use React.memo for expensive components
- Implement virtualization for long lists
- Use useMemo/useCallback appropriately

### Debugging

```typescript
// React DevTools
import { Profiler } from 'react'

<Profiler id="App" onRender={(id, phase, actualDuration) => {
  console.log({ id, phase, actualDuration })
}}>
  <App />
</Profiler>
```

## Best Practices

1. **Use functional components** with hooks
2. **Keep components small** and focused
3. **Use TypeScript** for type safety
4. **Follow hooks rules** - only call at top level
5. **Clean up effects** to prevent memory leaks
6. **Use proper keys** in lists
7. **Avoid prop drilling** with context
8. **Memoize expensive operations**
9. **Lazy load components** when possible
10. **Use error boundaries** for error handling
11. **Test components** with Testing Library
12. **Follow naming conventions**
13. **Separate concerns** - logic vs presentation
14. **Use composition** over inheritance
15. **Keep dependencies** minimal

## Resources

- [Official React Documentation](https://react.dev)
- [React GitHub Repository](https://github.com/facebook/react)
- [React Hooks Documentation](https://react.dev/reference/react)
- [Testing Library Documentation](https://testing-library.com/react)
- [React DevTools](https://react.dev/learn/react-developer-tools)
