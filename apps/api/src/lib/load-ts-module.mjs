import { Buffer } from 'node:buffer';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';

// Test chạy bằng Node built-in runner; bundle file .ts bằng esbuild có sẵn trong wrangler,
// không cài thêm thư viện. Chỉ dùng trong file *.test.mjs.
const require = createRequire(
  realpathSync(fileURLToPath(new URL('../../node_modules/wrangler/package.json', import.meta.url))),
);
const { buildSync } = require('esbuild');

export function loadTsModule(url) {
  const built = buildSync({
    entryPoints: [fileURLToPath(url)],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  });
  const source = Buffer.from(built.outputFiles[0].text).toString('base64');
  return import(`data:text/javascript;base64,${source}`);
}
