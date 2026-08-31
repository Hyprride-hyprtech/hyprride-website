# HYPRRIDE — Go live at hyprride.com

**Host: GitHub Pages (free).** Domain stays registered at GoDaddy — only the DNS records change.

---

## Already done

| | |
|---|---|
| Repo | <https://github.com/Hyprride-hyprtech/hyprride-website> (public) |
| Local copy | `Desktop/hyprride-website` — git repo, remote already set |
| Pages | Enabled, source `main` / root, build succeeded |
| Custom domain | `CNAME` file in the repo claims `hyprride.com` |
| Jekyll | Disabled via `.nojekyll` — files served exactly as they are |

Verified by requesting the site directly from GitHub's servers before DNS was touched:

```
/                 200  text/html
/booking          200  text/html      <- clean URL works
/booking.html     200  text/html      <- old links still work
/knowmore.html    200  text/html
/styles.css       200  text/css
/hero-smoke.jpg   200  image/jpeg
/float-jupiter.webp 200 image/webp
/ntorq-125.avif   200  image/avif     <- correct type, photos will render
/nothing-here     404  text/html      <- the HYPRRIDE 404, real 404 status
```

GitHub Pages handles clean URLs, image MIME types, the custom 404 and HTTPS by itself, so the
Apache `.htaccess` is not needed here and was left out of the repo on purpose.

---

## What is left — three steps, in this order

### STEP 1 — Release the domain from Netlify

1. Netlify → your site → **Site configuration → Domain management**.
2. Remove `hyprride.com` and `www.hyprride.com` from the domain list.
3. Leave the Netlify site itself alive — it costs nothing and it is your rollback. Delete it after
   a week of clean running.

> **Order matters.** If Netlify still claims the name while GitHub starts serving it, both keep
> trying to hold a certificate for `hyprride.com` and HTTPS fails in ways that look random.

### STEP 2 — Point the DNS at GitHub

GoDaddy → My Products → hyprride.com → **DNS**. GitHub's apex hosting needs **four** A records on
the same `@` name — that is not a mistake, it is how they spread load.

| Action | Type | Name | Value |
|---|---|---|---|
| **Delete** | A | `@` | `75.2.60.5` *(Netlify)* |
| **Delete** | CNAME | `www` | `…netlify.app` |
| **Add** | A | `@` | `185.199.108.153` |
| **Add** | A | `@` | `185.199.109.153` |
| **Add** | A | `@` | `185.199.110.153` |
| **Add** | A | `@` | `185.199.111.153` |
| **Add** | CNAME | `www` | `hyprride-hyprtech.github.io` |

- Also clear any GoDaddy parking or forwarding record on `@`.
- **Do not touch MX or TXT records** — those are your email. Deleting them stops mail to
  tech@hyprride.com, and mail breakage is much harder to notice than a website going down.
- DNS spreads in ten minutes to a few hours. During that window some people load the old Netlify
  copy and some load GitHub. Normal — do not start changing things again.

### STEP 3 — Force HTTPS

1. Repo → **Settings → Pages**. The custom domain box should already read `hyprride.com`, with a
   green tick once DNS resolves.
2. Tick **Enforce HTTPS**. It is greyed out at first — GitHub has to issue the certificate before it
   can be enabled. Come back in an hour.

GitHub issues and renews the certificate itself, free, forever. Nothing to run, nothing to remember.

---

## Verify — on a phone too, not just the laptop

- `https://hyprride.com` → loads, hero animation plays, padlock closed.
- `www.hyprride.com` → reaches the site.
- Booking page → Important Notice pops, prices react to vehicle / duration / add-ons.
- **One real test booking → WhatsApp opens with the message filled in.** This is the money path.
- Fleet photos all appear, none missing.
- `hyprride.com/nothing-here` → the red HYPRRIDE 404.

---

## Updating the site from now on

The repo *is* the site. Push to `main` and Pages redeploys in a minute or two — no zips, no uploads.

```
cd Desktop/hyprride-website
git add -A
git commit -m "what changed"
git push
```

