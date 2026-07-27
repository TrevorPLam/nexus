# CSpell Spell Checking Guide

## Overview

CSpell is a spell checker designed specifically for code. It understands
programming syntax, handles camelCase and snake_case identifiers, and can be
integrated into your development workflow to catch typos in code comments,
documentation, and user-facing text.

## Why CSpell?

### CSpell vs Other Spell Checkers (2026)

| Feature             | CSpell                            | codespell                    | LTeX                | Typos        |
| ------------------- | --------------------------------- | ---------------------------- | ------------------- | ------------ |
| **Approach**        | Dictionary-based with allowlists  | Common misspelling detection | Grammar + spelling  | Typo-focused |
| **False Positives** | Higher (requires tuning)          | Lower                        | Medium              | Lowest       |
| **Code Awareness**  | Excellent (camelCase, snake_case) | Basic                        | Limited             | Limited      |
| **Privacy**         | Local only                        | Local only                   | Local/Remote        | Local only   |
| **Performance**     | Good (optimized for large repos)  | Fast                         | Slower (Java-based) | Very Fast    |
| **Multilingual**    | 40+ languages                     | English only                 | 20+ languages       | English only |
| **Grammar Check**   | No                                | No                           | Yes                 | No           |
| **IDE Integration** | Excellent (VSCode, WebStorm)      | Basic                        | Good                | Basic        |

**Why CSpell for Life OS:**

- **Code-aware**: Understands TypeScript, React, and technical terminology
- **Privacy-focused**: All processing happens locally (critical for personal
  data)
- **Extensible**: Custom dictionaries for domain-specific terms
- **Monorepo-friendly**: Single configuration for entire workspace
- **Performance**: Optimized for large codebases with caching

## Architecture & Fundamentals

### CSpell Architecture

CSpell uses a multi-layered dictionary system:

1. **Default Dictionaries**: Built-in dictionaries for English, programming
   languages, and technical terms
2. **Custom Dictionaries**: Project-specific word lists (`.cspell/*.txt`)
3. **Configuration Merging**: Settings from multiple config files merge
   hierarchically
4. **File Type Handling**: Different rules per language (TypeScript, Markdown,
   SQL, etc.)
5. **Identifier Parsing**: Splits camelCase/snake_case before checking

### Dictionary Management

**Dictionary Types:**

- `en_US` - American English (default)
- `typescript` - TypeScript/JavaScript keywords
- `node` - Node.js terminology
- `softwareTerms` - General software concepts
- Custom dictionaries (project-specific)

**Performance Characteristics:**

- Dictionary size doesn't impact lookup speed
- Word length affects lookup time (longer = slower)
- Caching makes repeated lookups faster
- Custom dictionaries are optimized on load

## Configuration for Life OS Monorepo

### Root Configuration (`cspell.json`)

The Life OS monorepo uses a comprehensive CSpell configuration at the root:

```json
{
  "$schema": "https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json",
  "version": "0.2",
  "language": "en",
  "description": "CSpell configuration for Life OS monorepo"
}
```

### Custom Dictionaries

Three custom dictionaries are defined:

1. **project-terms** (`.cspell/project-terms.txt`): Life OS domain-specific
   terminology
   - Product concepts: Life Graph, daily plan, capacity aware
   - Task management: commitment levels, splittable, energy levels
   - Data architecture: entity links, open zone, vault zone
   - Privacy concepts: RLS, workspace scoped, client-side encrypted

2. **technical-terms** (`.cspell/technical-terms.txt`): General technical
   terminology
   - Architecture patterns: modular monolith, event sourcing, CQRS
   - Database concepts: ACID, transactions, migrations, indexing
   - API terminology: REST, GraphQL, OAuth, JWT
   - Frontend concepts: React, hooks, SSR, hydration

3. **company-names** (`.cspell/company-names.txt`): Technology companies and
   products
   - Cloud providers: AWS, Azure, GCP, DigitalOcean
   - Development tools: VS Code, GitHub, GitLab
   - Frameworks: React, Vue, Angular, Svelte
   - Databases: PostgreSQL, MongoDB, Redis

### File Type Handling

**Enabled File Types:**

