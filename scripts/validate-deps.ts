#!/usr/bin/env tsx
/**
 * Dependency validation script for Life OS monorepo
 *
 * This script validates common dependency anti-patterns:
 * - Workspace protocol violations (internal deps not using workspace:)
 * - Catalog mode violations (deps not using catalog: when catalogMode is strict)
 * - TypeScript version drift across packages
 * - React/React Native version alignment
 * - Missing test scripts when vitest is in devDependencies
 * - Missing exports field in packages
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

interface PackageJson {
  name: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: Record<string, string> | string;
}

interface WorkspaceConfig {
  packages: string[];
  catalogMode?: 'strict' | 'loose';
  catalogs?: {
    default?: Record<string, string>;
  };
}

interface Violation {
  type: string;
  package: string;
  message: string;
  severity: 'error' | 'warning';
}

const violations: Violation[] = [];

// Read and parse JSON file
function readJson<T>(path: string): T | null {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Get all package.json files
function getPackageJsons(): { path: string; pkg: PackageJson }[] {
  const results: { path: string; pkg: PackageJson }[] = [];

  const scanDir = (baseDir: string) => {
    if (!existsSync(baseDir)) return;

    const entries = readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pkgPath = join(baseDir, entry.name, 'package.json');
        const pkg = readJson<PackageJson>(pkgPath);
        if (pkg) {
          results.push({ path: pkgPath, pkg });
        }
      }
    }
  };

  scanDir(join(rootDir, 'packages'));
  scanDir(join(rootDir, 'apps'));

  return results;
}

// Read workspace configuration
function getWorkspaceConfig(): WorkspaceConfig | null {
  const workspacePath = join(rootDir, 'pnpm-workspace.yaml');
  if (!existsSync(workspacePath)) return null;

  try {
    const content = readFileSync(workspacePath, 'utf-8');
    const config: WorkspaceConfig = {
      packages: [],
      catalogMode: 'loose',
      catalogs: {},
    };

    // Simple YAML parser for our specific needs
    const lines = content.split('\n');
    let inCatalog = false;
    let currentCatalog: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('catalogMode:')) {
        config.catalogMode = trimmed.split(':')[1].trim() as 'strict' | 'loose';
      } else if (trimmed.startsWith('catalogs:')) {
        inCatalog = true;
      } else if (inCatalog && trimmed.startsWith('default:')) {
        currentCatalog = {};
      } else if (inCatalog && trimmed.match(/^[a-z@]/)) {
        const match = trimmed.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          currentCatalog[match[1].trim()] = match[2].trim();
        }
      } else if (inCatalog && trimmed.startsWith('workspaceSettings:')) {
        inCatalog = false;
        config.catalogs = { default: currentCatalog };
      }
    }

    if (Object.keys(currentCatalog).length > 0) {
      config.catalogs = { default: currentCatalog };
    }

    return config;
  } catch {
    return null;
  }
}

// Get internal package names
function getInternalPackages(packageJsons: { path: string; pkg: PackageJson }[]): Set<string> {
  return new Set(packageJsons.map((p) => p.pkg.name));
}

// Check 1: Workspace protocol violations
function checkWorkspaceProtocol(
  packageJsons: { path: string; pkg: PackageJson }[],
  internalPackages: Set<string>,
) {
  for (const { path, pkg } of packageJsons) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const [depName, depVersion] of Object.entries(allDeps)) {
      if (internalPackages.has(depName) && !depVersion.startsWith('workspace:')) {
        violations.push({
          type: 'workspace-protocol',
          package: pkg.name,
          message: `Internal dependency "${depName}" should use "workspace:" protocol, but uses "${depVersion}"`,
          severity: 'error',
        });
      }
    }
  }
}

// Check 2: Catalog mode violations
function checkCatalogMode(
  packageJsons: { path: string; pkg: PackageJson }[],
  workspaceConfig: WorkspaceConfig | null,
) {
  if (!workspaceConfig || workspaceConfig.catalogMode !== 'strict') {
    return;
  }

  const catalogEntries = workspaceConfig.catalogs?.default || {};

  for (const { path, pkg } of packageJsons) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const [depName, depVersion] of Object.entries(allDeps)) {
      // Skip workspace protocol and non-catalog deps
      if (depVersion.startsWith('workspace:')) continue;
      if (depVersion.startsWith('file:')) continue;
      if (depVersion.startsWith('link:')) continue;
      if (depName.startsWith('@life-os/')) continue; // Internal deps handled by workspace check

      // Check if this dep is in catalog
      if (catalogEntries[depName] && !depVersion.startsWith('catalog:')) {
        violations.push({
          type: 'catalog-protocol',
          package: pkg.name,
          message: `Dependency "${depName}" is in catalog but uses "${depVersion}" instead of "catalog:"`,
          severity: 'error',
        });
      }
    }
  }
}

// Check 3: TypeScript version drift
function checkTypeScriptVersion(packageJsons: { path: string; pkg: PackageJson }[]) {
  const tsVersions: Map<string, string[]> = new Map();

  for (const { pkg } of packageJsons) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const tsVersion = allDeps['typescript'];

    if (tsVersion) {
      if (!tsVersions.has(tsVersion)) {
        tsVersions.set(tsVersion, []);
      }
      tsVersions.get(tsVersion)!.push(pkg.name);
    }
  }

  if (tsVersions.size > 1) {
    const versions = Array.from(tsVersions.entries());
    const [baseVersion, basePkgs] = versions[0];

    for (const [version, pkgs] of versions.slice(1)) {
      violations.push({
        type: 'typescript-drift',
        package: pkgs.join(', '),
        message: `TypeScript version drift: ${basePkgs.join(', ')} uses ${baseVersion}, but ${pkgs.join(', ')} uses ${version}`,
        severity: 'warning',
      });
    }
  }
}

// Check 4: React/React Native version alignment
function checkReactVersions(packageJsons: { path: string; pkg: PackageJson }[]) {
  const reactVersions: Map<string, string[]> = new Map();
  const reactNativeVersions: Map<string, string[]> = new Map();

  for (const { pkg } of packageJsons) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    const reactVersion = allDeps['react'];
    if (reactVersion) {
      if (!reactVersions.has(reactVersion)) {
        reactVersions.set(reactVersion, []);
      }
      reactVersions.get(reactVersion)!.push(pkg.name);
    }

    const reactNativeVersion = allDeps['react-native'];
    if (reactNativeVersion) {
      if (!reactNativeVersions.has(reactNativeVersion)) {
        reactNativeVersions.set(reactNativeVersion, []);
      }
      reactNativeVersions.get(reactNativeVersion)!.push(pkg.name);
    }
  }

  if (reactVersions.size > 1) {
    const versions = Array.from(reactVersions.entries());
    const [baseVersion, basePkgs] = versions[0];

    for (const [version, pkgs] of versions.slice(1)) {
      violations.push({
        type: 'react-drift',
        package: pkgs.join(', '),
        message: `React version drift: ${basePkgs.join(', ')} uses ${baseVersion}, but ${pkgs.join(', ')} uses ${version}`,
        severity: 'warning',
      });
    }
  }

  if (reactNativeVersions.size > 1) {
    const versions = Array.from(reactNativeVersions.entries());
    const [baseVersion, basePkgs] = versions[0];

    for (const [version, pkgs] of versions.slice(1)) {
      violations.push({
        type: 'react-native-drift',
        package: pkgs.join(', '),
        message: `React Native version drift: ${basePkgs.join(', ')} uses ${baseVersion}, but ${pkgs.join(', ')} uses ${version}`,
        severity: 'warning',
      });
    }
  }
}

// Check 5: Missing test scripts when vitest is in devDependencies
function checkTestScripts(packageJsons: { path: string; pkg: PackageJson }[]) {
  for (const { pkg } of packageJsons) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const hasVitest = 'vitest' in allDeps;

    if (hasVitest && !pkg.scripts?.test) {
      violations.push({
        type: 'missing-test-script',
        package: pkg.name,
        message: `Package has vitest in dependencies but no "test" script`,
        severity: 'warning',
      });
    }
  }
}

// Check 6: Missing exports field in packages
function checkExportsField(packageJsons: { path: string; pkg: PackageJson }[]) {
  for (const { path, pkg } of packageJsons) {
    // Only check packages (not apps)
    if (!path.includes('/packages/')) continue;

    if (!pkg.exports) {
      violations.push({
        type: 'missing-exports',
        package: pkg.name,
        message: `Package is missing "exports" field in package.json`,
        severity: 'warning',
      });
    }
  }
}

// Main execution
function main() {
  console.log('🔍 Validating dependencies...\n');

  const packageJsons = getPackageJsons();
  const workspaceConfig = getWorkspaceConfig();
  const internalPackages = getInternalPackages(packageJsons);

  checkWorkspaceProtocol(packageJsons, internalPackages);
  checkCatalogMode(packageJsons, workspaceConfig);
  checkTypeScriptVersion(packageJsons);
  checkReactVersions(packageJsons);
  checkTestScripts(packageJsons);
  checkExportsField(packageJsons);

  if (violations.length === 0) {
    console.log('✅ No dependency violations found!');
    process.exit(0);
  }

  // Group violations by type
  const byType = new Map<string, Violation[]>();
  for (const v of violations) {
    if (!byType.has(v.type)) {
      byType.set(v.type, []);
    }
    byType.get(v.type)!.push(v);
  }

  // Print violations
  for (const [type, typeViolations] of byType) {
    const isError = typeViolations.some((v) => v.severity === 'error');
    const icon = isError ? '❌' : '⚠️';
    console.log(`${icon} ${type} (${typeViolations.length})`);

    for (const v of typeViolations) {
      const severityIcon = v.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${severityIcon} ${v.package}: ${v.message}`);
    }
    console.log();
  }

  const errorCount = violations.filter((v) => v.severity === 'error').length;
  const warningCount = violations.filter((v) => v.severity === 'warning').length;

  console.log(`\nFound ${errorCount} error(s) and ${warningCount} warning(s)`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

main();
