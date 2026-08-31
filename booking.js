/* ═══════════ HYPRRIDE — booking flow (single page) ═══════════ */
(function () {
  'use strict';

  /* ────────────── data ────────────── */
  const RATES = {
    '110': { wd: [79, 179, 279, 339, 389, 499], we: [99, 219, 329, 409, 469, 599] },
    '125': { wd: [99, 219, 309, 369, 499, 599], we: [119, 259, 369, 439, 509, 699] },
    '160': { wd: [119, 259, 369, 439, 509, 699], we: [139, 309, 449, 529, 609, 839] },
  };
  const SLABS = [
    { key: '1h', label: '1 hr', km: 15, idx: 0, unl: 50 },
    { key: '3h', label: '3 hrs', km: 40, idx: 1, unl: 50 },
    { key: '5h', label: '5 hrs', km: 60, idx: 2, unl: 50 },
    { key: '7h', label: '7 hrs', km: 80, idx: 3, unl: 50 },
    { key: '12h', label: '12 hrs', km: 100, idx: 4, unl: 79 },
    { key: '24h', label: '24 hrs', km: 120, idx: 5, unl: 79 },
  ];

  const VEHICLES = [
    { slug: 'jupiter-110', name: 'TVS Jupiter 110', cc: '110', type: 'Scooter', img: 'jupiter-110.jpg' },
    { slug: 'jupiter-125', name: 'TVS Jupiter 125', cc: '125', type: 'Scooter', img: 'jupiter-125.jpg' },
    { slug: 'ntorq-125', name: 'TVS Ntorq 125', cc: '125', type: 'Scooter', img: 'ntorq-125.avif' },
    { slug: 'raider-125', name: 'TVS Raider 125', cc: '125', type: 'Motorcycle', img: 'tvs-raider-125.jpg' },
    { slug: 'rayzr-125', name: 'Yamaha RayZR 125', cc: '125', type: 'Scooter', img: 'rayzr-125.avif' },
    { slug: 'apache-160', name: 'TVS Apache RTR 160', cc: '160', type: 'Motorcycle', img: '9231777.jpg' },
  ];

  const EXTRA_HELMET = 20;
  const EXTRA_COAT = 50;
  const DEPOSIT_CITY = 1000;
  const DEPOSIT_OUTSTATION = 3000;
  const GST = 0.18;
  const WA_NUMBER = '917032887133';

  /* ────────────── helpers ────────────── */
  const $ = id => document.getElementById(id);
  const rupee = n => '₹' + n.toLocaleString('en-IN');

  const isWeekend = dt => {
    const d = dt.getDay();
    if (d === 0 || d === 6) return true;
    return d === 5 && dt.getHours() >= 17;
  };

  const cleanPhone = raw => {
    let p = (raw || '').replace(/\D/g, '');
    if (p.length === 12 && p.startsWith('91')) p = p.slice(2);
    if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
    return p;
  };
  const validPhone = p => /^[6-9]\d{9}$/.test(p);

  const fmtPickup = dt => dt.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  /* ────────────── state ────────────── */
  const state = {
    vehicle: null,
    slabKey: null,
    helmets: 1,
    coats: 1,
    unlimited: false,
    outstation: false,
  };

  /* ────────────── Important Notes overlay ────────────── */
  const overlay = $('notesOverlay');
  const proceedBtn = $('notesProceed');

  if (overlay) {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    proceedBtn.addEventListener('click', () => {
      overlay.classList.add('hiding');
      setTimeout(() => {
        overlay.hidden = true;
        document.body.style.overflow = '';
      }, 400);
    });

    $('notesBackdrop').addEventListener('click', () => {
      proceedBtn.click();
    });
  }

  /* ────────────── nav bar scrolled ────────────── */
  const nav = $('nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ────────────── field error helpers ────────────── */
  function setErr(inputEl, errEl, msg) {
    if (!errEl) return !msg;
    const field = inputEl ? inputEl.closest('.field') : null;
    if (msg) {
      errEl.textContent = msg;
      errEl.classList.add('show');
      if (field) field.classList.add('invalid');
      if (inputEl) {
        inputEl.setAttribute('aria-invalid', 'true');
        inputEl.setAttribute('aria-describedby', errEl.id);
      }
    } else {
      errEl.classList.remove('show');
      if (field) field.classList.remove('invalid');
      if (inputEl) {
        inputEl.removeAttribute('aria-invalid');
        inputEl.removeAttribute('aria-describedby');
      }
    }
    return !msg;
  }

  /* ────────────── phone input filter ────────────── */
  const fName = $('fName'), fPhone = $('fPhone'), fAddress = $('fAddress');
  [fPhone, $('fEmPhone')].forEach(el => {
    if (el) el.addEventListener('input', () => {
      const digits = el.value.replace(/\D/g, '').slice(0, 12);
      if (el.value !== digits) el.value = digits;
    });
  });

  /* ────────────── outstation toggle ────────────── */
  const fOutstation = $('fOutstation');
  const outstationCard = document.querySelector('.outstation-card');
  const outstationBadge = $('outstationBadge');

  if (fOutstation) {
    fOutstation.addEventListener('change', () => {
      state.outstation = fOutstation.checked;
      if (outstationCard) outstationCard.classList.toggle('active', state.outstation);
      if (outstationBadge) outstationBadge.hidden = !state.outstation;
      renderSummary();
    });
  }

  /* ────────────── vehicle & pickup ────────────── */
  const fVehicle = $('fVehicle'), fPickup = $('fPickup');
  const vehPreview = $('vehPreview'), vehImg = $('vehImg');

  if (fVehicle) {
    VEHICLES.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.slug;
      opt.textContent = v.name + ' · ' + v.type + ' · ' + v.cc + 'cc';
      fVehicle.appendChild(opt);
    });

    const wanted = new URLSearchParams(location.search).get('bike');
    if (wanted && VEHICLES.some(v => v.slug === wanted)) fVehicle.value = wanted;
  }

  const pad = n => String(n).padStart(2, '0');
  const toLocalValue = d =>
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const now = new Date();
  const start = new Date(now.getTime() + (30 - (now.getMinutes() % 30)) * 60000);
  start.setSeconds(0, 0);
  if (start.getHours() < 7) start.setHours(7, 0, 0, 0);

  if (fPickup) {
    fPickup.min = toLocalValue(now);
    fPickup.value = toLocalValue(start);
  }

  const pickupDate = () => {
    if (!fPickup) return null;
    const v = fPickup.value;
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  function onVehicleChange() {
    if (!fVehicle) return;
    state.vehicle = VEHICLES.find(v => v.slug === fVehicle.value) || null;
    const vehRow = document.querySelector('.veh-row');
    if (vehRow) vehRow.classList.toggle('has-preview', !!state.vehicle);

    if (state.vehicle) {
      if (vehImg) {
        vehImg.src = state.vehicle.img;
        vehImg.alt = state.vehicle.name;
      }
      if ($('vehType')) $('vehType').textContent = state.vehicle.type.toUpperCase();
      if ($('vehCC')) $('vehCC').textContent = state.vehicle.cc + 'CC';
      if (vehPreview) vehPreview.hidden = false;
      setErr(fVehicle, $('errVehicle'), '');

      if (!state.slabKey) {
        state.slabKey = '5h';
      }
    } else {
      if (vehPreview) vehPreview.hidden = true;
    }
    renderSlabs();
    renderSummary();
  }

  if (fVehicle) fVehicle.addEventListener('change', onVehicleChange);
  if (fPickup) fPickup.addEventListener('change', () => { renderSlabs(); renderSummary(); });

  /* ────────────── slab pricing ────────────── */
  function slabPrice(slab) {
    if (!state.vehicle) return null;
    const dt = pickupDate();
    if (!dt) return null;
    const rates = RATES[state.vehicle.cc][isWeekend(dt) ? 'we' : 'wd'];
    return slab.days ? rates[5] * slab.days : rates[slab.idx];
  }
  const currentSlab = () => SLABS.find(s => s.key === state.slabKey) || null;

  function renderSlabs() {
    const grid = $('slabGrid');
    if (!grid) return;

    const dt = pickupDate();
    const priced = state.vehicle && dt;
    const badge = $('rateBadge');

    if (priced) {
      if (badge) {
        badge.hidden = false;
        badge.textContent = isWeekend(dt) ? 'WEEKEND RATE' : 'WEEKDAY RATE';
      }
      if ($('slabPrompt')) $('slabPrompt').style.display = 'none';
    } else {
      if (badge) badge.hidden = true;
      if ($('slabPrompt')) $('slabPrompt').style.display = '';
    }

    grid.innerHTML = '';
    SLABS.forEach((slab) => {
      const price = slabPrice(slab);
      const wrap = document.createElement('div');
      wrap.className = 'slab';
      const id = 'slab-' + slab.key;
      wrap.innerHTML =
        '<input type="radio" name="slab" id="' + id + '" value="' + slab.key + '"' +
        (state.slabKey === slab.key ? ' checked' : '') + '>' +
        '<label for="' + id + '"><b>' + slab.label + '</b>' +
        '<small>' + slab.km.toLocaleString('en-IN') + ' km included</small>' +
        '<span class="slab-price">' + (price === null ? '—' : rupee(price)) + '</span></label>';

      wrap.querySelector('input').addEventListener('change', () => {
        // Set state FIRST so subsequent calls use the correct selected slab
        state.slabKey = slab.key;

        if (fVehicle && !fVehicle.value) {
          fVehicle.value = VEHICLES[0].slug;
          onVehicleChange(); // This will renderSlabs & renderSummary internally
        } else {
          setErr(null, $('errSlab'), '');
          updateUnlHint();
          renderSummary();
        }
      });
      grid.appendChild(wrap);
    });
  }

  /* ────────────── add-on steppers ────────────── */
  const LIMITS = { helmet: { min: 1, max: 6 }, raincoat: { min: 0, max: 50 } };
  document.querySelectorAll('.stepper').forEach(st => {
    const kind = st.dataset.addon;
    const val = st.querySelector('.step-val');
    const btns = st.querySelectorAll('.step-btn');
    const refresh = () => {
      const n = kind === 'helmet' ? state.helmets : state.coats;
      if (val) val.textContent = n;
      const atMin = n <= LIMITS[kind].min, atMax = n >= LIMITS[kind].max;
      if (atMin && document.activeElement === btns[0]) btns[1].focus();
      if (atMax && document.activeElement === btns[1]) btns[0].focus();
      btns[0].disabled = atMin;
      btns[1].disabled = atMax;
    };

    btns.forEach(b => b.addEventListener('click', () => {
      const d = +b.dataset.dir;
      if (kind === 'helmet') state.helmets = Math.min(LIMITS.helmet.max, Math.max(LIMITS.helmet.min, state.helmets + d));
      else state.coats = Math.min(LIMITS.raincoat.max, Math.max(LIMITS.raincoat.min, state.coats + d));
      refresh();

      // Auto-select a vehicle if user interacts with addons before picking a vehicle
      if (fVehicle && !fVehicle.value) {
        fVehicle.value = VEHICLES[0].slug;
        onVehicleChange();
      } else {
        renderSummary();
      }
    }));
    refresh();
  });

  /* ────────────── unlimited km (Null Safe) ────────────── */
  const fUnl = $('fUnl');
  function updateUnlHint() {
    const hint = $('unlHint');
    if (!hint) return; // Safeguard if element doesn't exist

    const slab = currentSlab();
    if (!slab) {
      hint.textContent = 'No km cap for your slab — ₹50 on 1–7 hr slabs, ₹79 on 12 hr and above';
    } else if (slab.days) {
      hint.textContent = 'No km cap — ₹79 × ' + slab.days + ' days = ' + rupee(slab.unl) + ' for this slab';
    } else {
      hint.textContent = 'No km cap for your ride — ' + rupee(slab.unl) + ' on the ' + slab.label + ' slab';
    }
  }

  if (fUnl) {
    fUnl.addEventListener('change', () => {
      state.unlimited = fUnl.checked;
      renderSummary();
    });
  }

  /* ────────────── pricing ────────────── */
  function getDeposit() {
    return state.outstation ? DEPOSIT_OUTSTATION : DEPOSIT_CITY;
  }

  function computePrice() {
    const slab = currentSlab();
    const rental = slab ? slabPrice(slab) : null;
    if (rental === null || !slab) return null;

    const extraHelmets = Math.max(0, state.helmets - 1);
    const extraCoats = Math.max(0, state.coats - 1);
    const addons = extraHelmets * EXTRA_HELMET + extraCoats * EXTRA_COAT;
    const unl = state.unlimited ? slab.unl : 0;

    const subtotal = rental + addons + unl;
    const gst = Math.round(subtotal * GST);
    const deposit = getDeposit();
    const total = subtotal + gst + deposit;

    return { slab, rental, extraHelmets, extraCoats, addons, unl, subtotal, gst, deposit, total };
  }

  function priceRowsHTML(p) {
    const dt = pickupDate();
    const mode = dt ? (isWeekend(dt) ? 'Weekend' : 'Weekday') : '';
    let rows = '';

    rows += '<div class="sum-row"><span>Rental · ' + p.slab.label +
      '<small>' + mode + ' slab · ' + p.slab.km.toLocaleString('en-IN') + ' km included</small></span><b>' + rupee(p.rental) + '</b></div>';

    rows += '<div class="sum-row sum-free"><span>Helmet ×1 + raincoat ×' + Math.min(state.coats, 1) +
      ' + hygiene kit<small>Included with every bike</small></span><b>FREE</b></div>';

    if (p.extraHelmets) rows += '<div class="sum-row"><span>Extra helmet ×' + p.extraHelmets + '</span><b>' + rupee(p.extraHelmets * EXTRA_HELMET) + '</b></div>';
    if (p.extraCoats) rows += '<div class="sum-row"><span>Extra raincoat ×' + p.extraCoats + '</span><b>' + rupee(p.extraCoats * EXTRA_COAT) + '</b></div>';
    if (p.unl) rows += '<div class="sum-row"><span>Unlimited kilometres' +
      (p.slab.days ? '<small>₹79 × ' + p.slab.days + ' days</small>' : '') + '</span><b>' + rupee(p.unl) + '</b></div>';

    rows += '<div class="sum-row sum-sub"><span>Subtotal</span><b>' + rupee(p.subtotal) + '</b></div>';
    rows += '<div class="sum-row"><span>GST (18%)</span><b>' + rupee(p.gst) + '</b></div>';
    rows += '<div class="sum-row"><span>Refundable security deposit' +
      (state.outstation ? '<small>Outstation rate</small>' : '<small>Returned in full at drop-off</small>') +
      '</span><b>' + rupee(p.deposit) + '</b></div>';

    return rows;
  }

  function renderSummary() {
    const p = computePrice();
    const rows = $('sumRows');
    if (!rows) return;

    if (!p) {
      rows.innerHTML = '<p class="sum-empty">Pick a vehicle and duration to see your price.</p>';
      if ($('sumTotalWrap')) $('sumTotalWrap').hidden = true;
      if ($('sumDepositNote')) $('sumDepositNote').hidden = true;
      return;
    }

    rows.innerHTML = priceRowsHTML(p);
    if ($('sumTotal')) $('sumTotal').textContent = rupee(p.total);
    if ($('sumTotalWrap')) $('sumTotalWrap').hidden = false;
    if ($('sumDepositNote')) $('sumDepositNote').hidden = false;
    if ($('depositNoteText')) $('depositNoteText').textContent = rupee(p.deposit) + ' refundable security deposit';
  }

  /* ────────────── validation ────────────── */
  function validateForm() {
    let ok = true;
    if (fName) ok = setErr(fName, $('errName'), fName.value.trim() ? '' : 'Please enter your full name.') && ok;

    if (fPhone) {
      const phone = cleanPhone(fPhone.value);
      ok = setErr(fPhone, $('errPhone'), validPhone(phone) ? '' : 'Enter a valid 10-digit Indian mobile number.') && ok;
      if (validPhone(phone)) fPhone.value = phone;
    }

    if (fAddress) ok = setErr(fAddress, $('errAddress'), fAddress.value.trim() ? '' : 'Please enter your current residential address.') && ok;
    if (fVehicle) ok = setErr(fVehicle, $('errVehicle'), state.vehicle ? '' : 'Please choose a vehicle.') && ok;

    const dt = pickupDate();
    let pickupMsg = '';
    if (!dt) pickupMsg = 'Please pick a pickup date and time.';
    else if (dt.getTime() < Date.now() - 60000) pickupMsg = 'Pickup time can\'t be in the past.';
    else if (dt.getHours() < 7) pickupMsg = 'We\'re open 7:00 AM – 12:00 AM — please pick a time within opening hours.';
    if (fPickup) ok = setErr(fPickup, $('errPickup'), pickupMsg) && ok;

    ok = setErr(null, $('errSlab'), currentSlab() ? '' : 'Please select a duration slab.') && ok;

    const fEmPhone = $('fEmPhone');
    if (fEmPhone) {
      const emRaw = fEmPhone.value.trim();
      const em = cleanPhone(emRaw);
      ok = setErr(fEmPhone, $('errEmPhone'), !emRaw || validPhone(em) ? '' : 'Emergency number should be a valid 10-digit mobile.') && ok;
    }

    return ok;
  }

  function focusFirstInvalid() {
    const bad = document.querySelector('[aria-invalid="true"], .field-err.show');
    if (!bad) return;
    if (bad.matches('input,select,textarea')) { bad.focus(); return; }
    const field = bad.closest('.field');
    const ctl = field && field.querySelector('input,select,textarea');
    if (ctl) { ctl.focus(); return; }
    bad.setAttribute('tabindex', '-1');
    bad.focus();
  }

  /* ────────────── WhatsApp message ────────────── */
  function buildWaMessage() {
    const phone = cleanPhone(fPhone ? fPhone.value : '');
    const emName = $('fEmName') ? $('fEmName').value.trim() : '';
    const emPhone = $('fEmPhone') ? cleanPhone($('fEmPhone').value) : '';
    const dt = pickupDate();
    const p = computePrice();
    const L = [];

    L.push('🏍️ *New booking request — HYPRRIDE*');
    L.push('');
    L.push('*Rider*');
    if (fName) L.push('• Name: ' + fName.value.trim());
    L.push('• Phone: +91 ' + phone);
    if (fAddress) L.push('• Address: ' + fAddress.value.trim());
    if (emName || emPhone) L.push('• Emergency contact: ' + (emName || '—') + (emPhone ? ' (+91 ' + emPhone + ')' : ''));
    L.push('');
    L.push('*Ride*');
    L.push('• Vehicle: ' + state.vehicle.name + ' (' + state.vehicle.type + ' · ' + state.vehicle.cc + 'cc)');
    L.push('• Pickup: ' + fmtPickup(dt));
    L.push('• Duration: ' + p.slab.label + ' (' + p.slab.km.toLocaleString('en-IN') + ' km included)');
    L.push('• Rate: ' + (isWeekend(dt) ? 'Weekend' : 'Weekday') + ' slab');
    L.push('• Trip type: ' + (state.outstation ? '🗺️ OUTSTATION' : 'In-city'));
    L.push('');
    L.push('*Add-ons*');
    L.push('• Helmets: ' + state.helmets + (p.extraHelmets ? ' (1 free + ' + p.extraHelmets + ' extra)' : ' (free)'));
    L.push('• Raincoats: ' + (state.coats === 0 ? 'none' : state.coats + (p.extraCoats ? ' (1 free + ' + p.extraCoats + ' extra)' : ' (free)')));
    L.push('• Hygiene kit: 1 (free)');
    L.push('• Unlimited KM: ' + (state.unlimited ? 'Yes (' + rupee(p.unl) + ')' : 'No'));
    L.push('');
    L.push('*Price*');
    L.push('• Rental: ' + rupee(p.rental));
    if (p.addons) L.push('• Add-on extras: ' + rupee(p.addons));
    if (p.unl) L.push('• Unlimited KM: ' + rupee(p.unl));
    L.push('• GST (18%): ' + rupee(p.gst));
    L.push('• Refundable deposit: ' + rupee(p.deposit) + (state.outstation ? ' (outstation)' : ''));
    L.push('• *Total payable: ' + rupee(p.total) + '*');
    L.push('');
    L.push('📄 I will carry my Driving Licence & Aadhaar at pickup for verification.');

    return L.join('\n');
  }

  /* ────────────── save to localStorage for admin ────────────── */
  function saveBookingToStorage(p) {
    const bookings = JSON.parse(localStorage.getItem('hyprride_bookings') || '[]');
    const dt = pickupDate();
    const booking = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      name: fName ? fName.value.trim() : '',
      phone: cleanPhone(fPhone ? fPhone.value : ''),
      address: fAddress ? fAddress.value.trim() : '',
      vehicle: state.vehicle.name,
      vehicleSlug: state.vehicle.slug,
      vehicleType: state.vehicle.type,
      vehicleCC: state.vehicle.cc,
      pickup: dt.toISOString(),
      pickupFormatted: fmtPickup(dt),
      duration: p.slab.label,
      durationKey: p.slab.key,
      kmIncluded: p.slab.km,
      rateType: isWeekend(dt) ? 'Weekend' : 'Weekday',
      outstation: state.outstation,
      helmets: state.helmets,
      raincoats: state.coats,
      unlimitedKM: state.unlimited,
      rental: p.rental,
      addons: p.addons,
      unlimitedCost: p.unl,
      gst: p.gst,
      deposit: p.deposit,
      total: p.total,
      emergencyName: $('fEmName') ? $('fEmName').value.trim() : '',
      emergencyPhone: $('fEmPhone') ? cleanPhone($('fEmPhone').value) : '',
      status: 'pending',
    };
    bookings.unshift(booking);
    localStorage.setItem('hyprride_bookings', JSON.stringify(bookings));
  }

  /* ────────────── form submit ────────────── */
  const bkForm = $('bkForm');
  if (bkForm) {
    bkForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm()) {
        focusFirstInvalid();
        return;
      }
      const p = computePrice();
      if (!p) return;

      saveBookingToStorage(p);

      const url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(buildWaMessage());
      const win = window.open(url, '_blank');
      if (win) win.opener = null; else location.href = url;

      const after = $('waAfter');
      if (after) {
        after.hidden = false;
        after.classList.add('show-flex');
      }
    });
  }

  /* ────────────── init ────────────── */
  onVehicleChange();
  updateUnlHint();
  renderSlabs();
  renderSummary();
})();