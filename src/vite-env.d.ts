/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_KEY?: string;
  /** CHANTIER 270 — les comptes qui possèdent toutes les apparences, séparés par des virgules. */
  readonly VITE_CREATEURS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