- Markdown: `.md`, `.mdx`
- TypeScript/JavaScript: `.ts`, `.tsx`, `.js`, `.jsx`
- Configuration: `.json`, `.yaml`, `.yml`
- Database: `.sql`

**Language-Specific Settings:**

**TypeScript/JavaScript:**

- Enables `typescript`, `node`, `softwareTerms` dictionaries
- Ignores camelCase patterns (e.g., `useState`, `fetchData`)
- Minimum word length: 4 characters

**Markdown:**

- Allows compound words (e.g., "offline-first")
- Minimum word length: 4 characters
- Focus on documentation quality

**SQL:**

- Enables `softwareTerms` dictionary
- Ignores SQL keywords (SELECT, FROM, WHERE, etc.)
- Ignores data types (VARCHAR, INTEGER, TIMESTAMP, etc.)

**Test Files:**

- Minimum word length: 3 characters (shorter for test names)
- Allows compound words (e.g., `test-user-authentication`)

### Ignore Patterns

**Ignored Paths:**

- `node_modules/**`, `dist/**`, `build/**` (build artifacts)
- `.next/**`, `.turbo/**` (framework caches)
- `coverage/**` (test coverage)
- `.git/**`, `pnpm-lock.yaml` (version control)
- Binary files: `.svg`, `.png`, `.jpg`, `.woff`, etc.
- `.cspell/**` (dictionary files themselves)

**Ignored Patterns (Regex):**

- URLs: `https?://[^\s]+`
- Email addresses: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`
- UUIDs: `\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b`
- Base64: `^[A-Za-z0-9+/]{20,}={0,2}$`
- File paths: `[a-zA-Z]:\\[^\s]*`
- Hex colors: `#[0-9a-fA-F]{3,8}`
- Environment variables: `\${[A-Z_][A-Z0-9_]*}`
- Import statements: `import\s+.*from\s+['"].*['"]`

### Flagged Words

Common misspellings that should always be flagged as errors:

- `hte` → `the`
- `teh` → `the`
- `recieve` → `receive`
- `occured` → `occurred`
- `seperate` → `separate`
- `definately` → `definitely`
- `goverment` → `government`
- `occassionally` → `occasionally`
- `untill` → `until`
- `wich` → `which`
- `thier` → `their`

## Usage

### Command Line

**Check all files:**

```bash
pnpm spellcheck
```

**Check specific files:**

```bash
pnpm dlx cspell "**/*.md"
pnpm dlx cspell "apps/web/src/**/*.{ts,tsx}"
```

**Extract unknown words (for dictionary building):**

```bash
pnpm spellcheck:fix
```

**Verbose output:**

```bash
pnpm dlx cspell "**/*.md" --verbose
```

**Show suggestions:**

```bash
pnpm dlx cspell "**/*.md" --show-suggestions
```

### IDE Integration

**VS Code:**

1. Install "Code Spell Checker" extension (Street Side Software)
2. The extension automatically detects `cspell.json`
3. Spelling errors appear as underlines in the editor
4. Quick fix (Ctrl+.) shows suggestions
5. Right-click → "Add Words to Dictionary" to add to custom dictionary

**WebStorm / IntelliJ:**

1. Install "CSpell" plugin
2. Configure to use project's `cspell.json`
3. Spelling errors appear in the editor
4. Use "Add to dictionary" quick action

**Cursor / Windsurf:**

1. Install "Code Spell Checker" extension
2. Automatic integration with project config
3. Real-time spell checking in the editor

### Git Hooks Integration

**Pre-commit Hook:**

```yaml
spellcheck:
  glob: '*.{md,mdx,txt,ts,tsx,js,jsx,json,yaml,yml,sql}'
  run: pnpm dlx cspell --no-progress --no-summary {staged_files}
  timeout: 60s
```

**Commit-msg Hook:**

```yaml
spellcheck-commit:
  run: pnpm dlx cspell --no-progress --no-summary --language-id commit-msg {1}
  timeout: 30s
```

The hooks use `pnpm dlx` to run CSpell without installing it globally, ensuring
version consistency.

### CI/CD Integration

**GitHub Actions:**

```yaml
- name: Spell check
  run: pnpm spellcheck
```

**Turbo Integration:**

