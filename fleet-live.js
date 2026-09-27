/* ═══════════ HYPRRIDE — live fleet from the HyprVerse vendor app ═══════════

   The fleet section on the home page and the vehicle list on the booking page
   read the shop's REAL fleet from the vendor API: which models the shop runs,
   how many of each are free right now, and the rate card each is priced on.

   The page still ships with the last known fleet written into the HTML, so if
   the API is slow or unreachable nothing changes — no spinner, no empty grid.
   Every card the API confirms gets a live "N available now" badge; a model the
   shop has added gets a card of its own; a model it no longer runs comes down.

   Booking page: window.HYPRRIDE_FLEET is a promise booking.js waits on to
   swap its vehicle list for the live one.                                     */
(function () {
  'use strict';

  /* The vendor app's API. The first host is the vanity domain; the second is
     the same app on its Azure address, in case DNS on the first ever wobbles. */
  const API_BASES = [
    'https://www.hyprverse.in',
    'https://hyperverseapp-h8fne4a6ejbsfdgw.centralindia-01.azurewebsites.net',
  ];
  const TIMEOUT_MS = 8000;

  /* ── fetch, trying each host in turn ── */
  function fetchFrom(base) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    return fetch(base + '/api/public/fleet', { signal: ctrl ? ctrl.signal : undefined, cache: 'default' })
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => {
        if (!data || !Array.isArray(data.models)) throw new Error('bad payload');
        data.apiBase = base;
        return data;
      })
      .finally(() => { if (timer) clearTimeout(timer); });
  }
  function loadFleet() {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    return API_BASES.reduce(
      (chain, base) => chain.catch(() => fetchFrom(base)),
      Promise.reject(new Error('start')),
    ).catch(err => {
      console.warn('Live fleet unavailable — showing the built-in lineup', err && err.message);
      return null;
    });
  }
  const fleetPromise = loadFleet();
  window.HYPRRIDE_FLEET = fleetPromise;

  /* ── matching a model to a card ──
     "TVS Jupiter 110" on the page and "TVS JUPITER 110" / "Tvs Jupiter" 110cc
     in the fleet are the same scooter: drop the maker, the noise words and
     everything but letters, then pair with the engine size. */
  const MAKERS = /\b(tvs|yamaha|honda|hero|bajaj|suzuki|royal enfield|ktm|ather|ola|vespa|aprilia|kawasaki|jawa|yezdi|benelli|triumph|bmw|harley)\b/g;
  function keyOf(name, cc) {
    const letters = String(name || '').toLowerCase()
      .replace(/\d+\s*cc\b/g, ' ')
      .replace(MAKERS, ' ')
      .replace(/\b(rtr|cc)\b/g, ' ')
      .replace(/[^a-z]/g, '');
    return letters + '|' + (parseInt(cc, 10) || 0);
  }
  /* A page slug like "jupiter-110" carries its engine size at the end. */
  function keyOfSlug(slug) {
    const m = /(\d+)(?!.*\d)/.exec(String(slug || ''));
    return keyOf(slug, m ? m[1] : 0);
  }
  window.HYPRRIDE_FLEET_KEY = keyOf;
  window.HYPRRIDE_FLEET_SLUG_KEY = keyOfSlug;

  /* ── small helpers ── */
  const rupee = n => '₹' + Number(n).toLocaleString('en-IN');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function hoursLabel(h) {
    if (h % 168 === 0) return (h / 168) + (h === 168 ? ' week' : ' weeks');
    if (h >= 48 && h % 24 === 0) return (h / 24) + ' days';
    return h + (h === 1 ? ' hr' : ' hrs');
  }
  const kmLabel = r => (r.kmIncluded === null ? 'unlimited km' : r.kmIncluded + ' km');
  function badgeText(m) {
    if (m.available > 0) return m.available + ' available now';
    return 'All out now';
  }

  /* ── one card, brought up to date ── */
  function decorate(card, m, fleet) {
    const media = card.querySelector('.bike-media');
    if (media) {
      let badge = media.querySelector('.tag-live');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'tag tag-live';
        media.appendChild(badge);
      }
      badge.textContent = badgeText(m);
      badge.classList.toggle('is-out', !(m.available > 0));
      badge.title = m.available + ' of ' + m.total + ' free right now · ' + m.total + ' in the fleet';
    }
    card.classList.toggle('is-out', !(m.available > 0));
    card.dataset.available = m.available;
    card.dataset.total = m.total;

    if (m.fromRate > 0) {
      const price = card.querySelector('.bike-price b');
      if (price) price.textContent = rupee(m.fromRate);
    }
    if (m.rates && m.rates.length) {
      const cols = card.querySelectorAll('.pricing-panel .p-col');
      const fill = (col, pick) => {
        if (!col) return;
        col.querySelectorAll('.p-row').forEach(row => row.remove());
        m.rates.forEach(r => {
          const row = document.createElement('div');
          row.className = 'p-row';
          row.innerHTML = '<span>' + esc(hoursLabel(r.hours)) + ' · ' + esc(kmLabel(r)) + '</span><b>' + esc(rupee(pick(r))) + '</b>';
          col.appendChild(row);
        });
      };
      fill(cols[0], r => r.price);
      fill(cols[1], r => r.weekendPrice);
    }
  }

  /* ── a card for a model the page did not know about ── */
  function buildCard(template, m, fleet) {
    const card = template.cloneNode(true);
    card.hidden = false;
    card.removeAttribute('data-delay');
    card.removeAttribute('style');
    card.classList.add('revealed');           /* script.js only reveals what was there at load */
    card.querySelectorAll('.tag-live').forEach(t => t.remove());

    const type = card.querySelector('.tag-type');
    if (type) type.textContent = (m.type || (m.category === 'car' ? 'Car' : 'Bike')).toUpperCase();
    const cc = card.querySelector('.tag-cc');
    if (cc) cc.textContent = m.engineCc ? m.engineCc + 'CC' : '';

    const art = card.querySelector('.bike-art');
    if (art) {
      if (m.photo) {
        const img = document.createElement('img');
        img.className = 'bike-art bike-photo';
        img.loading = 'lazy';
        img.alt = m.name;
        img.src = fleet.apiBase + m.photo;
        img.addEventListener('error', () => img.replaceWith(fallbackArt(m)), { once: true });
        art.replaceWith(img);
      } else {
        art.replaceWith(fallbackArt(m));
      }
    }

    const h3 = card.querySelector('.bike-head h3');
    if (h3) {
      const words = String(m.name).trim().split(/\s+/);
      const last = words.length > 1 ? words.pop() : '';
      h3.innerHTML = esc(words.join(' ')) + (last ? ' <span>' + esc(last) + '</span>' : '');
    }
    const desc = card.querySelector('.bike-desc');
    if (desc) {
      const t = String(m.type || '').toLowerCase();
      desc.textContent = t === 'scooter' ? 'Automatic, easy and city-ready.'
        : t === 'motorcycle' ? 'Geared, punchy and built for the open road.'
          : 'Serviced, sanitised and ready to ride.';
    }
    const panel = card.querySelector('.pricing-panel');
    if (panel) panel.classList.remove('open');
    const toggle = card.querySelector('.toggle-pricing');
    if (toggle) {
      toggle.classList.remove('open');
      toggle.firstChild.textContent = 'Show pricing ';
      toggle.addEventListener('click', () => {
        const open = panel.classList.toggle('open');
        toggle.classList.toggle('open', open);
        toggle.firstChild.textContent = open ? 'Hide pricing ' : 'Show pricing ';
      });
    }
    /* Book now: a page that books on its own booking form gets the model's
       slug; a page that sends riders to the HyprVerse link keeps that link. */
    const book = card.querySelector('.bike-actions a.btn-primary');
    if (book && /^booking\.html/.test(book.getAttribute('href') || '')) {
      book.setAttribute('href', 'booking.html?bike=' + encodeURIComponent(m.slug));
    }
    return card;
  }
  function fallbackArt(m) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bike-art bike-svg');
    svg.setAttribute('viewBox', '0 0 360 230');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const sym = String(m.type || '').toLowerCase() === 'motorcycle' ? '#svg-moto' : '#svg-scooter';
    use.setAttribute('href', sym);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', sym);
    svg.appendChild(use);
    return svg;
  }

  /* ── the hero numbers ── */
  function setStat(labelMatch, value, format) {
    const stats = document.querySelectorAll('.hero-stats .stat');
    stats.forEach(stat => {
      const label = stat.querySelector('.stat-label');
      const num = stat.querySelector('.stat-num');
      if (!label || !num || !labelMatch.test(label.textContent)) return;
      num.dataset.count = String(value);
      const paint = () => { num.textContent = format(value); };
      /* The counter may already be mid-animation towards the old figure —
         paint now, and again once its 1.4 s run is certainly over. */
      paint();
      setTimeout(paint, 1700);
    });
  }
  function updateStats(fleet) {
    if (fleet.counts && fleet.counts.total > 0) {
      setStat(/fleet/i, fleet.counts.total, v => String(v));
    }
    const rates = fleet.models.map(m => m.fromRate).filter(r => r > 0);
    if (rates.length) setStat(/starting from/i, Math.min.apply(null, rates), v => '₹' + v);
  }

  /* ── the fleet grid on the home page ── */
  function applyToFleetGrid(fleet) {
    const grid = document.querySelector('.fleet-grid');
    if (!grid || !fleet || !fleet.models.length) return;

    const cards = Array.prototype.slice.call(grid.querySelectorAll('.bike-card'));
    const byKey = {};
    cards.forEach(card => {
      const h3 = card.querySelector('.bike-head h3');
      const cc = card.querySelector('.tag-cc');
      if (h3) byKey[keyOf(h3.textContent, cc ? cc.textContent : '')] = card;
    });

    const seen = {};
    fleet.models.forEach(m => {
      const key = keyOf(m.name, m.engineCc);
      let card = byKey[key];
      if (!card && cards[0]) {
        card = buildCard(cards[0], m, fleet);
        grid.appendChild(card);
      }
      if (!card) return;
      seen[key] = true;
      decorate(card, m, fleet);
    });
    Object.keys(byKey).forEach(key => { if (!seen[key]) byKey[key].hidden = true; });

    updateStats(fleet);
    grid.dataset.live = fleet.asOf || '';
    const note = document.querySelector('.fleet-note');
    if (note && fleet.counts) {
      note.textContent = 'Live from the counter — ' + fleet.counts.available + ' of ' + fleet.counts.total
        + ' bikes free right now. All prices are exclusive of GST; applicable taxes are added at the time of billing.';
    }
  }

  fleetPromise.then(fleet => {
    if (!fleet) return;
    const go = () => applyToFleetGrid(fleet);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
    else go();
  });
})();
