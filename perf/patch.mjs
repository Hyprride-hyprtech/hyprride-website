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
const fontCss = '_next/static/chunks/1rgkft9nkmi0-.css';
const gateChunk = '_next/static/chunks/09qyvo33jamr5.js';
const pageChunk = '_next/static/chunks/0iot7uebytd0t.js';

const set = (name, widths, max) => widths.map((w) => `/${name}-${w}.webp ${w}w`).concat(`/${name}.webp ${max}w`).join(', ');
const scene = (n) => set(`scenes/${n}`, [480, 768, 1024, 1200], 1600);
const heroSizes = '(min-width:1180px) 600px, (min-width:1024px) 52vw, calc(100vw - 50px)';
const markLight = set('brand/hr-mark', [216, 432, 648], 864);
const markDark = set('brand/hr-mark-dark', [216, 432, 648], 747);
const splashSizes = '(max-width:531px) 170px, (min-width:1125px) 360px, 32vw';

// stylesheet: the hero card never hides behind the intro, the splash-out
// state the runner uses, a quicker splash, and dim text that reads at 4.5:1
// on light surfaces. The block is replaced whole on every run.
const cssBlock = `
html.wait #book[data-intro]{opacity:1}html.play #book[data-intro]{animation:none}html.wait .hero-media{clip-path:none}html.play .hero-media{animation:none}html.play .hero-media-zoom{animation:none}
html.splash-out .splash-screen{z-index:80;pointer-events:none;align-content:center;place-items:center;gap:1.4rem;display:grid;position:fixed;inset:0}html.splash-out .brand-tile,html.splash-out .brand-word,html.splash-out .brand-rest{opacity:0}
.splash-mark>img{animation-duration:.6s}.splash-word>span{animation-duration:.5s;animation-delay:calc(var(--li) * 30ms + .12s)}.splash-tag{animation-duration:.5s;animation-delay:.3s}
html.play [data-intro]{animation-duration:.8s;animation-delay:calc(var(--intro-base) + var(--i,0) * .07s)}html.play [data-intro-split] .w>span{animation-duration:.8s;animation-delay:calc(var(--intro-base) + var(--wi,0) * 50ms)}
html[data-theme=light]{--color-dim:#6b615a}
@media (hover:none) and (pointer:coarse){.live-dot{animation:hr-live 2s ease-in-out infinite;box-shadow:none}@keyframes hr-live{50%{opacity:.45}}.border-beam{animation:none;display:none}.moment-rain{animation:none}html.anim .moment-ride{animation:none}html.anim [data-reveal]{transition:opacity 1s var(--ease-expo), transform 1.1s var(--ease-expo)}html.anim [data-reveal]:not(.in){filter:none}}
`;
let c = read(css);

// touch devices: the animated dots canvas draws every other frame (30 fps);
// its per-frame drawing is the largest script cost on the first screen
const dotsChunk = '_next/static/chunks/3hxig_1t9br5a.js';
let dots = read(dotsChunk);
dots = edit(dotsChunk, dots, 'dots canvas: undo the touch-device stop', 'let e=n.current;if(!e||matchMedia("(hover:none) and (pointer:coarse)").matches)return;let t=e.getContext("2d");if(!t)return;', 'let e=n.current,t=e?.getContext("2d");if(!e||!t)return;');
dots = edit(dotsChunk, dots, 'dots canvas 30 fps on touch devices', 'let e=n.current,t=e?.getContext("2d");if(!e||!t)return;', 'let e=n.current,t=e?.getContext("2d");if(!e||!t)return;let hrC=matchMedia("(hover:none) and (pointer:coarse)").matches,hrO=0;');
dots = edit(dotsChunk, dots, 'dots canvas skips alternate frames', 'R=e=>{if(M=0,!F)return;', 'R=e=>{if(M=0,!F)return;if(hrC&&(hrO^=1)){M=requestAnimationFrame(R);return}');
save(dotsChunk, dots);
const blockStart = c.indexOf('\nhtml.wait #book[data-intro]{opacity:1}');
const base = blockStart >= 0 ? c.slice(0, blockStart) : c;
if (base + cssBlock !== c) {
  c = base + cssBlock;
  save(css, c);
  log.push(`  ${css}: hero visible from first paint, splash-out, quicker splash, dim colour`);
}

