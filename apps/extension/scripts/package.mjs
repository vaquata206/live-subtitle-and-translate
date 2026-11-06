// Zips dist/ into a Chrome Web Store upload package: dist-zip/<name>-<version>.zip
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.json'), 'utf8'));
const outDir = resolve(root, 'dist-zip');
const out = resolve(outDir, `live-subtitles-${manifest.version}.zip`);

mkdirSync(outDir, { recursive: true });
rmSync(out, { force: true });
// Source maps are excluded from the store package.
if (process.platform === 'win32') {
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `$files = Get-ChildItem -Path '${dist}' -Recurse -File | Where-Object { $_.Extension -ne '.map' }; ` +
        `Push-Location '${dist}'; Compress-Archive -Path ($files | Resolve-Path -Relative) -DestinationPath '${out}'; Pop-Location`,
    ],
    { stdio: 'inherit' },
  );
} else {
  execFileSync('zip', ['-r', '-q', out, '.', '-x', '*.map'], { cwd: dist, stdio: 'inherit' });
}
console.info('Packaged', out);
