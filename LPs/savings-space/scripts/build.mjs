import {build} from 'esbuild';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await build({
  entryPoints:[resolve(root,'dist/app.mjs')],
  outfile:resolve(root,'dist/app.js'),
  bundle:true,
  format:'iife',
  platform:'browser',
  target:['es2020'],
  charset:'utf8',
  legalComments:'none'
});
console.log('Browser bundle ready: works over HTTP and when opening index.html directly.');
