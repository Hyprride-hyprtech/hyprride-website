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
- The splash closes itself about 1.2 s after first paint without waiting for
  the app code to hydrate. The app's MotionGate joins in through
  `window.__hrSplash`; if the runner is missing it falls back to its own
  sequence.
- Only the two display font weights are preloaded; logo and body-font
  preloads are gone. Logo and fleet pictures carry `srcset`.
- Microsoft Clarity starts on an idle moment (at most 2.5 s in).
- The site no longer asks the API for `/links/<code>/stats` (the endpoint
  never existed; the fleet count already came from `/vehicles`).
- `--color-dim` on light surfaces is `#6b615a` (4.5:1 contrast).

Measuring

Run Lighthouse with real throttling, not the default simulation; on
localhost every script finishes before first paint, which the simulation
then counts against the LCP:

    npx lighthouse http://localhost:5466/ --throttling-method=devtools --view
