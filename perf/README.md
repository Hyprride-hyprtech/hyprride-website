# Loading speed

The site is a Next.js static export without its source tree, so the speed
work lives in two scripts that edit the exported files in place.

- `node perf/images.mjs` — makes the smaller copies of the pictures in
  `scenes/`, `fleet/` and `brand/` that the `srcset` attributes point at
  (needs `sharp` on `NODE_PATH`).
- `node perf/patch.mjs` — edits the pages, the stylesheet and two app chunks.
  Re-runnable; each edit checks whether it is already in place.

What the patch does

- The app chunks sit in the page as inert `<script type="hr/boot">`
  placeholders; `<script data-hr-boot>` at the end of `<body>` swaps them for
  real scripts once the first frame is on screen and the hero picture has
  decoded (at most 2.5 s in, immediately on any error). On a fast connection
  the chunks otherwise arrive within ~200 ms and run before the first paint,
  which held the first screen back ~2 s in PageSpeed's runs.
- Both stylesheets are inlined in every page (`<style data-hr-css>`), so the
  first paint waits for nothing but the page itself. On a fast network the
  app's JavaScript otherwise arrives before the stylesheet and runs before
  the first paint, which held the paint back by ~2 s in PageSpeed's own
  runs. The `<link>`s remain for React's hydration but load as `media=print`
  and switch to `all` on load.
- The hero picture is preloaded first, with the same `srcset`/`sizes` as the
  `<img>`, and is never hidden by the intro: the card it sits in keeps
  `opacity:1` and no `clip-path` while the splash is up, so Chrome records it
  as the Largest Contentful Paint at first paint instead of after the intro.
- The three waiting slideshow pictures load only after the first one has
  painted (`data-src`, swapped by the runner script at the end of `<body>`).
- The splash closes itself 0.75 s after first paint without waiting for the
  app code to hydrate: letters in 0.5 s, logo and word morph into the header
  in 0.65 s, background wipe 0.6 s, text intro from 0.3 s with a 70 ms
  stagger (a 2 s timer ends the close-out even if the morph animation is
  interrupted). The app's MotionGate joins in through `window.__hrSplash`;
  if the runner is missing it falls back to its own sequence.
- The desktop "How it works" connector beams are `aria-hidden`, so the list
  only exposes its items to screen readers.
- Only the splash-word font weight (900) is preloaded in the HTML; the other
  font preloads come back from React's payload hints after hydration, which
  is after the first paint. The two full-size logo hints are removed from
  the payload, so they are never fetched. Logo and fleet pictures carry
  `srcset`.
- Microsoft Clarity is removed from every page (it set Bing third-party
  cookies and cost ~0.4 s of main-thread time).
- The site no longer asks the API for `/links/<code>/stats` (the endpoint
  never existed; the fleet count already came from `/vehicles`).
- `--color-dim` on light surfaces is `#6b615a` (4.5:1 contrast).
- On touch devices only (`hover:none` + `pointer:coarse`): the "live" dot
  pulses by opacity instead of box-shadow, the moving border glow, the
  story-section rain and the riding-bike bob (an SVG transform, which
  phones cannot run on the GPU) are off, scroll-in reveals rise without the
  blur, and the animated dots canvas draws at 30 fps. These are every-frame
  main-thread animations that delay tap response (INP) on phones; desktop
  is unchanged.
- The "How it works" connector beams only mount at the `lg` breakpoint
  (64rem) and wider, following resizes (they are CSS-hidden below that,
  but each one animated its gradient forever through Framer Motion's
  JavaScript frame loop), and GSAP ScrollTrigger's
  `_rafBugFix` frame pump only runs in Firefox, the browser it exists for.

Measuring

On localhost every script finishes before first paint, which Lighthouse's
default simulation then counts against the LCP. Either run with real
throttling, or put the throttling proxy in front of the local server so the
simulation (what PageSpeed Insights uses) sees a realistic request order:

    npx serve -l 5466 .
    node perf/throttle-proxy.js 5467 5466 120 4     # 120 ms latency, 4 Mbps
    npx lighthouse http://localhost:5467/ --view    # PSI-style
    npx lighthouse http://localhost:5466/ --throttling-method=devtools --view
