# Loading speed

The site is a Next.js static export without its source tree, so the speed
work lives in two scripts that edit the exported files in place.

- `node perf/images.mjs` — makes the smaller copies of the pictures in
  `scenes/`, `fleet/` and `brand/` that the `srcset` attributes point at
  (needs `sharp` on `NODE_PATH`).
- `node perf/patch.mjs` — edits the pages, the stylesheet and two app chunks.
  Re-runnable; each edit checks whether it is already in place.

What the patch does

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

Measuring

On localhost every script finishes before first paint, which Lighthouse's
default simulation then counts against the LCP. Either run with real
throttling, or put the throttling proxy in front of the local server so the
simulation (what PageSpeed Insights uses) sees a realistic request order:

    npx serve -l 5466 .
    node perf/throttle-proxy.js 5467 5466 120 4     # 120 ms latency, 4 Mbps
    npx lighthouse http://localhost:5467/ --view    # PSI-style
    npx lighthouse http://localhost:5466/ --throttling-method=devtools --view
