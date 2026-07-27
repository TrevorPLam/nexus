# pnpm

## Overview

pnpm is a fast, disk space efficient package manager for JavaScript. It uses a
content-addressable filesystem to store all files from all module directories on
disk, sharing dependencies across projects through hard links and symlinks.

## Latest Stable Version (2026)

**Current Version:** pnpm 11.15+ (July 2026)

- Released: 2025-2026
- Requires: Node.js 22 or newer
- pnpm is now pure ESM
- Standalone executable requires glibc 2.27+

### Key Changes in pnpm 11

- **Node.js 22+ required** - Support for Node 18, 19, 20, and 21 dropped
- **Supply-chain protection on by default** - `minimumReleaseAge` defaults to
  1440 (1 day), `blockExoticSubdeps` defaults to true
- **allowBuilds replaces legacy settings** - `onlyBuiltDependencies`,
  `neverBuiltDependencies`, etc. removed
- **Global installs isolated** - Each `pnpm add -g` gets its own directory with
  separate package.json and lockfile
- **SQLite-backed store index** - Store v11 with bundled manifests and hex
  digests for faster installs
- **Native publish flow** - No longer delegates to npm CLI for publish, login,
  logout, etc.
- **Configuration split** - `.npmrc` is auth/registry only; pnpm settings in
  `pnpm-workspace.yaml` or global `config.yaml`
- **Environment variable prefix change** - Use `pnpm_config_*` instead of
  `npm_config_*`
- **Security hardening** - Environment variables no longer expanded in
  repository-controlled `.npmrc` and `pnpm-workspace.yaml` registry URLs
  (GHSA-3qhv-2rgh-x77r)

### New Commands in pnpm 11

- `pnpm change` - Records change intents for workspace release management
- `pnpm lane` - Per-package release lanes for prereleases
- `pnpm doctor` - Diagnoses installation end-to-end
- `pnpm access` - Manages package access on registry
- `pnpm team` - Manages organization teams and memberships
- `pnpm ci` - Clean install with frozen lockfile
- `pnpm clean` - Removes node_modules from all workspace projects
- `pnpm sbom` - Generates Software Bill of Materials
- `pnpm peers check` - Reports unmet/missing peers from lockfile
- `pnpm runtime set` - Installs a runtime (deprecates `pnpm env use`)
- `pnpm pack-app` - Packs CommonJS entry into standalone executable
- `pnpm docs/home` - Opens documentation
- `pnpm ping` - Checks registry connectivity
- `pnpm search` - Searches registry
- `pnpm star/unstar/stars` - Package starring
- `pnpm whoami` - Shows authenticated user
- `pnpm with` - Runs command with modified config

## Compatibility

### Platform Support

- Windows (x64, ARM64) - Uses junctions when Developer Mode is off
- macOS (Intel x64, Apple Silicon ARM64)
- Linux (x64, ARM64, PPC64LE, s390x)
- AIX (PPC64)

### Node.js Requirements

- **pnpm 11.x**: Node.js 22+ required
- **pnpm 10.x**: Node.js 18.17+ required
- Standalone executable requires glibc 2.27 or newer

### Filesystem Requirements

- Store must be on same drive/filesystem as installations for hard linking
  benefits
- Btrfs supports reflinks for copy-on-write
- ZFS supports reflinks

## Basics and Fundamentals

### Content-Addressable Store

pnpm stores all package files in a single content-addressable store:

- Files are saved once per version across all projects
- Hard links share the same disk space (no duplication)
- Only files that differ between versions are added to store
- Significantly reduces disk usage for multiple projects

### Installation Process

1. **Dependency resolution** - Identify and fetch required dependencies to store
2. **Directory structure calculation** - Calculate node_modules structure
3. **Linking dependencies** - Hard link files from store to node_modules

### node_modules Structure

pnpm uses a strict, symlinked structure:

- Files are hard linked from content-addressable store
- Symbolic links create the nested dependency graph
- Packages can only access dependencies declared in their package.json
- No phantom dependencies (unlike npm's hoisting)

### Hard Links vs Symlinks

- **Hard links**: Share the same inode on disk (zero additional space)
- **Symlinks**: Point to another location in the filesystem
- pnpm uses hard links for file content, symlinks for directory structure
- This avoids circular symlinks and maintains Node.js compatibility

## Proper Implementation

### Project Setup

```bash
# Install pnpm (via Corepack)
corepack enable
corepack prepare pnpm@11 --activate

# Or standalone
npm install -g pnpm

# Initialize project
pnpm init
```

### package.json Configuration

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@11.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  }
}
```

### pnpm-workspace.yaml (Monorepo)

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: ^19.0.0
  react-dom: ^19.0.0
  typescript: ^5.9.0
  vitest: ^4.0.0

catalogs:
  react18:
    react: ^18.3.1
    react-dom: ^18.3.1

catalogMode: strict
```

