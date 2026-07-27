/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    /*
     * ============================================
     * CORE RULES - Basic Dependency Hygiene
     * ============================================
     */
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'This dependency is part of a circular relationship. You might want to revise ' +
        'your solution (i.e. use dependency inversion, make sure the modules have a single responsibility)',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'This module is an orphan (no dependencies and no dependents). ' +
        'It might be leftover from a refactoring or unfinished feature.',
      from: {
        orphan: true,
        pathNot: ['\\.d\\.ts$', '\\.test\\.ts$', '\\.spec\\.ts$'],
      },
      to: {},
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment:
        'This module depends on a module that cannot be resolved. ' +
        'Either it does not exist or the import path is incorrect.',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment:
        'This module depends on an external npm module that is not in package.json. ' +
        'Add it to the appropriate dependencies section.',
      from: {},
      to: {
        dependencyTypes: ['npm-unknown'],
      },
    },
    {
      name: 'no-duplicate-dep-types',
      severity: 'warn',
      comment:
        'This dependency occurs more than once in package.json ' +
        '(e.g. as both devDependency and dependency).',
      from: {},
      to: {
        moreThanOneDependencyType: true,
      },
    },

    /*
     * ============================================
     * TEST ISOLATION RULES
     * ============================================
     */
    {
      name: 'not-to-test',
      severity: 'error',
      comment: 'Production code should not depend on test code.',
      from: {
        pathNot: ['\\.test\\.ts$', '\\.spec\\.ts$', '__tests__'],
      },
      to: {
        path: ['\\.test\\.ts$', '\\.spec\\.ts$', '__tests__'],
      },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment:
        'Production code should not depend on devDependencies. ' +
        'Move the dependency to dependencies if needed.',
      from: {
        path: ['^apps/', '^packages/'],
        pathNot: ['\\.test\\.ts$', '\\.spec\\.ts$'],
      },
      to: {
        dependencyTypes: ['npm-dev'],
      },
    },

    /*
     * ============================================
     * ARCHITECTURAL LAYERING RULES
     * Based on AGENTS.md layering conventions
     * ============================================
     */
    {
      name: 'packages-contracts-no-deps',
      severity: 'error',
      comment:
        'packages/contracts should have no dependencies on other packages. ' +
        'It is the foundation layer - only Zod schemas and API contracts.',
      from: {
        path: '^packages/contracts/',
      },
      to: {
        path: ['^packages/(?!contracts)', '^apps/'],
      },
    },
    {
      name: 'packages-database-only-contracts',
      severity: 'error',
      comment:
        'packages/database should only depend on packages/contracts. ' + 'Drizzle schema layer.',
      from: {
        path: '^packages/database/',
      },
      to: {
        path: ['^packages/(?!contracts|database)', '^apps/'],
      },
    },
    {
      name: 'packages-api-client-only-contracts',
      severity: 'error',
      comment:
        'packages/api-client should only depend on packages/contracts. ' +
        'Typed API client layer.',
      from: {
        path: '^packages/api-client/',
      },
      to: {
        path: ['^packages/(?!contracts|api-client)', '^apps/'],
      },
    },
    {
      name: 'packages-mobile-data-only-contracts',
      severity: 'error',
      comment:
        'packages/mobile-data should only depend on packages/contracts. ' +
        'PowerSync schema layer.',
      from: {
        path: '^packages/mobile-data/',
      },
      to: {
        path: ['^packages/(?!contracts|mobile-data)', '^apps/'],
      },
    },
    {
      name: 'packages-ui-allowed-deps',
      severity: 'error',
      comment:
        'packages/ui should only depend on React, Tamagui, and allowed packages. ' +
        'Shared UI components layer.',
      from: {
        path: '^packages/ui/',
      },
      to: {
        path: ['^packages/(?!ui)', '^apps/'],
        dependencyTypesNot: ['npm'],
      },
    },

    /*
     * ============================================
     * CLIENT-SERVER SEPARATION RULES
     * Complements ESLint import-x/no-restricted-paths
     * ============================================
     */
    {
      name: 'web-no-server-imports',
      severity: 'error',
      comment:
        'Web client should not import from server code (api, worker, database). ' +
        'Use packages/api-client instead.',
      from: {
        path: '^apps/web/',
      },
      to: {
        path: ['^apps/api/', '^apps/worker/', '^packages/database/'],
      },
    },
    {
      name: 'mobile-no-server-imports',
      severity: 'error',
      comment:
        'Mobile client should not import from server code (api, worker, database). ' +
        'Use packages/mobile-data instead.',
      from: {
        path: '^apps/mobile/',
      },
      to: {
        path: ['^apps/api/', '^apps/worker/', '^packages/database/'],
      },
    },
    {
      name: 'api-client-no-server',
      severity: 'error',
      comment:
        'API client should not import from API server code or database. ' +
        'It should be a pure client library.',
      from: {
        path: '^packages/api-client/',
      },
      to: {
        path: ['^apps/api/', '^packages/database/'],
      },
    },

    /*
     * ============================================
     * APP-SPECIFIC RULES
     * ============================================
     */
    {
      name: 'api-allowed-deps',
      severity: 'error',
      comment:
        'API server should only depend on contracts and database packages. ' + 'Backend layer.',
      from: {
        path: '^apps/api/',
      },
      to: {
        path: ['^packages/(?!contracts|database)', '^apps/(?!api)'],
      },
    },
    {
      name: 'worker-allowed-deps',
      severity: 'error',
      comment:
        'Background worker should only depend on contracts and database packages. ' +
        'Backend layer.',
      from: {
        path: '^apps/worker/',
      },
      to: {
        path: ['^packages/(?!contracts|database)', '^apps/(?!worker)'],
      },
    },
    {
      name: 'web-allowed-deps',
      severity: 'error',
      comment:
        'Web app should depend on ui, contracts, and api-client packages. ' + 'Frontend layer.',
      from: {
        path: '^apps/web/',
      },
      to: {
        path: ['^packages/(?!ui|contracts|api-client)', '^apps/(?!web)'],
      },
    },
    {
      name: 'mobile-allowed-deps',
      severity: 'error',
      comment:
        'Mobile app should depend on ui, contracts, mobile-data, and api-client packages. ' +
        'Frontend layer.',
      from: {
        path: '^apps/mobile/',
      },
      to: {
        path: ['^packages/(?!ui|contracts|mobile-data|api-client)', '^apps/(?!mobile)'],
      },
    },

    /*
     * ============================================
     * DEPRECATED MODULE RULES
     * ============================================
     */
    {
      name: 'no-deprecated-core',
      severity: 'error',
      comment: 'This module depends on a deprecated Node.js core module.',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: [
          '^domain$',
          '^events$',
          '^http$',
          '^https$',
          '^punycode$',
          '^querystring$',
          '^sys$',
          '^timers$',
          '^url$',
          '^util$',
        ],
      },
    },
  ],

  options: {
    /*
     * ============================================
     * MONOREPO CONFIGURATION
     * ============================================
     */
    // Merge package.json dependencies from root down to source file
    // Essential for pnpm workspaces with workspace:* protocol
    combinedDependencies: true,

    // TypeScript configuration for path aliases and compilation
    // Uses root tsconfig.json with project references
    tsConfig: {
      fileName: './tsconfig.json',
    },

    // Module systems to analyze - limit to what we actually use for performance
    moduleSystems: ['es6', 'cjs'],

    // Use TypeScript AST directly for better performance
    tsPreCompilationDeps: true,

    // Extensions to resolve - limit to what we actually use
    // Performance optimization, especially on Windows with slow I/O
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      // Resolve workspace protocol and TypeScript path aliases
      conditionNames: ['node', 'import', 'require', 'default', 'types'],
    },

    // Main fields to check in package.json
    mainFields: ['main', 'types', 'typings', 'module', 'exports'],

    /*
     * ============================================
     * EXCLUSION FILTERS
     * ============================================
     */
    // Exclude common directories from analysis
    exclude: {
      path: [
        '^node_modules',
        '^\\.next',
        '^dist',
        '^build',
        '^coverage',
        '^\\.turbo',
        '^\\.git',
        '^supabase/\\.temp',
      ],
    },

    // Don't follow these dependencies
    doNotFollow: {
      path: ['^node_modules'],
    },

    /*
     * ============================================
     * PERFORMANCE OPTIMIZATION
     * ============================================
     */
    // Skip analysis that doesn't serve any rules
    // Reduces runtime by skipping cycle/dependent/orphan analysis when not needed
    skipAnalysisNotInRules: false, // Keep false for now as we use cycle detection

    // Cache duration for enhanced-resolve (default 4000ms works well for most repos)
    // Lower if experiencing memory issues on very large repos
    cacheDuration: 4000,

    // Preserve symlinks (false is Node.js default since v6)
    preserveSymlinks: false,

    /*
     * ============================================
     * REPORTER OPTIONS
     * ============================================
     */
    reporterOptions: {
      dot: {
        // Collapse pattern for dependency graphs
        // Summarize to package level for better visualization
        collapsePattern: '^packages/[^/]+|^apps/[^/]+',
        // Show metrics in graph
        showMetrics: true,
      },
      archi: {
        // High-level architecture graph
        collapsePattern: '^packages/|^apps/',
      },
      // Markdown reporter for GitHub Actions summaries
      markdown: {
        // Include summary section
        includeSummary: true,
        // Include details section
        includeDetails: true,
        // Include footer
        includeFooter: true,
      },
    },
  },
};