// Both stylesheets go inline so the first paint waits for nothing but the
// page itself; the <link>s stay (React's hydration looks for them) but load
// without blocking.
const absolute = (s) => s.replace(/url\(\.\.\//g, 'url(/_next/static/');
const inlineCss = `<style data-hr-css="">${absolute(read(fontCss).trim())}\n${absolute(c.trim())}</style>`;
const sheet = (href) => `<link rel="stylesheet" href="${href}" data-precedence="next"/>`;
const lazySheet = (href) => `<link rel="stylesheet" href="${href}" data-precedence="next" media="print" onload="this.media=&quot;all&quot;"/>`;

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

// The app chunks wait as inert placeholders and start after the first frame
// is on screen and the hero picture has decoded (at most 2.5 s in). On a
// fast connection they otherwise arrive within ~200 ms and run before the
// first paint, holding the whole first screen back behind hydration.
const boot = `<script data-hr-boot="">(function(){var w=window,d=document;
function boot(){if(w.__hrBooted)return;w.__hrBooted=true;var l=d.querySelectorAll('script[type="hr/boot"]');for(var i=0;i<l.length;i++){var t=l[i],s=d.createElement('script');s.src=t.getAttribute('data-src');s.async=true;if(t.getAttribute('data-id'))s.id=t.getAttribute('data-id');t.parentNode.replaceChild(s,t);}}
try{var frame=function(){return new Promise(function(r){requestAnimationFrame(function(){setTimeout(r,0);});});};
var hero=d.querySelector('img.hero-bike'),types=(w.PerformanceObserver&&PerformanceObserver.supportedEntryTypes)||[];
var painted=new Promise(function(r){var type=hero&&types.indexOf('largest-contentful-paint')>=0?'largest-contentful-paint':types.indexOf('paint')>=0?'paint':'';
if(!type)return r();var po=new PerformanceObserver(function(l){if(l.getEntries().some(function(e){return type!=='paint'||e.name==='first-contentful-paint';})){po.disconnect();r();}});po.observe({type:type,buffered:true});});
var ready=hero&&hero.decode?Promise.race([hero.decode().catch(function(){}),new Promise(function(r){setTimeout(r,1200);})]):Promise.resolve();
Promise.all([painted,ready]).then(frame).then(function(){setTimeout(boot,50);},boot);setTimeout(boot,2500);}catch(e){boot();}
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

  // stylesheets inline, links non-blocking
  const styled = h.match(/<style data-hr-css="">[\s\S]*?<\/style>/);
  if (!styled) {
    h = h.replace(sheet(`/${fontCss}`), inlineCss + lazySheet(`/${fontCss}`));
    h = h.replace(sheet(`/${css}`), lazySheet(`/${css}`));
    log.push(`  ${page}: stylesheets inline`);
  } else if (styled[0] !== inlineCss) {
    h = h.replace(styled[0], inlineCss);
    log.push(`  ${page}: inline stylesheet refreshed`);
  }

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

  // app chunks start after the first paint
  h = edit(page, h, 'chunk scripts wait for the first paint',
    /<script src="(\/_next\/static\/chunks\/[^"]+\.js)"(?: id="([^"]+)")? async=""><\/script>/g,
    (m, src, id) => `<script type="hr/boot" data-src="${src}"${id ? ` data-id="${id}"` : ''}></script>`);
  h = edit(page, h, 'no early bootstrap preload', /<link rel="preload" as="script" fetchPriority="low" href="\/_next\/static\/chunks\/[^"]+"\/>/g, '');
  const oldBoot = h.match(/<script data-hr-boot="">[\s\S]*?<\/script>/);
  if (!oldBoot || oldBoot[0] !== boot) {
    h = oldBoot ? h.replace(oldBoot[0], boot) : h.replace('</body>', `${boot}</body>`);
    log.push(`  ${page}: boot after first paint`);
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
// the beams are CSS-hidden below the lg breakpoint (64rem) but each one
// animates its gradient forever through Framer Motion's JavaScript frame
// loop; mount them only at lg and up, following resizes (server snapshot
// false keeps hydration identical to the exported HTML)
p = edit(pageChunk, p, 'connector beams follow the lg breakpoint', 'r=(0,l.useAnimated)();return(0,t.jsx)("section",{id:"how"',
  'r=(0,l.useAnimated)(),hrLg=(0,s.useSyncExternalStore)(e=>{let t=matchMedia("(min-width:64rem)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},()=>matchMedia("(min-width:64rem)").matches,()=>!1);return(0,t.jsx)("section",{id:"how"');
p = edit(pageChunk, p, 'connector beams gate (from the 1024px version)', 'r&&matchMedia("(min-width:1024px)").matches?[0,1,2].map(s=>(0,t.jsx)(a,{containerRef:e', 'r&&hrLg?[0,1,2].map(s=>(0,t.jsx)(a,{containerRef:e');
p = edit(pageChunk, p, 'connector beams only at lg', 'r?[0,1,2].map(s=>(0,t.jsx)(a,{containerRef:e', 'r&&hrLg?[0,1,2].map(s=>(0,t.jsx)(a,{containerRef:e');
p = edit(pageChunk, p, 'fleet cards responsive', '("img",{src:i.img,alt:i.alt,loading:"lazy",width:960,height:720,',
  '("img",{src:i.img,srcSet:i.img.replace(".webp","-540.webp")+" 540w, "+i.img.replace(".webp","-810.webp")+" 810w, "+i.img+" 960w",sizes:"(min-width:768px) 300px, 66vw",alt:i.alt,loading:"lazy",width:960,height:720,');
save(pageChunk, p);

// GSAP ScrollTrigger's _rafBugFix requests a frame every frame for as long
// as ScrollTrigger is enabled ("in some browsers (like Firefox), screen
// repaints weren't consistent unless we had SOMETHING queued up"); elsewhere
// it only keeps the main thread from ever going idle
const mainChunk = '_next/static/chunks/0uolmjm0-hk14.js';
let mc = read(mainChunk);
mc = edit(mainChunk, mc, 'ScrollTrigger frame pump only in Firefox', 'function t(){return n2&&requestAnimationFrame(t)}()', 'function t(){return n2&&/Firefox\\//.test(navigator.userAgent)&&requestAnimationFrame(t)}()');
save(mainChunk, mc);

for (const f of ['scenes/jupiter-1024.webp', 'brand/hr-mark-648.webp', 'fleet/jupiter-110-540.webp']) {
  if (!existsSync(join(root, f))) log.push(`  MISSING ${f} — run perf/images.mjs`);
}
console.log(log.join('\n'));
