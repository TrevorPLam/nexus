/**
 * TypeScript declarations for Expo environment variables.
 * Extends the global namespace with Expo configuration types.
 */

declare global {
  namespace Expo {
    type Config = typeof import('./app.json');
  }
}

export {};
