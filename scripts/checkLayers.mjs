// Enforces the dependency rules: shared ← engine ← game, domains never import each other,
// and domain model code (state/rules/handlers) never touches Pixi.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const aliases = { '@shared/': 'src/shared/', '@engine/': 'src/engine/', '@game/': 'src/game/' };

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });
}

function imports(path) {
  const text = readFileSync(path, 'utf8');
  return [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

function target(fromFile, specifier) {
  for (const [alias, dir] of Object.entries(aliases)) {
    if (specifier.startsWith(alias)) return join(root, dir, specifier.slice(alias.length));
  }
  return specifier.startsWith('.') ? resolve(dirname(fromFile), specifier) : specifier;
}

const area = (path) => relative(src, path).split(sep);
const errors = [];

for (const file of files(src)) {
  const [layer, group, domain, part] = area(file);
  const isTest = file.endsWith('.test.ts');
  for (const specifier of imports(file)) {
    const to = target(file, specifier);
    const external = !to.startsWith(root);
    const [toLayer, toGroup, toDomain] = external ? [] : area(to);
    const where = `${relative(root, file)} → ${specifier}`;

    if (layer === 'shared' && (external || toLayer !== 'shared')) errors.push(`shared must import nothing: ${where}`);
    if (layer === 'engine' && toLayer === 'game') errors.push(`engine must not import game: ${where}`);
    if (layer === 'game' && group === 'domains' && !isTest) {
      if (toGroup === 'domains' && toDomain !== domain) errors.push(`domain "${domain}" imports domain "${toDomain}": ${where}`);
      if (toLayer === 'game' && (toGroup === 'boot' || toGroup === 'screens')) errors.push(`domain imports ${toGroup}: ${where}`);
      if (['state', 'rules', 'handlers'].includes(part) && specifier === 'pixi.js') errors.push(`model code imports Pixi: ${where}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Layer violations (${errors.length}):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('Layers OK: shared ← engine ← game, domains isolated, model code Pixi-free.');
