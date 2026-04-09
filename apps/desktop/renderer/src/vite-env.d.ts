/// <reference types="vite/client" />

declare global {
  interface Window {
    desktopApi: {
      auth: {
        login: () => Promise<unknown>;
        session: {
          get: () => Promise<unknown>;
        };
      };
      plan: {
        generate: () => Promise<unknown>;
      };
    };
  }
}

export {};