### Workspace Protocol

```json
// packages/ui/package.json
{
  "name": "@my-org/ui",
  "version": "1.0.0",
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}

// apps/web/package.json
{
  "name": "@my-org/web",
  "dependencies": {
    "@my-org/ui": "workspace:*",
    "react": "catalog:"
  }
}
```

### Catalog Usage

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^19.0.0
  typescript: ^5.9.0
```

```json
// package.json
{
  "dependencies": {
    "react": "catalog:",
    "typescript": "catalog:"
  }
}
```

### Security Configuration

```yaml
# pnpm-workspace.yaml
enablePrePostScripts: false
allowBuilds:
  - sharp
  - esbuild
  - canvas

# .npmrc (auth/registry only)
registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

### Configuration Files (pnpm 11+)

- **`.npmrc`** - Registry and auth settings only
- **`pnpm-workspace.yaml`** - Workspace and pnpm-specific settings
- **`~/.config/pnpm/config.yaml`** - Global pnpm configuration
- **`~/.config/pnpm/auth.ini`** - Global auth configuration

**Note:** pnpm no longer reads settings from `package.json#pnpm` field. Use
`pnpm-workspace.yaml`.

## Advanced Patterns

### Workspace Release Management

```bash
pnpm change @my-org/ui minor "Add button"  # Record change
pnpm change status                         # View pending
pnpm version -r                            # Bump versions
pnpm publish -r                            # Publish all
```

### Release Lanes

```bash
pnpm lane create experimental              # Create lane
pnpm version --lane experimental          # Release to lane
pnpm lane merge experimental              # Merge to main
```

### Overrides

```yaml
overrides:
  'lodash@': ' ' # Converge versions
  react: 'catalog:' # Force catalog version
  'pkg>old-dep': 'new-dep@^2.0.0' # Override transitive
```

### Workspace Protocol

```yaml
saveWorkspaceProtocol: rolling # workspace:^, workspace:~
# true = workspace:2.5.0, false = ^2.5.0
```

### Global Virtual Store

```yaml
enableGlobalVirtualStore: true # Shared store, faster worktrees
```

### Build Approval

```bash
pnpm approve-builds  # Interactive
# Or configure:
allowBuilds: [sharp, esbuild, node-gyp]
```

### Multi-Catalog

```yaml
catalogs:
  react18:
    react: ^18.3.1
    react-dom: ^18.3.1
```

```json
{ "dependencies": { "react": "catalog:react18" } }
```

### Cycle Prevention

```yaml
disallowWorkspaceCycles: true
```

## Anti-Patterns

**1. shamefully-hoist=true** - Breaks isolation. Use `publicHoistPattern` for
specific packages.

**2. Mixing npm/pnpm** - Lockfile mismatch. Delete `package-lock.json`, use pnpm
consistently.

**3. Phantom dependencies** - Importing undeclared deps. Add explicitly:
`pnpm add <package>`.

**4. Circular workspace deps** - A→B→A breaks builds. Extract shared code to
separate package.

**5. Missing prepublishOnly** - Build not run before publish. Add:
`"prepublishOnly": "pnpm build"`.

**6. No files field** - Publishes everything. Explicit allowlist:
`"files": ["dist", "README.md"]`.

**7. workspace:^ for tight coupling** - Allows drift. Use `workspace:*` for
exact version.

**8. Ignoring catalogMode** - Catalogs become advisory. Set
`catalogMode: strict`.

**9. Not using pnpm why** - Guessing dependency issues. Use
`pnpm why <package>`.

**10. Disabling security** - `enablePrePostScripts: true` reintroduces risk. Use
`allowBuilds` whitelist.

## Performance Optimization

### Disk Space & Speed

- **50-80% disk savings** via content-addressable store with hard links
- **2x faster** than npm/Yarn classic (resolve → calculate → link)
- **SQLite-backed store index** (v11) reduces syscalls
- **Global virtual store** enables instant installs for cached packages

### CI/CD Cache

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 11
- id: pnpm-cache
  run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT
- uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

### Store Configuration

```bash
pnpm store path                    # Check store location
pnpm config set store-dir /path    # Set custom location
```

**Critical:** Store must be on same filesystem as installations for hard linking
benefits.

## Security Best Practices

### Supply Chain Protection

```yaml
minimumReleaseAge: 1440 # 1 day in minutes
blockExoticSubdeps: true
enablePrePostScripts: false
allowBuilds:
  - sharp
  - esbuild
```

### Authentication

```ini
# .npmrc (never commit tokens)
registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
@my-org:registry=https://npm.my-org.com/
```

### Auditing

```bash
pnpm audit                     # Check vulnerabilities
pnpm audit --fix              # Auto-fix
pnpm sbom --output sbom.json  # Generate SBOM
```

## Monorepo Best Practices

### Workspace Structure

```
monorepo/
├── pnpm-workspace.yaml
├── packages/ (ui, utils, contracts)
└── apps/ (web, mobile)
```

### Shared Lockfile

```yaml
sharedWorkspaceLockfile: true # Single source of truth, faster installs
```

### Internal Dependencies

```json
{
  "dependencies": {
    "@my-org/ui": "workspace:*",      # Exact version
    "@my-org/utils": "workspace:^"   # Caret range
  }
}
```

### Catalog Enforcement

```yaml
catalog:
  react: ^19.0.0
  typescript: ^5.9.0
catalogMode: strict
overrides:
  react: 'catalog:'
  typescript: 'catalog:'
```

## Troubleshooting

### Dependency Issues

```bash
pnpm why <package>              # Show dependency tree
pnpm why <package> --depth=0    # Check if direct
pnpm doctor                      # Diagnose installation
```

### Cache & Permissions

```bash
pnpm store prune                # Clear unreferenced packages
rm -rf ~/.pnpm-store            # Clear all caches
sudo chown -R $(whoami) ~/.pnpm-store  # Fix permissions
```

### Windows Symlinks

- Enable Developer Mode for symlink support
- pnpm uses junctions when Developer Mode is off
- Run as administrator for permission issues

## Migration from npm

```bash
pnpm import                    # Convert package-lock.json
pnpm add <missing-package>     # Fix phantom dependencies
```

**Script changes:**

- `npx` → `pnpm dlx` or `pnx`
- `npm run build -- --watch` → `pnpm build --watch`
- No `--` flag separator needed

## CLI Commands Reference

### Package Management

#### pnpm add

Install packages as dependencies.

```bash
pnpm add <package>              # Add to dependencies
pnpm add -D <package>           # Add to devDependencies
pnpm add -O <package>           # Add to optionalDependencies
pnpm add -g <package>           # Install globally
pnpm add <package>@next         # Install from tag
pnpm add <package>@3.0.0        # Specify version
```

#### pnpm remove

Remove packages from node_modules and package.json.

```bash
pnpm remove <package>           # Remove from dependencies
pnpm remove -D <package>        # Remove from devDependencies
pnpm remove -r <package>        # Remove from all workspace packages
```

#### pnpm update

Update packages to latest versions based on ranges.

```bash
pnpm update                     # Update all dependencies
pnpm update --latest            # Update to latest (major bumps allowed)
pnpm update foo@2              # Update foo to latest v2
pnpm update "@babel/*"          # Update all @babel packages
pnpm update -i                  # Interactive mode
```

#### pnpm outdated

Check for outdated packages.

```bash
pnpm outdated                   # Check all packages
pnpm outdated -r                # Check in all workspace packages
pnpm outdated -D                # Check only devDependencies
pnpm outdated --long            # Print detailed info
```

#### pnpm install

Install all dependencies from lockfile.

```bash
pnpm install                    # Install dependencies
pnpm install --offline          # Install from store only
pnpm install --frozen-lockfile  # Don't update lockfile
pnpm install --lockfile-only    # Only update lockfile
pnpm install --dry-run          # Preview changes
pnpm install --force            # Force reinstall
```

### Execution

#### pnpm exec

Execute shell commands in project scope (adds node_modules/.bin to PATH).

```bash
pnpm exec jest                  # Run jest from node_modules/.bin
pnpm jest                       # Same as above (if no conflict)
pnpm -r exec jest               # Run in all workspace packages
```

#### pnpm dlx / pnx

Fetch package from registry and execute without installing.

