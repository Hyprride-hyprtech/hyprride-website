/* ═══════════ HYPRRIDE — interactions ═══════════ */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Navbar: scrolled state ── */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile menu ── */
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('menu-open');
    hamburger.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      nav.classList.remove('menu-open');
      hamburger.setAttribute('aria-expanded', 'false');
    })
  );

  /* ── Scrollspy: highlight active nav link ── */
  const sections = ['home', 'fleet', 'story', 'why', 'faq', 'contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const linkFor = {};
  navLinks.querySelectorAll('a').forEach(a => { linkFor[a.getAttribute('href').slice(1)] = a; });
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        const link = linkFor[e.target.id];
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ── Reveal on scroll ── */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const revealer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        revealer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealer.observe(el));

  /* ── Animated counters ── */
  const counters = document.querySelectorAll('[data-count]');
  const runCounter = el => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const dur = 1400;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    if (prefersReduced) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }
    requestAnimationFrame(tick);
  };
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { runCounter(e.target); countObs.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => countObs.observe(c));

  /* ── Fleet: show/hide pricing ── */
  document.querySelectorAll('.toggle-pricing').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.bike-body').querySelector('.pricing-panel');
      const open = panel.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.firstChild.textContent = open ? 'Hide pricing ' : 'Show pricing ';
    });
  });

  /* ── Fleet: subtle tilt on hover ── */
  if (!prefersReduced && matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.bike-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `translateY(-8px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ── Why HYPRRIDE: rotating feature card ── */
  const whySlides = document.querySelectorAll('.why-slide');
  const whyTicks = document.querySelectorAll('#whyRail .rail-tick');
  const whyIndexEl = document.getElementById('whyIndex');
  let whyI = 0, whyTimer = null;
  const showWhy = i => {
    whyI = (i + whySlides.length) % whySlides.length;
    whySlides.forEach((s, k) => s.classList.toggle('active', k === whyI));
    whyTicks.forEach((t, k) => t.classList.toggle('active', k === whyI));
    whyIndexEl.textContent = String(whyI + 1).padStart(2, '0');
  };
  const startWhy = () => {
    clearInterval(whyTimer);
    if (!prefersReduced) whyTimer = setInterval(() => showWhy(whyI + 1), 4000);
  };
  whyTicks.forEach((t, k) => t.addEventListener('click', () => { showWhy(k); startWhy(); }));
  showWhy(0); startWhy();

  /* ── Ride moments: slideshow with progress bar ── */
  const moments = document.querySelectorAll('.moment');
  const momentIndexEl = document.getElementById('momentIndex');
  const momentBar = document.getElementById('momentBar');
  const MOMENT_MS = 5000;
  let momI = 0, momT0 = performance.now();
  const showMoment = i => {
    momI = i % moments.length;
    moments.forEach((m, k) => m.classList.toggle('active', k === momI));
    momentIndexEl.textContent = String(momI + 1).padStart(2, '0');
    momT0 = performance.now();
  };
  if (prefersReduced) {
    momentBar.style.width = '100%';
  } else {
    const momentLoop = now => {
      const p = (now - momT0) / MOMENT_MS;
      if (p >= 1) showMoment(momI + 1);
      momentBar.style.width = (Math.min(p, 1) * 100).toFixed(1) + '%';
      requestAnimationFrame(momentLoop);
    };
    requestAnimationFrame(momentLoop);
  }
  showMoment(0);

  /* ── FAQ: one open at a time ── */
  const faqs = document.querySelectorAll('.faq-item');
  faqs.forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) faqs.forEach(o => { if (o !== item) o.open = false; });
    });
  });
})();
