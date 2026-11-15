# hyprride.com

The live website. GitHub Pages serves this branch as-is, so a push to `main`
goes live within a few minutes. It is a Next.js export, edited by hand
afterwards (see below): there is no build step, and the source code is not
in this repo.

## What is where

| Path | What it is | Can it move? |
|---|---|---|
| `index.html`, `future.html`, `careers.html`, `terms.html`, `privacy.html` | The pages. `/future` is served from `future.html`. | No, the file name is the URL |
| `index.txt`, `future.txt`, … and the `future/`, `careers/`, `terms/`, `privacy/` folders | Page data the app loads when you click between pages | No, the app asks for these exact paths |
| `__next.*.txt` | Home page data for the same purpose | No |
| `_next/` | The app's JavaScript, styles and fonts | No |
| `images/brand/` | HYPRRIDE logo, light and dark. Every file is used: the plain `hr-mark.webp` / `hr-mark-dark.webp` are the full-size versions, `-216`/`-432`/`-648` the smaller ones | Yes, if every reference is updated |
| `images/scenes/` | Big riding photos: home page slideshow and `/future` | " |
| `images/fleet/` | Bike photos on the fleet cards (`-540`/`-810` are smaller copies for phones) | " |
| `images/share/hero-smoke.jpg` | Preview picture when someone shares the link (WhatsApp, X, …) | " |
| `icon.png`, `apple-icon.png` | Browser tab and home-screen icons | Keep at the root |
| `404.html` | "Page not found" | No |
| `book.html`, `booking.html` | Old links that now redirect to the Hyprverse booking page. The booking link is written 3 times in each file; change all 6 together | No |
| `knowmore.html` | Old link that now redirects to `/future` | No |
| `reviews.json` | Google rating and review count the home page shows | No |
| `robots.txt`, `sitemap.xml`, `CNAME`, `.nojekyll` | Search engines, the hyprride.com domain, GitHub Pages settings | No |
| `.github/` | Daily job that refreshes the Google review count | — |

Photo paths are written into the pages, the page data and the JavaScript.
To move or rename a photo, replace its path in every file (search the whole
repo for the old path) and check the page locally before pushing.

## The pages were tuned by hand after the export

The exported files were edited for loading speed. Anyone changing styles,
scripts or the hero needs to know this:

- Every page carries its own copy of the stylesheets inside
  `<style data-hr-css>`. That copy is what draws the first screen. Editing
  `_next/static/chunks/*.css` alone changes nothing visible until the page
  loads fully; update the inline copy in each `.html` too.
- The app scripts sit in each page as `<script type="hr/boot">`
  placeholders. The `<script data-hr-boot>` at the end of `<body>` starts
  them after the first paint. Keep both when editing a page.
- Three of the four home-page slideshow pictures use `data-src` and load
  only after the first one has shown.
- A fresh export from the Next.js source would undo all of this. The
  scripts that applied it, with notes on each change, are in the git
  history: `git show 7a9aa01:perf/README.md` (and `perf/patch.mjs`).

## Google reviews

`.github/workflows/refresh-reviews.yml` runs every day at 06:00 IST. It reads
the rating and count from Google and updates `reviews.json`, `index.html` and
the copy inside the JavaScript. It needs the repository secret
`GOOGLE_PLACES_KEY`. To set the numbers by hand:

    node .github/scripts/refresh-reviews.mjs --rating 4.8 --count 1115

## Checking locally

    npx serve .

Then open the address it prints.