```bash
pnpm dlx create-vue my-app       # Run create-vue without installing
pnpx create-react-app my-app    # Alias for pnpm dlx
pnpm dlx --shell-mode 'echo hi'  # Run in shell
```

**Difference from exec:** `dlx` downloads from registry, `exec` runs local
binaries.

### Inspection

#### pnpm list / ls

List installed packages.

```bash
pnpm ls                         # List direct dependencies (depth 0)
pnpm ls --depth Infinity        # List all dependencies
pnpm ls --depth -1              # List projects only (workspace)
pnpm ls -r                      # List recursively in workspace
pnpm ls --json                  # Output as JSON
```

#### pnpm why

Show why a package is installed.

```bash
pnpm why <package>               # Show dependency tree
pnpm why <package> --depth=0     # Check if direct dependency
```

#### pnpm root

Print effective modules directory.

```bash
pnpm root                       # Project node_modules path
pnpm root -g                    # Global node_modules path
```

### Patching

#### pnpm patch

Create and apply patches to dependencies.

```bash
# Step 1: Prepare patch
pnpm patch <package>@<version>  # Extract to temp directory

# Step 2: Edit the extracted files
code /tmp/xxx...                # Edit in editor

# Step 3: Commit patch
pnpm patch-commit /tmp/xxx...   # Generate patch file

# Remove patch
pnpm patch-remove <package>@<version>
```

**Configuration:** Patches stored in `patches/` directory and referenced in
`package.json`:

```json
{
  "pnpm": {
    "patchedDependencies": {
      "express@4.18.1": "patches/express@4.18.1.patch"
    }
  }
}
```

### Publishing

#### pnpm publish

Publish package to registry.

```bash
pnpm publish                    # Publish to registry
pnpm publish --tag next         # Publish with tag
pnpm publish --access public    # Set access level
pnpm -r publish                 # Publish all workspace packages
pnpm publish --dry-run          # Preview without publishing
```

#### pnpm pack

Create tarball from package.

```bash
pnpm pack                       # Create tarball
pnpm pack --pack-destination ./dist  # Custom output dir
```

#### pnpm dist-tag

Manage distribution tags.

```bash
pnpm dist-tag add foo@1.2.0 next    # Tag version
pnpm dist-tag rm foo next            # Remove tag
pnpm dist-tag ls foo                 # List tags
```

### Workspace Management

#### pnpm filter

Run commands on specific packages.

```bash
pnpm --filter @my-org/web build      # Run on specific package
pnpm --filter "./apps/*" test        # Run on pattern
pnpm --filter ...@my-org/ui build    # Run on dependents
pnpm --filter @my-org/ui... build    # Run on dependencies
```

#### pnpm -r / --recursive

Run command in all workspace packages.

```bash
pnpm -r build                 # Build all packages
pnpm -r --filter "./apps/*" build  # Build matching packages
```

### Store Management

#### pnpm store

Manage the content-addressable store.

```bash
pnpm store path               # Show store path
pnpm store add <package>      # Add to store without project
pnpm store prune              # Remove unreferenced packages
pnpm store status             # Check for modified packages
```

### Configuration

#### pnpm config

Manage configuration files.

```bash
pnpm config get <key>         # Get config value
pnpm config set <key> <value> # Set config value
pnpm config delete <key>      # Remove config
pnpm config list              # List all config
pnpm config set -g <key>      # Set globally
pnpm config set --location project <key>  # Set in workspace
```

**Configuration files (v11+):**

- `.npmrc` - Registry and auth settings only
- `pnpm-workspace.yaml` - Workspace and pnpm settings
- `~/.config/pnpm/config.yaml` - Global pnpm config
- `~/.config/pnpm/auth.ini` - Global auth config

### Environment Variables

pnpm uses `pnpm_config_*` prefix (not `npm_config_*`):

```bash
pnpm_config_registry=https://registry.npmjs.org pnpm install
pnpm_config_save_exact=true pnpm add foo
```

**Security note (v11.5.3+):** Environment variables are NOT expanded in
repository-controlled files (`.npmrc`, `pnpm-workspace.yaml`) for registry URLs
and credentials to prevent secret exfiltration. Use trusted locations:

- User-level `~/.npmrc` or `~/.config/pnpm/auth.ini`
- Global config via `pnpm config set`
- Environment variables directly
- CLI options

**URL-scoped auth via env (v11.6+):**

```bash
env "pnpm_config_//registry.npmjs.org/:_authToken=$NPM_TOKEN" pnpm install
```

## Advanced Configuration

