# hyprride.com

The live website. GitHub Pages serves this branch as-is, so a push to `main`
goes live within a few minutes. It is a finished Next.js export: there is no
build step, and the source code is not in this repo.

## What is where

| Path | What it is | Can it move? |
|---|---|---|
| `index.html`, `future.html`, `careers.html`, `terms.html`, `privacy.html` | The pages. `/future` is served from `future.html`. | No, the file name is the URL |
| `index.txt`, `future.txt`, … and the `future/`, `careers/`, `terms/`, `privacy/` folders | Page data the app loads when you click between pages | No, the app asks for these exact paths |
| `__next.*.txt` | Home page data for the same purpose | No |
| `_next/` | The app's JavaScript, styles and fonts | No |
| `images/brand/` | HYPRRIDE logo, light and dark, in 3 sizes | Yes, if every reference is updated |
| `images/scenes/` | Big riding photos: home page slideshow and `/future` | " |
| `images/fleet/` | Bike photos on the fleet cards (`-540`/`-810` are smaller copies for phones) | " |
| `images/share/hero-smoke.jpg` | Preview picture when someone shares the link (WhatsApp, X, …) | " |
| `icon.png`, `apple-icon.png` | Browser tab and home-screen icons | Keep at the root |
| `404.html` | "Page not found" | No |
| `book.html`, `booking.html` | Old links that now redirect to the Hyprverse booking page | No |
| `knowmore.html` | Old link that now redirects to `/future` | No |
| `reviews.json` | Google rating and review count the home page shows | No |
| `robots.txt`, `sitemap.xml`, `CNAME`, `.nojekyll` | Search engines, the hyprride.com domain, GitHub Pages settings | No |
| `.github/` | Daily job that refreshes the Google review count | — |

Photo paths are written into the pages, the page data and the JavaScript.
To move or rename a photo, replace its path in every file (search the whole
repo for the old path) and check the page locally before pushing.

## Google reviews

`.github/workflows/refresh-reviews.yml` runs every day at 06:00 IST. It reads
the rating and count from Google and updates `reviews.json`, `index.html` and
the copy inside the JavaScript. It needs the repository secret
`GOOGLE_PLACES_KEY`. To set the numbers by hand:

    node .github/scripts/refresh-reviews.mjs --rating 4.8 --count 1115

## Checking locally

    npx serve .

Then open the address it prints. The speed tuning scripts that used to live
in `perf/` were one-off tools; they are in the git history (commit `7a9aa01`).
