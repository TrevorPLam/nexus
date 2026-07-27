# Markdownlint

## Overview

markdownlint is a static analysis tool for Markdown/CommonMark files that
enforces consistent style and structure. It uses the micromark parser and honors
the CommonMark specification, with support for GitHub Flavored Markdown (GFM)
syntax.

## Latest Stable Version

**Version**: `0.40.0` (July 2026)

**Compatibility**:

- Node.js: 14.17.0+
- Browsers: Not applicable (CLI tool)
- Package Managers: npm, pnpm, yarn, bun

**Key Features**:

- 60+ built-in rules for structural and semantic linting
- Support for CommonMark and GFM
- Custom rules via npm packages
- VS Code extension with real-time feedback
- Auto-fix for many violations
- Prettier compatibility preset

## Core Concepts

- **Rule-based Linting**: Each rule checks for specific Markdown issues
- **Parser**: Uses micromark for structural analysis (primary) and markdown-it
  for legacy rules
- **Configuration**: JSONC, YAML, or JS configuration files
- **Inline Config**: HTML comments to enable/disable rules per file
- **Custom Rules**: JavaScript-based custom rules for project-specific needs
- **Prettier Integration**: Preset to disable formatting rules handled by
  Prettier

## Key Features

- **Broad Rule Coverage**: 60+ built-in rules covering headings, lists, code
  blocks, links, etc.
- **Auto-fix**: 31 rules support automatic fixing
- **VS Code Extension**: Real-time linting in editor
- **CLI Tools**: markdownlint-cli and markdownlint-cli2 for command-line usage
- **Custom Rules**: Extensible via npm packages
- **Prettier Compatibility**: Built-in preset to avoid conflicts
- **Front Matter Support**: Handles YAML, TOML, and JSON front matter
- **Monorepo Support**: Configuration files can be nested in directory trees

## Basic Usage

```bash
# Install markdownlint-cli2
pnpm add -D markdownlint-cli2 markdownlint

# Lint all Markdown files
pnpm lint:md

# Fix auto-fixable issues
pnpm lint:md:fix

# Lint specific file
markdownlint-cli2 README.md

# Lint with custom config
markdownlint-cli2 --config .markdownlint-cli2.jsonc "**/*.md"
```

## Installation

```bash
# Install as dev dependency
pnpm add -D markdownlint markdownlint-cli2

# Install globally
pnpm add -g markdownlint-cli2
```

## Configuration

### Configuration Files

markdownlint-cli2 looks for configuration files in this order:

1. `.markdownlint-cli2.jsonc`
2. `.markdownlint-cli2.yaml`
3. `.markdownlint-cli2.cjs`
4. `.markdownlint-cli2.mjs`
5. `.markdownlint.jsonc` / `.markdownlint.json`
6. `.markdownlint.yaml` / `.markdownlint.yml`
7. `.markdownlint.cjs` / `.markdownlint.mjs`
8. `package.json` (via `markdownlint` key)

### Recommended Configuration

**`.markdownlint-cli2.jsonc`**:

```jsonc
{
  "fix": true,
  "gitignore": true,
  "config": {
    "extends": "markdownlint/style/prettier",
    "MD003": { "style": "atx" },
    "MD013": { "line_length": false },
    "MD024": { "siblings_only": true },
    "MD040": {
      "allowed_languages": ["javascript", "typescript", "bash"],
      "language_only": false,
    },
    "MD041": { "level": 1, "front_matter_title": "" },
    "MD046": { "style": "fenced" },
    "MD048": { "style": "backtick" },
    "MD049": { "style": "underscore" },
    "MD050": { "style": "asterisk" },
  },
  "globs": ["**/*.md"],
  "ignores": ["node_modules/**", "dist/**"],
  "frontMatter": "(^---\\s*$[\\s\\S]+?^---\\s*)",
  "noInlineConfig": false,
  "noBanner": true,
}
```

