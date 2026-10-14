// Shim Svelte 5 rune globals so `.svelte.ts` store modules load under vitest.
// Logic tests do not need reactive proxies; identity is enough.
(globalThis as Record<string, unknown>).$state = <T>(v: T): T => v;
