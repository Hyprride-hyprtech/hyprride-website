// Keeps the Google rating and review count on hyprride.com current.
//
// The home page fetches /reviews.json on every visit and swaps its numbers in,
// so that file is what visitors end up seeing. The count is also baked into
// index.html and the SITE constant (first paint, and what crawlers read); those
// two must always agree or React re-renders on load, so they are rewritten
// together or not at all.
//
//   node .github/scripts/refresh-reviews.mjs                         # ask Google (needs GOOGLE_PLACES_KEY)
//   node .github/scripts/refresh-reviews.mjs --rating 4.8 --count 1114   # set by hand

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PLACE_ID = process.env.PLACE_ID || "ChIJP4V7Q5SRyzsRv23VFRxG2mA"; // Hyprride-Bike Rentals-Madhapur-Hyderabad
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const fmt = (n) => n.toLocaleString("en-IN"); // same formatting the page uses

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : Number(process.argv[i + 1]);
}

async function fromGoogle() {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return null;
  const res = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount" },
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return { rating: j.rating, count: j.userRatingCount };
}

const manual = arg("count") !== undefined;
const next = manual ? { rating: arg("rating"), count: arg("count") } : await fromGoogle();
if (!next) {
  console.log("::warning::GOOGLE_PLACES_KEY secret is not set, so reviews were not refreshed.");
  process.exit(0);
}
if (!(next.rating > 0 && next.rating <= 5) || !Number.isInteger(next.count) || next.count < 1) {
  throw new Error(`Refusing odd values: ${JSON.stringify(next)}`);
}

const jsonPath = join(ROOT, "reviews.json");
const current = JSON.parse(await readFile(jsonPath, "utf8"));
if (!manual && next.count < current.count * 0.9) {
  throw new Error(`Count fell from ${current.count} to ${next.count}; check the Place ID before trusting it.`);
}

// 1. reviews.json, only when something changed (no daily no-op commits)
if (next.rating !== current.rating || next.count !== current.count) {
  const out = { rating: next.rating, count: next.count, asOf: new Date().toISOString() };
  await writeFile(jsonPath, JSON.stringify(out, null, 1) + "\n");
  console.log(`reviews.json: ${current.count} at ${current.rating} -> ${next.count} at ${next.rating}`);
} else {
  console.log(`reviews.json already says ${next.count} at ${next.rating}`);
}

// 2. Baked count in index.html + SITE constant, all-or-nothing
const chunkDir = join(ROOT, "_next/static/chunks");
const SITE_RE = /(rating:[\d.]+,reviewCount:)(\d+)\}/;
let chunk = null;
for (const f of await readdir(chunkDir)) {
  if (!f.endsWith(".js")) continue;
  const src = await readFile(join(chunkDir, f), "utf8");
  if (SITE_RE.test(src)) { chunk = { path: join(chunkDir, f), src }; break; }
}
const baked = chunk && Number(chunk.src.match(SITE_RE)[2]);

if (!chunk) {
  console.log("::warning::SITE constant not found (site rebuilt?); only reviews.json was updated.");
} else if (baked === next.count) {
  console.log(`Baked count already ${fmt(next.count)}`);
} else {
  const htmlPath = join(ROOT, "index.html");
  let html = await readFile(htmlPath, "utf8");
  const [o, n] = [fmt(baked), fmt(next.count)];
  const spots = [
    [`from <!-- -->${o}<!-- --> Google reviews`, `from <!-- -->${n}<!-- --> Google reviews`],
    [`Google rating · ${o} reviews`, `Google rating · ${n} reviews`],
    [`font-black">${o}<!-- -->+</p>`, `font-black">${n}<!-- -->+</p>`],
    [`tabular-nums">${o}</span> Google reviews`, `tabular-nums">${n}</span> Google reviews`],
  ];
  const missing = spots.filter(([from]) => html.split(from).length !== 2);
  if (missing.length) {
    console.log(`::warning::${missing.length} baked spot(s) not found exactly once in index.html; left the baked count at ${o}.`);
  } else {
    for (const [from, to] of spots) html = html.replace(from, to);
    await writeFile(htmlPath, html);
    await writeFile(chunk.path, chunk.src.replace(SITE_RE, (_, head) => `${head}${next.count}}`));
    console.log(`Baked count: ${o} -> ${n} (index.html x4, SITE constant)`);
  }
}
