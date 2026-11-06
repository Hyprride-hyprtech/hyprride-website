// Applies the loading-speed edits to the exported pages. Safe to run again:
// every edit checks whether it is already in place.
//   node perf/patch.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const save = (f, s) => writeFileSync(join(root, f), s);
const log = [];
const edit = (file, text, label, from, to) => {
  if (typeof from === 'string' ? text.includes(to) : false) return text;
  const next = text.replace(from, to);
  if (next === text) log.push(`  ${file}: ${label} — nothing to change`);
  else log.push(`  ${file}: ${label}`);
  return next;
};

const pages = ['index.html', '404.html', '_not-found.html', 'careers.html', 'future.html', 'privacy.html', 'terms.html'];
const plainPages = ['booking.html', 'knowmore.html'];
const css = '_next/static/chunks/0gww7hkupepax.css';
const gateChunk = '_next/static/chunks/09qyvo33jamr5.js';
const pageChunk = '_next/static/chunks/0iot7uebytd0t.js';

const set = (name, widths, max) => widths.map((w) => `/${name}-${w}.webp ${w}w`).concat(`/${name}.webp ${max}w`).join(', ');
const scene = (n) => set(`scenes/${n}`, [480, 768, 1024, 1200], 1600);
const heroSizes = '(min-width:1180px) 600px, (min-width:1024px) 52vw, calc(100vw - 50px)';
const markLight = set('brand/hr-mark', [216, 432, 648], 864);
const markDark = set('brand/hr-mark-dark', [216, 432, 648], 747);
const splashSizes = '(max-width:531px) 170px, (min-width:1125px) 360px, 32vw';

// Runs at the end of <body>, after the blocking stylesheet, so it starts
// at first paint. Owns the splash so the page never waits for the app code,
// and loads the three waiting slideshow pictures only after the first one
// has painted. The app's MotionGate joins in through window.__hrSplash.
const runner = `<script data-hr-perf="">(function(){var d=document.documentElement,w=window;
function bikes(){var l=document.querySelectorAll('img[data-src]');for(var i=0;i<l.length;i++){var m=l[i];if(m.getAttribute('data-srcset'))m.setAttribute('srcset',m.getAttribute('data-srcset'));m.setAttribute('src',m.getAttribute('data-src'));m.removeAttribute('data-src');m.removeAttribute('data-srcset');}}
var hero=document.querySelector('img.hero-bike'),once=false;function go(){if(once)return;once=true;bikes();}
if(hero&&hero.decode){hero.decode().then(go,go);setTimeout(go,2500);}else setTimeout(go,300);
if(!d.classList.contains('splash')||w.__hrMode)return;
var done;w.__hrSplash=new Promise(function(r){done=r;});clearTimeout(w.__hrGate);
var t0=performance.now(),wait=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
function play(){d.style.setProperty('--intro-base','0.3s');d.classList.remove('wait');d.classList.add('anim','play');done();}
function geo(a,b){var r=a.getBoundingClientRect(),n=b.getBoundingClientRect();a.style.transformOrigin='0 0';return 'translate('+(n.left-r.left)+'px, '+(n.top-r.top)+'px) scale('+(n.width/r.width)+')';}
function out(){w.__hrMode='anim';
var scr=document.querySelector('.splash-screen'),word=document.querySelector('.splash-word'),brand=document.querySelector('.brand-word'),mark=document.querySelector('.splash-mark'),tile=document.querySelector('.brand-tile');
d.classList.remove('splash');d.classList.add('splash-out');var fin=function(){d.classList.remove('splash-out');};
try{if(!scr||!word||!brand||!word.animate)throw 0;
var ease='cubic-bezier(0.76, 0, 0.24, 1)',tw=geo(word,brand),tm=mark&&tile?geo(mark,tile):null;play();
if(tm)mark.animate([{transform:'none'},{transform:tm}],{duration:600,easing:ease,fill:'forwards'});
var h=word.animate([{transform:'none'},{transform:tw}],{duration:650,delay:100,easing:ease,fill:'both'});
var tag=scr.querySelector('.splash-tag');if(tag)tag.animate([{opacity:1},{opacity:0}],{duration:200,fill:'forwards'});
var bg=scr.querySelector('.splash-bg');if(bg)bg.animate([{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 0 100% 0)'}],{duration:600,delay:120,easing:ease,fill:'forwards'});
h.finished.then(fin,fin);setTimeout(fin,2000);}catch(e){play();fin();}}
Promise.race([document.fonts?document.fonts.ready:wait(0),wait(500)]).then(function(){return wait(Math.max(0,750-(performance.now()-t0)));}).then(out,out);
})();</script>`;

