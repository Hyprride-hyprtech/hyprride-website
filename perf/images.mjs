// Generates the smaller copies of the site's pictures that the srcset
// attributes in the pages point at. Needs sharp:
//   npm i sharp            (anywhere; then NODE_PATH=<that>/node_modules)
//   node perf/images.mjs
import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// folder -> widths (the original stays as the largest candidate)
const plan = {
  scenes: { widths: [480, 768, 1024, 1200], skip: /^scene-/, webp: { quality: 78, smartSubsample: true, effort: 6 } },
  fleet: { widths: [540, 810], webp: { quality: 80, smartSubsample: true, effort: 6 } },
  brand: { widths: [216, 432], webp: { quality: 86, alphaQuality: 95, effort: 6 } },
};

const made = [];
for (const [folder, { widths, skip, webp }] of Object.entries(plan)) {
  const dir = join(root, folder);
  const generated = new RegExp(`-(${widths.join('|')})\\.webp$`);
  const sources = readdirSync(dir).filter((f) => extname(f) === '.webp' && !generated.test(f) && !(skip && skip.test(f)));
  for (const file of sources) {
    const src = join(dir, file);
    const meta = await sharp(src).metadata();
    for (const w of widths) {
      if (w >= meta.width) continue;
      const out = join(dir, `${basename(file, '.webp')}-${w}.webp`);
      await sharp(src).resize({ width: w }).webp(webp).toFile(out);
      made.push(`${folder}/${basename(out)} ${statSync(out).size} B`);
    }
  }
}
console.log(made.join('\n'));