```json
{
  "pipeline": {
    "spellcheck": {
      "outputs": [],
      "cache": false
    }
  }
}
```

## Dictionary Management

### Adding New Words

**Method 1: Via IDE (Recommended)**

1. Right-click on a flagged word
2. Select "Add Words to Dictionary"
3. Choose the appropriate dictionary (project-terms, technical-terms,
   company-names)

**Method 2: Manual Edit**

1. Open the appropriate `.cspell/*.txt` file
2. Add the word (one per line)
3. Words are case-insensitive

**Method 3: Extract from Code**

```bash
# Extract unknown words from markdown files
pnpm dlx cspell "**/*.md" --words-only --unique >> .cspell/project-terms.txt
```

### Dictionary Organization

**project-terms.txt:**

- Life OS-specific product concepts
- Domain terminology (tasks, calendar, notes)
- Architecture patterns specific to this project
- Privacy and security concepts
- UI/UX terminology

**technical-terms.txt:**

- General software architecture patterns
- Database and data concepts
- API and HTTP terminology
- Frontend and backend concepts
- Development tools and practices

**company-names.txt:**

- Technology companies
- Frameworks and libraries
- Cloud providers
- Development tools
- Product names

### Dictionary Best Practices

1. **Keep dictionaries focused**: Each dictionary should have a clear purpose
2. **One word per line**: Simple format, easy to maintain
3. **Case-insensitive**: CSpell handles case automatically
4. **Avoid duplicates**: CSpell deduplicates automatically
5. **Review periodically**: Remove obsolete terms
6. **Comment sections**: Use `#` for organization (ignored by CSpell)

## Performance Optimization

### Large Monorepo Considerations

**Caching:**

- CSpell uses a cache file (`.cspellcache`) to speed up repeated checks
- Cache is invalidated when configuration or dictionaries change
- Use `--cache` flag to enable caching (default)
- Use `--no-cache` to force fresh check

**File Selection:**

- Use glob patterns to limit scope: `"**/*.md"` instead of `"**"`
- Use `--file-list` for large file sets
- Exclude build artifacts and dependencies

**Dictionary Size:**

- Dictionary size doesn't impact performance
- Word length affects lookup time (longer = slower)
- Custom dictionaries are optimized on load

**Configuration Search:**

- CSpell searches for config files in parent directories
- Use `--no-config-search` to disable (faster for large repos)
- Use `--stop-config-search-at` to limit search depth

### Performance Tips

1. **Use custom dictionaries instead of inline words**: 4-5x faster for large
   word lists
2. **Enable caching**: Significant speedup for repeated checks
3. **Limit file scope**: Check only relevant file types
4. **Use `--no-progress`**: Reduces output overhead in CI
5. **Use `--no-summary`**: Faster for automated checks

## Anti-Patterns to Avoid

### 1. Over-Aggressive Spell Checking

**Problem:** Flagging technical terms as misspellings

```json
// Bad
"words": ["PowerSync", "Drizzle", "Supabase"] // Inline in config
```

**Solution:** Use custom dictionaries

```json
// Good
"dictionaryDefinitions": [
  {
    "name": "project-terms",
    "path": "./.cspell/project-terms.txt",
    "addWords": true
  }
]
```

### 2. Not Maintaining Custom Dictionaries

**Problem:** Dictionaries become stale with obsolete terms

- Old project names
- Deprecated technologies
- Temporary terms

**Solution:** Regular dictionary maintenance

- Review quarterly
- Remove obsolete terms
- Add new domain terminology

### 3. Ignoring Performance Impact

**Problem:** Slow spell checking on large repos

- Checking `node_modules`
- Checking build artifacts
- No caching enabled

**Solution:** Proper ignore patterns and caching

```json
"ignorePaths": [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**"
]
```

### 4. Not Configuring File Type Exclusions

**Problem:** Checking binary files or generated code

- Checking `.svg` files
- Checking minified JavaScript
- Checking lock files

**Solution:** Comprehensive ignore patterns

```json
"ignorePaths": [
  "**/*.min.js",
  "**/*.svg",
  "**/*.lock",
  "**/pnpm-lock.yaml"
]
```

### 5. Breaking Technical Terms

**Problem:** Splitting valid technical terms

