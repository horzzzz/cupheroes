// Entry point for `npm run balance`. Installs the `.ts`-import hooks from
// `scripts/ts-loader.mjs`, then dynamically imports the actual harness --
// `register()` only affects loads that happen *after* it runs, so the
// harness itself has to be a lazy `import()`, not a static one up top.
import { register } from 'node:module';

register(new URL('../ts-loader.mjs', import.meta.url));

await import('./sim.ts');