### Configuration Options

| Option           | Type           | Description                          |
| ---------------- | -------------- | ------------------------------------ |
| `fix`            | Boolean        | Enable auto-fix for applicable rules |
| `gitignore`      | Boolean/String | Use .gitignore for exclusions        |
| `config`         | Object         | markdownlint rule configuration      |
| `customRules`    | Array          | Custom rule modules to load          |
| `globs`          | Array          | Glob patterns to lint                |
| `ignores`        | Array          | Glob patterns to ignore              |
| `frontMatter`    | String         | RegExp for front matter              |
| `noInlineConfig` | Boolean        | Disable HTML comment config          |
| `noBanner`       | Boolean        | Disable banner output                |

### Built-in Presets

markdownlint includes several built-in style presets:

| Preset                    | Description                               |
| ------------------------- | ----------------------------------------- |
| `style/all.json`          | All rules enabled (strictest)             |
| `style/relaxed.json`      | Permissive defaults for prose-heavy docs  |
| `style/prettier.json`     | Disables 23 formatting rules for Prettier |
| `style/cirosantilli.json` | Personal style reference                  |

## Language-Specific Configuration

### Technical Documentation

```jsonc
{
  "config": {
    "MD040": {
      "allowed_languages": [
        "bash",
        "javascript",
        "typescript",
        "sql",
        "json",
        "yaml",
        "html",
        "css",
      ],
    },
  },
}
```

### Prose-Heavy Documentation

```jsonc
{
  "config": {
    "extends": "markdownlint/style/relaxed",
    "MD013": false,
    "MD034": false,
  },
}
```

## Advanced Patterns

### Monorepo Configuration

**Root `.markdownlint-cli2.jsonc`**:

```jsonc
{
  "fix": true,
  "gitignore": true,
  "config": {
    "extends": "markdownlint/style/prettier",
  },
  "globs": ["**/*.md"],
}
```

**Package-specific overrides**:

```jsonc
// apps/web/.markdownlint-cli2.jsonc
{
  "config": {
    "extends": "../../.markdownlint-cli2.jsonc",
    "MD040": {
      "allowed_languages": ["javascript", "typescript", "tsx"],
    },
  },
}
```

### Custom Rules

Create a custom rule:

```javascript
// custom-rules/code-block-language.js
module.exports = {
  names: ['code-block-language', 'CBL001'],
  description: 'Code blocks must specify a language',
  tags: ['code', 'custom'],
  parser: 'micromark',
  function: (params, onError) => {
    const { micromark } = params.parsers;
    const fences = micromark.tokens.filter(
      (token) => token.type === 'codeFenced',
    );

    for (const fence of fences) {
      if (!fence.lang) {
        onError({
          lineNumber: fence.startLine,
          detail: 'Code block must specify a language',
        });
      }
    }
  },
};
```

Use custom rules:

```jsonc
{
  "customRules": ["./custom-rules/code-block-language.js"],
  "config": {
    "code-block-language": true,
  },
}
```

### Integration with Prettier

Use the Prettier preset to disable formatting rules:

```jsonc
{
  "config": {
    "extends": "markdownlint/style/prettier",
  },
}
```

This disables 23 formatting rules that Prettier handles:

- `blanks-around-fences`
- `blanks-around-headings`
- `blanks-around-lists`
- `code-fence-style`
- `emphasis-style`
- `heading-start-left`
- `hr-style`
- `line-length`
- `list-indent`
- `list-marker-space`
- `no-blanks-blockquote`
- `no-hard-tabs`
- `no-missing-space-atx`
- `no-missing-space-closed-atx`
- `no-multiple-blanks`
- `no-multiple-space-atx`
- `no-multiple-space-blockquote`
- `no-multiple-space-closed-atx`
- `no-trailing-spaces`
- `ol-prefix`
- `strong-style`
- `ul-indent`

## Anti-Patterns

