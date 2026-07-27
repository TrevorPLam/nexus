# Tailwind CSS

## Overview

Tailwind CSS is a utility-first CSS framework that provides low-level utility
classes to build custom designs directly in your markup. It enables rapid UI
development without leaving your HTML, offering complete control over component
styling.

## Latest Stable Version

**Version**: `4.3.3` (July 2026)

**Compatibility**:

- Browsers: Chrome, Firefox, Safari, Edge (modern versions)
- Node.js: 18.0.0+, 20.0.0+
- Package Managers: npm, pnpm, yarn, bun
- Frameworks: React, Vue, Svelte, Angular, Next.js, Nuxt, SvelteKit

**Key Features**:

- Utility-first approach
- Responsive design
- Dark mode support
- Custom configuration
- JIT compiler for performance
- Plugin ecosystem
- Framework integration
- TypeScript support

## Core Concepts

- **Utility Classes**: Low-level CSS classes for styling
- **Responsive Design**: Mobile-first responsive modifiers
- **Dark Mode**: Dark mode support via class or media query
- **Configuration**: Customizable design tokens
- **Plugins**: Extensible plugin system
- **JIT Compiler**: Just-in-time compilation for performance
- **Variants**: Hover, focus, active, and other state variants
- **Custom Values**: Arbitrary values for unique designs

## Key Features

- **Utility-First**: Build designs without writing custom CSS
- **Responsive**: Mobile-first responsive design
- **Dark Mode**: Built-in dark mode support
- **Customizable**: Extensive configuration options
- **Performance**: JIT compiler for fast builds
- **Plugins**: Rich plugin ecosystem
- **Framework Integration**: Works with all major frameworks
- **TypeScript**: Full TypeScript support
- **IntelliSense**: Excellent IDE support

## Basic Usage

```bash
# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer

# Initialize configuration
npx tailwindcss init -p
```

## Installation

### Basic Installation

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Framework-Specific Installation

**Next.js**:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Vite**:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**React Native**:

```bash
npm install -D tailwindcss nativewind
```

## Configuration

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

### postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## Basic Styling

### Utility Classes

```html
<div class="bg-blue-500 text-white p-4 rounded-lg">
  <h1 class="text-2xl font-bold">Hello Tailwind</h1>
  <p class="mt-2 text-gray-100">Utility-first CSS</p>
</div>
```

### Responsive Design

```html
<div class="bg-blue-500 p-4 md:p-8 lg:p-12">
  <h1 class="text-xl md:text-2xl lg:text-3xl">Responsive Text</h1>
</div>
```

### Dark Mode

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <h1 class="text-2xl font-bold">Dark Mode Support</h1>
</div>
```

## Advanced Patterns

### Custom Components

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
      },
    },
  },
};
```

### Custom Utilities

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      textShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.text-shadow': {
          textShadow: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
        },
      });
    },
  ],
};
```

### Variants

```html
<button
  class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  Click me
</button>
```

### Arbitrary Values

```html
<div class="w-[137px] h-[42px] bg-[#1da1f2]">Arbitrary values</div>
```

## Framework Integration

### Next.js

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Vite

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### React Native

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./App.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## Plugins

### Common Plugins

```bash
npm install -D @tailwindcss/forms @tailwindcss/typography @tailwindcss/aspect-ratio
```

```javascript
// tailwind.config.js
export default {
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
```

### Forms Plugin

```html
<form class="space-y-4">
  <input
    class="border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
  />
  <button class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
    Submit
  </button>
</form>
```

### Typography Plugin

```html
<article class="prose prose-lg prose-headings:underline prose-a:text-blue-600">
  <h1>Article Title</h1>
  <p>Article content with beautiful typography.</p>
</article>
```

## Anti-Patterns

### 1. Not Using Responsive Design

**BAD**:

```html
<div class="w-full p-8">
  <h1 class="text-2xl">Not responsive</h1>
</div>
```

**GOOD**:

```html
<div class="w-full p-4 md:p-8">
  <h1 class="text-xl md:text-2xl lg:text-3xl">Responsive</h1>
</div>
```

**Why**: Responsive design ensures good UX on all devices.

### 2. Not Using Dark Mode

**BAD**:

```html
<div class="bg-white text-gray-900">
  <h1>No dark mode</h1>
</div>
```

**GOOD**:

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <h1>Dark mode support</h1>
</div>
```

**Why**: Dark mode is expected by users and improves accessibility.

### 3. Overusing Arbitrary Values

**BAD**:

```html
<div class="w-[137px] h-[42px] bg-[#1da1f2]">Too many arbitrary values</div>
```

**GOOD**:

```html
<div class="w-32 h-10 bg-blue-500">Using design tokens</div>
```

**Why**: Design tokens provide consistency and maintainability.

### 4. Not Extracting Components

**BAD**:

```html
<div class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
  Repeated button styles
</div>
```

**GOOD**:

```html
<button class="btn-primary">Button</button>
```

```css
@layer components {
  .btn-primary {
    @apply bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600;
  }
}
```

**Why**: Component extraction reduces duplication and improves maintainability.

## Performance Optimization

### 1. Enable JIT Mode

Tailwind CSS v3+ uses JIT mode by default for better performance.

### 2. Purge Unused Styles

```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
};
```

### 3. Use CSS Variables

```html
<div class="bg-[var(--primary-color)]">CSS variable usage</div>
```

### 4. Optimize Build Process

```javascript
// tailwind.config.js
export default {
  corePlugins: {
    preflight: false, // Disable preflight if not needed
  },
};
```

## Common Commands

```bash
# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer

# Initialize configuration
npx tailwindcss init -p

# Build CSS
npx tailwindcss -i ./src/input.css -o ./dist/output.css

# Watch for changes
npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch

# Minify output
npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify
```

## Troubleshooting

### Common Issues

**Styles not applying**:

- Check content paths in tailwind.config.js
- Verify PostCSS configuration
- Ensure CSS file is imported

**Build performance**:

- Enable JIT mode
- Optimize content paths
- Disable unused plugins

**Framework integration**:

- Follow framework-specific setup
- Check for conflicting CSS
- Verify configuration paths

### Debugging

```javascript
// tailwind.config.js
export default {
  debug: true, // Enable debug mode
};
```

## Best Practices

1. **Use responsive design** for all components
2. **Implement dark mode** for better accessibility
3. **Extract components** to reduce duplication
4. **Use design tokens** for consistency
5. **Organize utilities** logically
6. **Use plugins** for common patterns
7. **Optimize content paths** for performance
8. **Use CSS variables** for dynamic values
9. **Follow naming conventions**
10. **Test on multiple devices**
11. **Use semantic HTML** with utility classes
12. **Keep HTML readable** with proper formatting
13. **Use variants** for interactive states
14. **Leverage JIT mode** for performance
15. **Document custom utilities** for team understanding

## Resources

- [Official Tailwind CSS Documentation](https://tailwindcss.com)
- [Tailwind CSS GitHub Repository](https://github.com/tailwindlabs/tailwindcss)
- [Tailwind CSS Plugins](https://tailwindcss.com/docs/plugins)
- [Tailwind UI Components](https://tailwindui.com)
- [Headless UI](https://headlessui.com)
