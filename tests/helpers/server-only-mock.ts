/**
 * server-only-mock.ts
 *
 * Vitest alias for Next.js's 'server-only' package.
 * The real package throws at runtime if imported in a client bundle.
 * In the Vitest environment there is no client/server boundary, so we
 * provide a no-op replacement so tests can import server-side modules
 * that include `import 'server-only'` without crashing.
 */

const serverOnlyMock = {};

export default serverOnlyMock;