### 1. Not Using Prettier Preset

**BAD**:

```jsonc
{
  "config": {
    "MD012": false,
    "MD013": false,
    "MD030": false,
    // ... 20 more disabled rules
  },
}
```

**GOOD**:

```jsonc
{
  "config": {
    "extends": "markdownlint/style/prettier",
  },
}
```

**Why**: The preset handles all Prettier conflicts automatically.

### 2. Over-Restrictive Rules

**BAD**:

```jsonc
{
  "config": {
    "MD013": { "line_length": 80 },
    "MD043": {
      "headings": ["##", "###", "####"],
      "match_body": false,
    },
  },
}
```

**GOOD**:

```jsonc
{
  "config": {
    "MD013": false,
    "MD043": false,
  },
}
```

**Why**: Over-restrictive rules hinder documentation authoring.

### 3. Not Configuring Ignore Patterns

**BAD**:

```bash
markdownlint-cli2 "**/*.md"  # Lints everything including node_modules
```

**GOOD**:

```jsonc
{
  "gitignore": true,
  "ignores": ["node_modules/**", "dist/**"],
}
```

**Why**: Linting generated files or dependencies is wasteful.

### 4. Not Integrating with Git Hooks

**BAD**:

```bash
# Manual linting only
pnpm lint:md
```

**GOOD**:

```yaml
# lefthook.yml
pre-commit:
  commands:
    lint:md:
      glob: '*.md'
      run: pnpm lint:md {staged_files}
```

**Why**: Git hooks prevent unlinted documentation from being committed.

### 5. Not Running in CI

**BAD**:

```yaml
# No CI check
```

**GOOD**:

```yaml
# .github/workflows/ci.yml
- name: Lint Markdown
  run: pnpm lint:md
```

**Why**: CI enforcement prevents unlinted documentation from being merged.

### 6. Conflicting with Prettier

**BAD**:

```jsonc
{
  "config": {
    "MD049": { "style": "asterisk" },
  },
}
```

**GOOD**:

```jsonc
{
  "config": {
    "extends": "markdownlint/style/prettier",
    "MD049": { "style": "underscore" },
  },
}
```

**Why**: Prettier defaults to underscore emphasis; match it to avoid conflicts.

## Performance Optimization

### 1. Use gitignore

Enable gitignore integration for faster file enumeration:

```jsonc
{
  "gitignore": true,
}
```

### 2. Specify Globs in Config

Define globs in configuration instead of command line:

```jsonc
{
  "globs": ["**/*.md"],
}
```

### 3. Use markdownlint-cli2

markdownlint-cli2 is faster than markdownlint-cli:

```bash
# Faster
markdownlint-cli2 "**/*.md"

# Slower
markdownlint-cli "**/*.md"
```

### 4. Parallel Processing

Run linting in parallel for large monorepos:

```bash
# Use turbo for monorepo parallelism
turbo run lint:md
```

## Integration with Tools

### VS Code

**Install extension**:

```bash
code --install-extension DavidAnson.vscode-markdownlint
```

**Settings**:

```json
{
  "[markdown]": {
    "editor.defaultFormatter": "DavidAnson.vscode-markdownlint"
  },
  "markdownlint.configFile": ".markdownlint-cli2.jsonc"
}
```

### Git Hooks (Lefthook)

```yaml
# lefthook.yml
pre-commit:
  commands:
    lint:md:
      glob: '*.md'
      run: pnpm lint:md {staged_files}
      timeout: 30s
```

### CI/CD

**GitHub Actions**:

```yaml
name: Lint Markdown

on:
  push:
    paths:
      - '**/*.md'
  pull_request:
    paths:
      - '**/*.md'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: pnpm install
      - run: pnpm lint:md
```

**GitHub Action (markdownlint-cli2-action)**:

```yaml
- name: Lint Markdown
  uses: DavidAnson/markdownlint-cli2-action@v24
  with:
    config: '.markdownlint-cli2.jsonc'
```