- `PowerSync` → `Power Sync` (incorrect)
- `Drizzle` → `Drizzle` (correct)

**Solution:** Add to custom dictionary

```
# .cspell/project-terms.txt
PowerSync
Drizzle
```

## Repository-Specific Assessment

### Documentation Structure Analysis

**`.planning/` Directory:**

- Contains detailed product and technical documentation
- High value for spell checking (user-facing content)
- Domain-specific terminology: "Life Graph", "capacity aware", "vault zone"
- Configuration: Minimum word length 4, compound words allowed

**`docs/` Directory:**

- Technical guides and implementation details
- Developer-facing documentation
- Technical terminology: "monorepo", "offline-first", "PowerSync"
- Configuration: Standard language settings

**`README.md`:**

- Project overview and getting started guide
- Critical for first impressions
- Technical stack terminology
- Configuration: Standard settings

### Domain-Specific Terminology

**Life OS Product Terms:**

- Life Graph, daily plan, capacity aware
- commitment levels (must-do, should-do, nice-to-do)
- entity links, open zone, vault zone
- workspace scoped, RLS, client-side encrypted

**Technical Stack Terms:**

- PowerSync, Drizzle, Supabase, Hono
- Expo, Tamagui, Turborepo, pnpm
- Vitest, ESLint, Prettier, Lefthook
- Inngest, Meilisearch, PostgreSQL

**Architecture Patterns:**

- modular monolith, transactional outbox
- command pattern, idempotency keys
- offline-first, dual-zone architecture
- planning projections, materialized views

### Impact on Developer Workflow

**Positive Impacts:**

- Catches typos in documentation before they reach users
- Ensures consistent terminology across the codebase
- Improves code comment quality
- Reduces review time (fewer spelling issues to catch)

**Minimal Friction:**

- Custom dictionaries reduce false positives
- IDE integration provides real-time feedback
- Git hooks catch issues before commit
- CI/CD ensures quality gate

**Maintenance Overhead:**

- Occasional dictionary updates (quarterly review)
- Initial setup of custom dictionaries
- Training developers on usage

## Advanced Patterns

### Dictionary Import and Sharing

**Import Shared Configuration:**

```json
{
  "import": ["./.cspell/base-config.json"],
  "dictionaryDefinitions": [
    {
      "name": "local-terms",
      "path": "./.cspell/local-terms.txt"
    }
  ]
}
```

**Share Dictionaries Across Projects:**

```json
{
  "dictionaryDefinitions": [
    {
      "name": "shared-terms",
      "path": "../shared-dictionaries/company-terms.txt"
    }
  ]
}
```

### Per-Language Configuration

**TypeScript-Specific Settings:**

```json
{
  "languageSettings": [
    {
      "languageId": "typescript",
      "dictionaries": ["typescript", "node"],
      "ignoreRegExpList": ["\\b[A-Z][a-z]+[A-Z][a-z]+\\b"]
    }
  ]
}
```

**Markdown-Specific Settings:**

```json
{
  "languageSettings": [
    {
      "languageId": "markdown",
      "minWordLength": 4,
      "allowCompoundWords": true
    }
  ]
}
```

### Handling camelCase and snakeCase

**CSpell automatically handles:**

- `camelCase` → `camel case`
- `snake_case` → `snake case`
- `PascalCase` → `pascal case`
- `kebab-case` → `kebab case`
- `SCREAMING_SNAKE_CASE` → `screaming snake case`

**Numbers are ignored:**

- `camel2snake` → `camel snake`
- `test123` → `test`
- `v2API` → `v api`

### In-Document Directives

**Disable spell checking for a section:**

```markdown
<!-- cspell:disable -->

This section has technical terms that shouldn't be checked.
<!-- cspell:enable -->
```

**Disable for a line:**

```typescript
// cspell:disable-line
const technicalTerm = 'PowerSync';
```

**Ignore a specific word:**

```markdown
cspell:word PowerSync
```

## Integration with Other Tools

### Prettier Integration

CSpell and Prettier work independently:

- Prettier handles formatting
- CSpell handles spelling
- Both can run in git hooks (Prettier first, then CSpell)

**Order in Lefthook:**

