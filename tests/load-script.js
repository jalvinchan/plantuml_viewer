import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadScript(relativePath) {
  const code = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  window.eval(code);
}
