# Prettier

## Overview

Prettier is an opinionated code formatter that enforces a consistent style across your codebase. It parses your code and reprints it with its own rules, taking the maximum line length into account and wrapping code when necessary.

## Latest Stable Version

**Version**: `3.9.6` (July 2026)

**Compatibility**:
- Node.js: 14.17.0+
- Browsers: Not applicable (CLI tool)
- Package Managers: npm, pnpm, yarn, bun

**Key Features**:
- Zero configuration with sensible defaults
- Integrates with most editors
- Supports JavaScript, TypeScript, JSX, CSS, HTML, JSON, and more
- Automatic code formatting on save
- Minimal configuration options

## Core Concepts

- **Opinionated Formatting**: Prettier has few options; it enforces a consistent style
- **Parsing**: Code is parsed into an AST, then reformatted
- **Print Width**: Maximum line length (default 80)
- **Tab Width**: Number of spaces per indentation level
- **Semicolons**: Whether to add semicolons at the end of statements
- **Quotes**: Single vs double quotes
- **Trailing Commas**: Whether to add trailing commas in objects/arrays
- **Arrow Function Parentheses**: When to add parentheses around arrow function parameters

## Key Features

- **Zero Config**: Works out of the box with sensible defaults
- **Editor Integration**: VS Code, WebStorm, Sublime Text, Atom, etc.
- **Format on Save**: Automatic formatting when files are saved
- **Language Support**: JavaScript, TypeScript, JSX, CSS, HTML, JSON, Markdown, YAML, and more
- **CI Integration**: Can be run in CI pipelines to enforce formatting
- **ESLint Integration**: Disables conflicting ESLint formatting rules
- **Fast**: Efficient formatting even for large codebases
- **Consistent**: Same formatting across all developers and machines

## Basic Usage

```bash
# Install Prettier
npm install -D prettier

# Format all files
prettier --write .

# Check if files are formatted
prettier --check .

# Format specific file
prettier --write src/index.ts

# Format with specific config
prettier --write . --config .prettierrc
```

## Installation

```bash
# Install as dev dependency
npm install -D prettier

# Install globally
npm install -g prettier

# With ESLint integration
npm install -D prettier eslint-config-prettier
```

## Configuration

### Configuration Files

Prettier looks for configuration files in this order:
1. `.prettierrc` (JSON)
2. `.prettierrc.json` (JSON)
3. `.prettierrc.yaml` / `.prettierrc.yml` (YAML)
4. `.prettierrc.toml` (TOML)
5. `.prettierrc.js` / `.prettierrc.cjs` (JavaScript)
6. `prettier.config.js` / `prettier.config.cjs` (JavaScript)
7. `package.json` (via `prettier` key)

### Recommended Configuration

**`.prettierrc`**:
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**`.prettierrc.js`** (for dynamic configuration):
```javascript
module.exports = {
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: '*.json',
      options: {
        printWidth: 200
      }
    }
  ]
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `printWidth` | 80 | Maximum line length |
| `tabWidth` | 2 | Number of spaces per indentation level |
| `useTabs` | false | Use tabs instead of spaces |
| `semi` | true | Add semicolons at the end of statements |
| `singleQuote` | false | Use single quotes instead of double quotes |
| `quoteProps` | 'as-needed' | Quote object properties when needed |
| `jsxSingleQuote` | false | Use single quotes in JSX |
| `trailingComma` | 'es5' | Add trailing commas where valid in ES5 |
| `bracketSpacing` | true | Print spaces between brackets |
| `bracketSameLine` | false | Put `>` of JSX tags on the last line |
| `arrowParens` | 'always' | Add parentheses around arrow function parameters |
| `proseWrap` | 'preserve' | How to wrap prose |
| `htmlWhitespaceSensitivity` | 'css' | How to handle whitespace in HTML |
| `endOfLine` | 'lf' | Line ending style |
| `embeddedLanguageFormatting` | 'auto' | Format embedded code |

### Ignore Files

**`.prettierignore`**:
```
# Dependencies
node_modules/
pnpm-lock.yaml
package-lock.json
yarn.lock

