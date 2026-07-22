declare global {
  namespace Expo {
    type Config = typeof import('./app.json');
  }
}

export {};