### Peer Dependency Settings

Configure in `pnpm-workspace.yaml`:

```yaml
# Auto-install missing peers (default true)
autoInstallPeers: true

# Fail on missing/invalid peers
strictPeerDependencies: false

# Resolve peers from workspace root (default)
resolvePeersFromWorkspaceRoot: true

# Deduplicate peer dependents
dedupePeerDependents: true

# Peer dependency rules
peerDependencyRules:
  ignoreMissing:
    - '@babel/*'
    - eslint
  allowedVersions:
    react: '17 || 18'
    'button@2>react': '17' # Only for button@2's peers
  allowAny:
    - '@types/*'
```

### Hoisting Configuration

```yaml
# Hoist to virtual store (default: all)
hoistPattern:
  - '*'

# Hoist to root node_modules (default: none)
publicHoistPattern:
  - '*types*'
  - '*eslint*'
  - '!@types/react' # Exclude specific

# Shamefully hoist all (same as publicHoistPattern: ['*'])
shamefullyHoist: true # NOT RECOMMENDED
```

**Use cases:** Tools with broken resolution (plugins, CLIs).

### Virtual Store Configuration

```yaml
# Linker type: isolated (default), hoisted, pnp
nodeLinker: isolated

# Virtual store location (default: node_modules/.pnpm)
virtualStoreDir: .pnpm

# Global virtual store (experimental for projects)
enableGlobalVirtualStore: true

# Use symlinks (default: true)
symlink: true
```

**Global virtual store:** Single shared store across projects, faster for git
worktrees. Default for global installs and `pnpm dlx` in v11.

### Dependency Resolution

```yaml
# Minimum age for packages (minutes, default: 1440 = 1 day)
minimumReleaseAge: 1440

# Block exotic subdependencies
blockExoticSubdeps: true

# Allowed deprecated versions
allowedDeprecatedVersions:
  - '@types/node'

# Ignore optional dependencies
ignoredOptionalDependencies:
  - fsevents

# Update configuration
updateConfig:
  ignoreDependencies:
    - eslint
```

### Build Script Control

```yaml
# Allow build scripts for specific packages
allowBuilds:
  - sharp
  - esbuild
  - canvas

# Enable pre/post scripts
enablePrePostScripts: false

# Ignore all scripts
ignoreScripts: false
```

## Hooks and Lifecycle Scripts

### pnpmfile.mjs / .pnpmfile.cjs

Hook into installation process:

```javascript
export default {
  hooks: {
    // Mutate dependency package.json
    readPackage(pkg, context) {
      pkg.scripts = {}; // Remove scripts
      return pkg;
    },

    // Mutate lockfile before serialization
    afterAllResolved(lockfile, context) {
      return lockfile;
    },

    // Modify package.json before packing
    beforePacking(pkg) {
      delete pkg.devDependencies;
      return pkg;
    },

    // Modify configuration
    updateConfig(config) {
      config.enablePrePostScripts = false;
      return config;
    },
  },
};
```

### Lifecycle Scripts

**Standard npm scripts:** `preinstall`, `install`, `postinstall`, `prepublish`,
`prepublishOnly`, `prepack`, `prepare`, `postpack`, `publish`, `postpublish`

**pnpm-specific:**

- `pnpm:devPreinstall` - Runs before any dependency install (local only, root
  only)

**Environment variables:**

- `npm_package_name` - Package name
- `npm_package_version` - Package version
- `npm_lifecycle_event` - Script name (e.g., "postinstall")
- `npm_command` - Executed command (e.g., "run-script")

### Script Execution

```bash
# Run script
pnpm run build
pnpm build  # Alias (if no conflict)

# Run multiple scripts matching regex
pnpm run "/^build:.*/"

# Sequential execution
pnpm run --sequential "/^build:.*/"

# Parallel execution
pnpm run --parallel build

# Recursive execution
pnpm -r run build

# Resume from specific package
pnpm -r --resume-from @my-org/web build
```

## Resources

- [Official pnpm Documentation](https://pnpm.io)
- [pnpm GitHub Repository](https://github.com/pnpm/pnpm)
- [Workspace Documentation](https://pnpm.io/workspaces)
- [Catalogs Documentation](https://pnpm.io/catalogs)
- [Motivation](https://pnpm.io/motivation)
- [FAQ](https://pnpm.io/faq)
- [Settings Reference](https://pnpm.io/settings)
- [CLI Reference](https://pnpm.io/pnpm-cli)