// Microsoft Clarity, in its original form and in the deferred form an
// earlier version of this script wrote
const clarity = /<script type="text\/javascript">\(function\(c,l,a,r,i,t,y\)[^<]*<\/script>|<script>\(function\(\)\{function go\(\)\{[^<]*<\/script>/g;

for (const page of pages) {
  let h = read(page);
  const before = h;

  // head: fewer, better-ordered preloads
  h = edit(page, h, 'drop logo preloads', /<link rel="preload" href="\/brand\/hr-mark(-dark)?\.webp" as="image"\/>/g, '');
  h = edit(page, h, 'preload only the splash-word font', /<link rel="preload" href="\/_next\/static\/media\/(satoshi_400|satoshi_500|satoshi_700|797e433ab948586e)[^"]*\.woff2" as="font" crossorigin="" type="font\/woff2"\/>/g, '');
  const heroPreload = '<link rel="preload" as="image" href="/scenes/jupiter.webp" fetchPriority="high"/>';
  if (h.includes(heroPreload)) {
    h = h.replace(heroPreload, '');
    h = h.replace('<meta name="viewport" content="width=device-width, initial-scale=1"/>',
      `<meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="image" href="/scenes/jupiter-1024.webp" imagesrcset="${scene('jupiter')}" imagesizes="${heroSizes}" fetchpriority="high"/>`);
    log.push(`  ${page}: hero preload first, responsive`);
  }
  h = edit(page, h, 'Clarity removed', clarity, '');
  // React re-creates preloads from these payload hint rows after hydration
  h = edit(page, h, 'no logo preload hints', /:HL\[\\"\/brand\/hr-mark(?:-dark)?\.webp\\",\\"image\\"\]\\n/g, '');
  h = edit(page, h, 'static fallback gate 4 s', "d.classList.add('static');},3000);", "d.classList.add('static');},4000);");

  // hero slideshow (home page only)
  h = edit(page, h, 'hero picture responsive',
    '<img src="/scenes/jupiter.webp" alt="" aria-hidden="true" width="1600" height="893" fetchPriority="high" loading="eager"',
    `<img src="/scenes/jupiter-1024.webp" srcset="${scene('jupiter')}" sizes="${heroSizes}" alt="" aria-hidden="true" width="1600" height="893" fetchPriority="high" loading="eager"`);
  for (const n of ['apache', 'ntorq', 'rayzr']) {
    h = edit(page, h, `waiting slide ${n} loads after the first`,
      `<img src="/scenes/${n}.webp" alt="" aria-hidden="true" width="1600" height="893" fetchPriority="low" loading="lazy"`,
      `<img data-src="/scenes/${n}-1024.webp" data-srcset="${scene(n)}" sizes="${heroSizes}" alt="" aria-hidden="true" width="1600" height="893" fetchPriority="low" loading="lazy"`);
  }
  h = edit(page, h, 'story picture responsive',
    '<img src="/scenes/apache.webp" alt="TVS Apache RTR 160 standing in red smoke" loading="lazy"',
    `<img src="/scenes/apache-1024.webp" srcset="${scene('apache')}" sizes="(min-width:1024px) 50vw, 100vw" alt="TVS Apache RTR 160 standing in red smoke" loading="lazy"`);

  // logos: pick the size from where the mark sits
  let marks = 0;
  h = h.replace(/<img src="\/brand\/hr-mark(-dark)?\.webp"(?: srcset="[^"]*" sizes="[^"]*")? alt=""/g, (m, dark, at) => {
    const near = h.slice(Math.max(0, at - 400), at);
    const splash = near.lastIndexOf('splash-mark'), tile = near.lastIndexOf('brand-tile');
    const sizes = splash > tile ? splashSizes : tile >= 0 ? '72px' : '160px';
    const next = `<img src="/brand/hr-mark${dark || ''}.webp" srcset="${dark ? markDark : markLight}" sizes="${sizes}" alt=""`;
    if (next !== m) marks++;
    return next;
  });
  if (marks) log.push(`  ${page}: ${marks} logo pictures responsive`);

  const old = h.match(/<script data-hr-perf="">[\s\S]*?<\/script>|<script>\(function\(\)\{var d=document\.documentElement,w=window;\nfunction bikes[\s\S]*?<\/script>/);
  if (!old || old[0] !== runner) {
    h = old ? h.replace(old[0], runner) : h.replace('</body>', `${runner}</body>`);
    log.push(`  ${page}: splash runner`);
  }

  if (h !== before) save(page, h);
}

for (const page of plainPages) {
  const h = read(page);
  const next = edit(page, h, 'Clarity removed', clarity, '');
  if (next !== h) save(page, next);
}

// the route payloads fetched after load carry the same logo hint rows
const payloads = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = dir ? `${dir}/${e.name}` : e.name;
  if (e.isDirectory()) return ['_next', 'perf', 'brand', 'fleet', 'scenes', '.git'].includes(e.name) ? [] : payloads(rel);
  return e.name.endsWith('.txt') && e.name !== 'robots.txt' ? [rel] : [];
});
for (const f of payloads('')) {
  const t = read(f);
  const next = edit(f, t, 'no logo preload hints', /^:HL\["\/brand\/hr-mark(?:-dark)?\.webp","image"\]\r?\n/gm, '');
  if (next !== t) save(f, next);
}

// stylesheet: the hero card never hides behind the intro, the splash-out
// state the runner uses, a quicker splash, and dim text that reads at 4.5:1
// on light surfaces. The block is replaced whole on every run.
const cssBlock = `
html.wait #book[data-intro]{opacity:1}html.play #book[data-intro]{animation:none}html.wait .hero-media{clip-path:none}html.play .hero-media{animation:none}
html.splash-out .splash-screen{z-index:80;pointer-events:none;align-content:center;place-items:center;gap:1.4rem;display:grid;position:fixed;inset:0}html.splash-out .brand-tile,html.splash-out .brand-word,html.splash-out .brand-rest{opacity:0}
.splash-mark>img{animation-duration:.6s}.splash-word>span{animation-duration:.5s;animation-delay:calc(var(--li) * 30ms + .12s)}.splash-tag{animation-duration:.5s;animation-delay:.3s}
html.play [data-intro]{animation-duration:.8s;animation-delay:calc(var(--intro-base) + var(--i,0) * .07s)}html.play [data-intro-split] .w>span{animation-duration:.8s;animation-delay:calc(var(--intro-base) + var(--wi,0) * 50ms)}
html[data-theme=light]{--color-dim:#6b615a}
`;
let c = read(css);
const blockStart = c.indexOf('\nhtml.wait #book[data-intro]{opacity:1}');
const base = blockStart >= 0 ? c.slice(0, blockStart) : c;
if (base + cssBlock !== c) {
  save(css, base + cssBlock);
  log.push(`  ${css}: hero visible from first paint, splash-out, quicker splash, dim colour`);
}

// app code: MotionGate waits for the runner's splash; the fleet numbers no
// longer ask for a /stats endpoint the API never had; fleet cards get
// srcset; the desktop connector beams are hidden from screen readers
let g = read(gateChunk);
g = edit(gateChunk, g, 'MotionGate follows the runner', 't.classList.contains("splash")?u(t,r):r()', 'window.__hrSplash?window.__hrSplash.then(r):t.classList.contains("splash")?u(t,r):r()');
g = edit(gateChunk, g, 'no stats endpoint', 'statsApi:`${o}/public/links/${n}/stats`', 'statsApi:""');
save(gateChunk, g);

let p = read(pageChunk);
p = edit(pageChunk, p, 'skip stats when unset', 'async function L(e){let t=await fetch(E.SITE.statsApi,', 'async function L(e){if(!E.SITE.statsApi)return null;let t=await fetch(E.SITE.statsApi,');
p = edit(pageChunk, p, 'connector beams hidden from screen readers', '("svg",{fill:"none",width:S.width,height:S.height,xmlns:"http://www.w3.org/2000/svg",className:(0,r.cn)("pointer-events-none absolute top-0 left-0 transform-gpu stroke-2",e),',
  '("svg",{"aria-hidden":!0,fill:"none",width:S.width,height:S.height,xmlns:"http://www.w3.org/2000/svg",className:(0,r.cn)("pointer-events-none absolute top-0 left-0 transform-gpu stroke-2",e),');
p = edit(pageChunk, p, 'fleet cards responsive', '("img",{src:i.img,alt:i.alt,loading:"lazy",width:960,height:720,',
  '("img",{src:i.img,srcSet:i.img.replace(".webp","-540.webp")+" 540w, "+i.img.replace(".webp","-810.webp")+" 810w, "+i.img+" 960w",sizes:"(min-width:768px) 300px, 66vw",alt:i.alt,loading:"lazy",width:960,height:720,');
save(pageChunk, p);

for (const f of ['scenes/jupiter-1024.webp', 'brand/hr-mark-648.webp', 'fleet/jupiter-110-540.webp']) {
  if (!existsSync(join(root, f))) log.push(`  MISSING ${f} — run perf/images.mjs`);
}
console.log(log.join('\n'));
