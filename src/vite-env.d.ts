/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the alfa-leetcode-api instance (build-time default). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
