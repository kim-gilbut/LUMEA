(() => {
  const root = document.documentElement;
  const header = document.getElementById('header');
  const announce = document.getElementById('announce');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = window.gsap && window.ScrollTrigger && window.ScrollSmoother;

  let smoother = null;
  let announceH = 0;
  let headerH = 0;

  /* ---------- Header: sits under the announcement bar, then pins to the top ---------- */
  function measure() {
    announceH = announce.offsetHeight;
    headerH = header.offsetHeight;
    root.style.setProperty('--header-h', headerH + 'px');
  }
  function syncHeader(scrollY) {
    root.style.setProperty('--header-offset', Math.max(0, announceH - scrollY) + 'px');
    header.classList.toggle('is-scrolled', scrollY > announceH + 4);
  }
  measure();
  syncHeader(window.scrollY);
  new ResizeObserver(() => {
    measure();
    syncHeader(smoother ? smoother.scrollTop() : window.scrollY);
  }).observe(header);

  /* ---------- In-page anchor links (account for the fixed header) ---------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (id && !target) return;
    e.preventDefault();
    if (smoother) {
      smoother.scrollTo(target || 0, true, target ? `top ${headerH}px` : undefined);
    } else {
      const y = target ? target.getBoundingClientRect().top + window.scrollY - headerH : 0;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  });

  /* ---------- Product video: plays only while visible; sound is opt-in ---------- */
  const video = document.getElementById('product-video');
  const soundBtn = document.getElementById('film-sound');
  if (reduceMotion) {
    video.controls = true;  // no autoplay — let the viewer start it
    soundBtn.hidden = true;
  } else {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.25 }).observe(video);
  }
  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    soundBtn.textContent = video.muted ? '소리 켜기' : '소리 끄기';
    soundBtn.setAttribute('aria-pressed', String(!video.muted));
    if (video.paused) video.play().catch(() => {});
  });

  /* ---------- Fallback: no GSAP (offline) or reduced motion → plain page ---------- */
  if (!hasGsap || reduceMotion) {
    root.classList.remove('is-animating');
    window.addEventListener('scroll', () => syncHeader(window.scrollY), { passive: true });
    return;
  }

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

  smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 1.1,          // seconds to catch up — soft but still responsive
    smoothTouch: 0.1,     // keep touch scrolling close to native
    effects: true,        // enables data-lag / data-speed
    normalizeScroll: false,
    onUpdate: (self) => syncHeader(self.scrollTop()),
  });

  const EASE = 'power3.out';
  const once = (trigger, start = 'top 85%') => ({ trigger, start, once: true });

  /* ---------- Hero: gentle settle on load, slow drift on scroll ---------- */
  const hero = document.getElementById('hero');
  const heroImg = hero.querySelector('img');
  const heroCopy = hero.querySelector('.hero-copy');

  gsap.timeline({ defaults: { ease: EASE } })
    .fromTo(heroImg, { scale: 1.12 }, { scale: 1.04, duration: 2.2, ease: 'power2.out' })
    .fromTo('[data-hero]', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.15 }, 0.5);

  gsap.to(heroImg, {
    yPercent: 18, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to(heroCopy, {
    y: -40, autoAlpha: 0.15, ease: 'none',
    scrollTrigger: { trigger: hero, start: '40% top', end: 'bottom top', scrub: true },
  });

  /* ---------- Reveals ---------- */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    const type = el.dataset.reveal;

    if (type === 'media') {
      gsap.fromTo(el,
        { autoAlpha: 0, clipPath: 'inset(8% 8% 8% 8% round 6px)' },
        { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0% round 6px)', duration: 1.4, ease: 'power3.inOut', scrollTrigger: once(el, 'top 88%') });
    } else if (type === 'panel') {
      gsap.fromTo(el,
        { autoAlpha: 0, y: 40, scale: 0.97 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.3, ease: EASE, scrollTrigger: once(el) });
    } else if (type === 'fade') {
      gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4, ease: 'power1.out', delay: 0.1, scrollTrigger: once(el, 'top 90%') });
    } else {
      gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, scrollTrigger: once(el) });
    }
  });

  gsap.utils.toArray('[data-stagger]').forEach((group) => {
    gsap.fromTo(group.children,
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.09, delay: group.closest('[data-reveal="panel"]') ? 0.35 : 0, scrollTrigger: once(group, 'top 88%') });
  });

  /* ---------- Parallax: image drifts inside its frame for depth ---------- */
  gsap.utils.toArray('[data-parallax]').forEach((frame) => {
    gsap.fromTo(frame.querySelector('img'),
      { yPercent: -7 },
      { yPercent: 7, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  syncHeader(smoother.scrollTop());

  // Images and late fonts change layout height — recalc trigger positions once they land.
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  root.classList.remove('is-animating');
})();