> **Changed a `.css` or `.js`? Bump the cache-buster.** Find every `?v=3` for that file in the HTML
> and make it `?v=4`. Skip it and phones keep showing the old design while your laptop shows the
> new one — exactly what caused the "breakdown not updating" scare before.

Note the working folder is now `Desktop/hyprride-website`, not `Desktop/website`. Edit there, or
edit in `Desktop/website` and copy the changed files across before committing.

---

## The admin panel — deployed, github.io only

| | |
|---|---|
| URL | <https://hyprride-hyprtech.github.io/hyprride-admin/> |
| Repo | `Hyprride-hyprtech/hyprride-admin` (public) |
| Local | `Desktop/hyprride-admin` |
| Custom domain | **none, on purpose** — no `CNAME` file, so it never appears under hyprride.com |

Nothing on the public site links to it, and the page carries `noindex, nofollow` so it stays out
of search results.

> **The repo is public**, which is what free GitHub Pages requires, so the fallback password
> `hyprride2026` in `admin.js` is now readable by anyone who looks. It was already visible via
> view-source on any live admin page — what changed is that it is now easy to *find*. Treat the
> Firebase email link as the real gate, and never put customer data or secrets in that repo.
> To rotate the password, edit `ADMIN_PASS` at the top of `admin.js`, then commit and push.

---

## Admin sign-in — email one-time link

Firebase project `hyprride-website` is configured in `admin-auth.js`. The panel asks for a staff
email and sends a one-time sign-in link. Allowed: `tech@hyprride.com`, `hyprride@gmail.com`
(edit `ALLOWED_EMAILS` at the top of `admin-auth.js`).

**Two clicks are still pending — login will NOT work until both are done:**

1. **Turn on the method.** Firebase console → `hyprride-website` → Build → Authentication →
   Sign-in method → **Email/Password** → switch on **both** toggles. The second,
   **Email link (passwordless sign-in)**, sits inside the same panel and is easy to miss.
2. **Authorize the domain.** Authentication → Settings → **Authorized domains** → add whichever
   address the panel ends up on.

Skip #1 → *"Enable Email link (passwordless sign-in) in the Firebase console first."*
Skip #2 → *"Add this domain under Firebase → Authentication → Settings → Authorized domains."*

If Firebase is ever unreachable the password form comes back on its own — `hyprride2026`,
changeable at the top of `admin.js`.

---

## How staff use the admin

- Keep the page open all day — it refreshes every 4 seconds and pops a "New booking" toast.
- Bookings tab: **Confirm** (pending → confirmed) → **Done** (confirmed → completed). WhatsApp,
  call and details buttons sit right next to it.

**One honest limitation:** the site is static, so a booking is stored in the browser it was made in.
The admin table shows bookings made **on that same device** — a booking from a customer's phone
reaches you through the **WhatsApp message**, not the table. WhatsApp stays the source of truth; the
panel is your tracking board for walk-ins and status. Changing host does not affect this either way.
A live cross-device board needs a small free backend (Firebase Firestore, the same project as the
email login), roughly an hour of work.

---

## Appendix — the GoDaddy cPanel packages (not in use, kept anyway)

If you ever buy GoDaddy hosting and want to move there, everything is still in this folder:

| Zip | Files | Goes to |
|---|---|---|
| `hyprride-deploy.zip` | 23 | `public_html` |
| `hyprride-admin-deploy.zip` | 13 | an `admin.hyprride.com` subdomain folder |

Both carry `.htaccess` (Linux/cPanel) **and** `web.config` (Windows/IIS) — HTTPS redirect,
`www` → non-`www`, gzip, cache headers, `.avif`/`.webp` MIME types, custom 404, no directory
listing, and a `/.well-known/` exemption so cPanel AutoSSL can issue a certificate. Whichever
server you land on ignores the other's file.

Short version of that path: cPanel → File Manager → `public_html` → turn on **Show Hidden Files** →
delete placeholders → upload the zip → **Extract** → check `index.html` sits directly in
`public_html` (not in a `deploy/` subfolder) → delete the zip → point DNS at the cPanel Shared IP →
SSL/TLS Status → **Run AutoSSL**.

GitHub Pages does the same job for free, which is why the site is there instead.