## Common Commands

```bash
# Lint all files
pnpm lint:md

# Fix auto-fixable issues
pnpm lint:md:fix

# Lint specific file
markdownlint-cli2 README.md

# Lint with custom config
markdownlint-cli2 --config .markdownlint-cli2.jsonc "**/*.md"

# Lint only changed files
markdownlint-cli2 $(git diff --name-only --diff-filter=ACM '*.md')

# Show rule list
markdownlint-cli2 --help

# Debug configuration
markdownlint-cli2 --debug "**/*.md"
```

## Troubleshooting

### Common Issues

**"File ignored" warnings**:

- Check `.gitignore` for incorrect patterns
- Verify `ignores` configuration

**Configuration not loading**:

- Ensure config file is in root directory
- Check file name matches expected pattern
- Verify JSONC syntax is valid

**Conflicts with Prettier**:

- Use `extends: "markdownlint/style/prettier"`
- Match emphasis/strong styles to Prettier defaults
- Run Prettier after markdownlint

**Slow linting**:

- Enable `gitignore: true`
- Use `markdownlint-cli2` instead of `markdownlint-cli`
- Specify globs in config file
- Consider using Rust alternatives for very large repos

### Debugging

```bash
# Show configuration for a file
markdownlint-cli2 --debug README.md

# Show which files would be linted
markdownlint-cli2 --dry-run "**/*.md"

# Verbose output
markdownlint-cli2 --verbose "**/*.md"
```

## Best Practices

1. **Use Prettier preset** - Disable formatting rules handled by Prettier
2. **Enable gitignore** - Faster file enumeration in large repos
3. **Run in CI** - Enforce linting in pipelines
4. **Use git hooks** - Prevent unlinted commits
5. **Configure code languages** - Enforce language specifiers in code blocks
6. **Allow duplicate headings** - Use `siblings_only: true` for repeated
   structures
7. **Disable over-restrictive rules** - Don't hinder documentation authoring
8. **Use extends** - Leverage built-in presets instead of manual config
9. **Document exceptions** - Comment on why rules are disabled
10. **Keep markdownlint updated** - Latest features and bug fixes
11. **Test configuration** - Run `pnpm lint:md` before committing
12. **Use markdownlint-cli2** - Faster than markdownlint-cli
13. **Integrate with editor** - Real-time feedback in VS Code
14. **Customize for domain** - Adjust rules for technical vs prose docs
15. **Monitor performance** - Use gitignore and globs for large repos

## Key Rules for Technical Documentation

### MD003 - Heading Style

Enforce ATX (hashed) headings for consistency:

```jsonc
{
  "MD003": { "style": "atx" },
}
```

### MD024 - Duplicate Headings

Allow duplicates under different parent sections:

```jsonc
{
  "MD024": { "siblings_only": true },
}
```

### MD040 - Fenced Code Language

Require language specifiers for syntax highlighting:

```jsonc
{
  "MD040": {
    "allowed_languages": ["javascript", "typescript", "bash"],
    "language_only": false,
  },
}
```

### MD046 - Code Block Style

Enforce fenced code blocks:

```jsonc
{
  "MD046": { "style": "fenced" },
}
```

### MD048 - Code Fence Style

Enforce backtick fences:

```jsonc
{
  "MD048": { "style": "backtick" },
}
```

## Resources

- [Official markdownlint Documentation](https://github.com/DavidAnson/markdownlint)
- [markdownlint-cli2 Documentation](https://github.com/DavidAnson/markdownlint-cli2)
- [markdownlint Rule Documentation](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [markdownlint Custom Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/CustomRules.md)
- [markdownlint Prettier Integration](https://github.com/DavidAnson/markdownlint/blob/main/doc/Prettier.md)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint)
- [markdownlint-cli2-action](https://github.com/marketplace/actions/markdownlint-cli2-action)
