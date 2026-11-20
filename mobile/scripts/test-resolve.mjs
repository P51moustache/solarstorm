/**
 * Lets `node --test` run the app's plain TypeScript modules without a bundler:
 *  - resolves the `@/` alias to `src/`, as tsconfig.json and Metro do;
 *  - adds the `.ts` extension Node requires on relative and aliased imports;
 *  - swaps native-only packages for in-memory stand-ins.
 * Node removes the type annotations itself (v23.6 and later). Files with JSX cannot run here.
 */
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../src/', import.meta.url);

const stub = (source) => `data:text/javascript,${encodeURIComponent(source)}`;

/** Native modules the pure code imports but tests must not load. */
const STUBS = {
  '@react-native-async-storage/async-storage': stub(
    'export default { getItem: async () => null, setItem: async () => {} };'
  ),
};

const HAS_EXTENSION = /\.[cm]?[jt]sx?$|\.json$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };

    let target = specifier.startsWith('@/') ? new URL(specifier.slice(2), SRC).href : specifier;
    const isFile = target.startsWith('.') || target.startsWith('file:');
    if (isFile && !HAS_EXTENSION.test(target)) {
      const withTs = `${new URL(target, context.parentURL).href}.ts`;
      if (existsSync(fileURLToPath(withTs))) target = withTs;
    }
    return nextResolve(target, context);
  },
});