```yaml
pre-commit:
  commands:
    format:
      run: pnpm format {staged_files}
      stage_fixed: true

    spellcheck:
      run: pnpm dlx cspell --no-progress --no-summary {staged_files}
```

### ESLint Integration

**Using @cspell/eslint-plugin:**

```bash
pnpm add -D @cspell/eslint-plugin
```

```javascript
// eslint.config.mjs
import cspell from '@cspell/eslint-plugin';

export default [
  {
    plugins: {
      '@cspell': cspell,
    },
    rules: {
      '@cspell/spellchecker': 'warn',
    },
  },
];
```

**Configuration Options:**

- `autoFix`: Automatically fix common mistakes
- `checkIdentifiers`: Spell check variable names
- `checkStrings`: Spell check string literals
- `checkComments`: Spell check comments

### Turbo Integration

**Add to turbo.json:**

```json
{
  "pipeline": {
    "spellcheck": {
      "outputs": [],
      "cache": false,
      "dependsOn": []
    }
  }
}
```

**Run with Turbo:**

```bash
pnpm turbo run spellcheck
```

## Troubleshooting

### Common Issues

**Issue: Schema validation warning**

```
Unable to load schema from 'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json'
```

**Solution:** This is a warning, not an error. The schema URL may be blocked by
network policies. CSpell will still work.

**Issue: Too many false positives** **Solution:**

1. Add terms to custom dictionaries
2. Adjust `minWordLength`
3. Add more ignore patterns
4. Enable `allowCompoundWords` for specific file types

**Issue: Slow performance** **Solution:**

1. Enable caching: `--cache`
2. Limit file scope with glob patterns
3. Use `--no-config-search`
4. Move inline words to custom dictionaries

**Issue: Git hook fails** **Solution:**

1. Check if CSpell is installed: `pnpm dlx cspell --version`
2. Verify config file exists: `ls cspell.json`
3. Test manually: `pnpm dlx cspell "**/*.md"`
4. Check Lefthook logs: `LEFTHOOK_VERBOSE=1 git commit`

**Issue: Words not being added to dictionary** **Solution:**

1. Verify dictionary path is correct
2. Check `addWords: true` is set
3. Ensure dictionary is in `dictionaries` list
4. Restart IDE after changes

## Best Practices Summary

### For Monorepos

1. **Single root configuration**: Use one `cspell.json` at the monorepo root
2. **Shared custom dictionaries**: Keep dictionaries in `.cspell/` directory
3. **Consistent file patterns**: Use glob patterns that work across packages
4. **Turbo integration**: Add spellcheck to turbo pipeline
5. **Git hooks**: Enforce spelling quality at commit time

### For TypeScript Projects

1. **Enable TypeScript dictionary**: Add `typescript` to dictionaries list
2. **Handle camelCase**: CSpell does this automatically
3. **Ignore code patterns**: Add regex for imports, types, etc.
4. **Check comments and strings**: Focus on user-facing text
5. **Test files**: Relax rules for test names (shorter minWordLength)

### For Documentation

1. **Strict checking**: Use lower `minWordLength` for docs
2. **Allow compound words**: Enable for technical terms
3. **Review unknown words**: Extract and add to dictionaries
4. **Consistent terminology**: Use custom dictionaries for domain terms
5. **Quality gate**: Include in CI/CD pipeline

### For CI/CD

1. **Fast checks**: Use `--no-progress --no-summary`
2. **Fail on errors**: Non-zero exit code for CI
3. **Cache results**: Enable caching for speed
4. **Consistent version**: Use `pnpm dlx` for version consistency
5. **Parallel execution**: Run with other checks in parallel

## Conclusion

CSpell provides a robust, privacy-focused spell checking solution for the Life
OS monorepo. With proper configuration, custom dictionaries, and integration
into the development workflow, it ensures high-quality documentation and code
comments without introducing significant friction.

The key to success is:

1. **Comprehensive initial setup** (custom dictionaries, ignore patterns)
2. **Regular maintenance** (dictionary updates, review)
3. **Developer education** (IDE usage, git hooks)
4. **CI/CD integration** (quality gate enforcement)

By following this guide, the Life OS project can maintain consistent,
professional spelling across all code and documentation while respecting privacy
and performance requirements.