# Build outputs
dist/
build/
.next/
out/

# Generated files
*.min.js
*.min.css

# Config files
turbo.json
pnpm-workspace.yaml

# Documentation
CHANGELOG.md
```

## Language-Specific Configuration

### JavaScript/TypeScript

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "arrowParens": "always"
}
```

### CSS/SCSS

```json
{
  "singleQuote": false,
  "trailingComma": "es5"
}
```

### HTML

```json
{
  "htmlWhitespaceSensitivity": "css",
  "singleQuote": false
}
```

### JSON

```json
{
  "trailingComma": "none",
  "printWidth": 200
}
```

### Markdown

```json
{
  "proseWrap": "always",
  "printWidth": 80
}
```

## Advanced Patterns

### Conditional Configuration

```javascript
// prettier.config.js
module.exports = {
  semi: true,
  singleQuote: true,
  overrides: [
    {
      files: '*.test.{js,ts}',
      options: {
        printWidth: 120
      }
    },
    {
      files: ['*.md', '*.mdx'],
      options: {
        proseWrap: 'always',
        printWidth: 80
      }
    }
  ]
}
```

### Monorepo Configuration

**Root `.prettierrc`**:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

**Package-specific overrides**:
```javascript
// apps/web/prettier.config.js
const baseConfig = require('../../.prettierrc')

module.exports = {
  ...baseConfig,
  overrides: [
    {
      files: '*.tsx',
      options: {
        jsxSingleQuote: true
      }
    }
  ]
}
```

### Integration with ESLint

**Install dependencies**:
```bash
npm install -D prettier eslint-config-prettier
```

**ESLint flat config**:
```javascript
import prettier from 'eslint-config-prettier'

export default [
  // ...other configs
  prettier  // Must be last to disable conflicting rules
]
```

**Legacy ESLint config**:
```json
{
  "extends": [
    "eslint:recommended",
    "prettier"
  ]
}
```

## Anti-Patterns

### 1. Too Many Configuration Options

**BAD**:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "jsxSingleQuote": true,
  "quoteProps": "as-needed",
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css"
}
```

**GOOD**:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Why**: Prettier is opinionated; too many options defeat the purpose.

### 2. Not Using .prettierignore

**BAD**:
```bash
prettier --write .  # Formats everything including node_modules
```

**GOOD**:
```
# .prettierignore
node_modules/
dist/
build/
*.min.js
```

**Why**: Formatting generated files or dependencies is wasteful and can cause issues.

### 3. Not Integrating with ESLint

**BAD**:
```javascript
// ESLint handles formatting
{
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
}
```

**GOOD**:
```javascript
import prettier from 'eslint-config-prettier'

export default [
  // ...other configs
  prettier  // Disables ESLint formatting rules
]
```

**Why**: Prettier handles formatting better; ESLint should focus on code quality.

### 4. Inconsistent Print Width

**BAD**:
```json
{
  "printWidth": 80
}
```

**GOOD**:
```json
{
  "printWidth": 100
}
```

**Why**: 80 characters is too narrow for modern screens; 100 is more practical.

### 5. Not Using Trailing Commas

**BAD**:
```json
{
  "trailingComma": "none"
}
```

**GOOD**:
```json
{
  "trailingComma": "all"
}
```

**Why**: Trailing commas make git diffs cleaner and reduce merge conflicts.

### 6. Not Formatting on Save

**BAD**:
```bash
# Manual formatting
prettier --write src/index.ts
```

**GOOD**:
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

**Why**: Automatic formatting ensures consistency without manual effort.

### 7. Not Running in CI

**BAD**:
```bash
# No CI check
```

**GOOD**:
```yaml
# .github/workflows/ci.yml
- name: Check formatting
  run: prettier --check .
