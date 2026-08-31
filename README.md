# hyprride.com

Static site for **HYPRRIDE** — bike and scooter rentals in Madhapur, Hyderabad.
Served by GitHub Pages at <https://hyprride.com>.

No build step. Plain HTML, CSS and JS — open `index.html` to work on it locally.

| File | What it is |
|---|---|
| `index.html` | Home — hero, fleet, pricing, FAQ |
| `booking.html` | Single-page booking form; submits to WhatsApp |
| `knowmore.html` | What we are building next |
| `404.html` | Not-found page |
| `styles.css` / `booking.css` | Styles |
| `script.js` / `booking.js` | Home interactions / booking logic and pricing |
| `CNAME` | Tells GitHub Pages to serve this at hyprride.com |
| `.nojekyll` | Serve files as-is, no Jekyll processing |

## Editing

Push to `main` and Pages redeploys in a minute or two.

**Changing a `.css` or `.js` file? Bump its cache-buster.** The HTML loads them as
`styles.css?v=3` — change every matching `?v=3` to `?v=4` in the HTML, or phones keep
showing the old version.

Bookings are handed off to WhatsApp; nothing is stored on a server.
