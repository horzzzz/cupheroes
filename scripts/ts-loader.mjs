// Node ESM loader hooks (`node:module`'s `register()` API) that let a plain
// `node` process import this project's `.ts` files directly -- no ts-node,
// no build step, no new dependency (`typescript` is already a
// devDependency). Used by `scripts/balance/run.mjs` so the balance harness
// exercises the *real* `combat.ts`/`skills.ts`/`constants/*` instead of a
// parallel reimplementation that can quietly drift from the game code (see
// the balance plan for why that happened before).
//
// Handles two things the game's TS files need that a bare Node/TS setup
// doesn't give you for free:
//  - the `@/*` -> `src/*` path alias from `tsconfig.json`, plus bare
//    extensionless relative imports (`./combat` -> `./combat.ts`);
//  - `require('...webp'|'...png'|...)` calls -- Metro's bundler-time asset
//    registration, meaningless outside RN and fatal in plain Node (no
//    `require` even exists in an ESM module). None of the balance numbers
//    depend on icon art, so every asset require is rewritten to a harmless
//    placeholder before the file is compiled.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import ts from 'typescript';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const TS_EXTENSIONS = ['.ts', '.tsx'];
const ASSET_REQUIRE_RE = /require\(\s*(['"])[^'"]+\.(?:webp|png|jpe?g|svg|gif)\1\s*\)/g;

function resolveTsFile(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath;
  for (const ext of TS_EXTENSIONS) {
    const withExt = basePath + ext;
    if (fs.existsSync(withExt)) return withExt;
  }
  for (const ext of TS_EXTENSIONS) {
    const indexPath = path.join(basePath, 'index' + ext);
    if (fs.existsSync(indexPath)) return indexPath;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const resolved = resolveTsFile(path.join(SRC_ROOT, specifier.slice(2)));
    if (!resolved) throw new Error(`ts-loader: cannot resolve "${specifier}" under ${SRC_ROOT}`);
    return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }

  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file://')) {
    const fromDir = path.dirname(fileURLToPath(context.parentURL));
    const resolved = resolveTsFile(path.resolve(fromDir, specifier));
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8').replace(ASSET_REQUIRE_RE, '0');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filePath,
    });
    return { format: 'module', source: outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