```

**Why**: CI enforcement prevents unformatted code from being merged.

### 8. Using Different Line Endings

**BAD**:
```json
{
  "endOfLine": "auto"
}
```

**GOOD**:
```json
{
  "endOfLine": "lf"
}
```

**Why**: Consistent line endings prevent cross-platform issues.

## Performance Optimization

### 1. Use .prettierignore

Exclude unnecessary files from formatting:
```
node_modules/
dist/
build/
*.min.js
```

### 2. Format Specific Directories

```bash
prettier --write src/  # Only format source files
```

### 3. Use Caching

Prettier doesn't have built-in caching, but you can use third-party tools:
```bash
npm install -D prettier-cache
prettier-cache --write .
```

### 4. Parallel Processing

Format files in parallel using tools like `npm-run-all`:
```bash
npm install -D npm-run-all
npm-run-all --parallel prettier:*
```

## Integration with Tools

### VS Code

**Install extension**:
```bash
code --install-extension esbenp.prettier-vscode
```

**Settings**:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Git Hooks (Lefthook)

```yaml
# lefthook.yml
pre-commit:
  parallel: false
  commands:
    prettier:
      run: pnpm format
      glob: '*.{js,jsx,ts,tsx,json,css,md}'
```

**package.json scripts**:
```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### CI/CD

**GitHub Actions**:
```yaml
- name: Check formatting
  run: pnpm format:check
```

**GitLab CI**:
```yaml
formatting:
  script:
    - pnpm format:check
```

### Husky

```bash
npm install -D husky
npx husky install
npx husky add .husky/pre-commit "pnpm format"
```

## Common Commands

```bash
# Format all files
prettier --write .

# Check if files are formatted
prettier --check .

# Format specific file
prettier --write src/index.ts

# Format with specific config
prettier --write . --config .prettierrc

# Format with specific options
prettier --write . --single-quote --trailing-comma all

# List supported files
prettier --list-different .

# Debug configuration
prettier --find-config-path src/index.ts

# Check syntax
prettier --check-syntax src/index.ts

# Use stdin
echo 'const x = 1' | prettier --stdin-filepath stdin.js
```

## Troubleshooting

### Common Issues

**"File ignored" warnings**:
- Check `.prettierignore` for incorrect patterns
- Ensure file paths are correct

**Formatting not working in editor**:
- Verify Prettier extension is installed
- Check editor settings for default formatter
- Ensure `.prettierrc` is in the project root

**Conflicts with ESLint**:
- Use `eslint-config-prettier` to disable conflicting rules
- Run Prettier before ESLint in pre-commit hooks

**Slow formatting**:
- Use `.prettierignore` to exclude large directories
- Format specific files instead of entire project
- Consider using caching tools

### Debugging

```bash
# Show configuration for a file
prettier --find-config-path src/index.ts

# Show which files would be formatted
prettier --list-different .

# Check syntax without formatting
prettier --check-syntax src/index.ts

# Verbose output
prettier --write . --log-level debug
```

## Best Practices

1. **Use minimal configuration** - Prettier is opinionated
2. **Integrate with ESLint** - Disable conflicting rules
3. **Format on save** - Automatic formatting in editors
4. **Use .prettierignore** - Exclude unnecessary files
5. **Run in CI** - Enforce formatting in pipelines
6. **Use trailing commas** - Cleaner git diffs
7. **Consistent line endings** - Use `lf` everywhere
8. **Set appropriate print width** - 100 characters is practical
9. **Use single quotes** - Consistent with JavaScript conventions
10. **Enable semicolons** - Avoid ASI issues
11. **Document configuration** - Explain non-default choices
12. **Share config in monorepos** - Consistency across packages
13. **Use git hooks** - Prevent unformatted commits
14. **Keep Prettier updated** - Latest features and bug fixes
15. **Test configuration** - Ensure it works as expected

## Resources

- [Official Prettier Documentation](https://prettier.io)
- [Prettier GitHub Repository](https://github.com/prettier/prettier)
- [Prettier Options](https://prettier.io/docs/en/options)
- [Prettier VS Code Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [ESLint Config Prettier](https://github.com/prettier/eslint-config-prettier)
- [Prettier Playground](https://prettier.io/playground)
