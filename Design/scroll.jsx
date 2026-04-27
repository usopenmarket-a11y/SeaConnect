/* global React */

// ── Lenis smooth scroll bootstrapper ─────────────────
// Loaded once at app mount. Idempotent.
(function initLenis() {
  if (window.__lenisStarted) return;
  window.__lenisStarted = true;

  const start = () => {
    if (!window.Lenis) return false;
    const lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
    });
    window.__lenis = lenis;
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return true;
  };

  if (!start()) {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/lenis@1.1.13/dist/lenis.min.js';
    s.onload = start;
    document.head.appendChild(s);
  }
})();

// ── useReveal ────────────────────────────────────────
// Returns ref + className to slap on any element you want to fade-and-rise on enter.
function useReveal(opts = {}) {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: opts.threshold || 0.15, rootMargin: opts.rootMargin || '0px 0px -10% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, className: `reveal ${visible ? 'in' : ''}`, visible };
}

// Reveal wrapper component for convenience
function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }) {
  const r = useReveal();
  const Tag = as;
  return (
    <Tag
      ref={r.ref}
      className={`${r.className} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...(rest.style || {}) }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Stagger N children
function RevealStagger({ children, step = 80, className = '', ...rest }) {
  return (
    <div className={className} {...rest}>
      {React.Children.map(children, (c, i) =>
        c ? <Reveal delay={i * step}>{c}</Reveal> : null
      )}
    </div>
  );
}

// ── useParallax ──────────────────────────────────────
// returns ref + style for a CSS transform tied to scroll progress through the element
function useParallax(speed = 0.3, axis = 'y') {
  const ref = React.useRef(null);
  const [t, setT] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // -1 (entering) → 0 (centered) → 1 (leaving)
        const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        setT(progress);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const offset = -t * speed * 100;
  const transform = axis === 'y' ? `translate3d(0, ${offset}px, 0)` : `translate3d(${offset}px, 0, 0)`;
  return { ref, style: { transform, willChange: 'transform' }, t };
}

// ── useScrollProgress ────────────────────────────────
// 0..1 progress of element through viewport (top entering = 0, bottom leaving = 1)
function useScrollProgress() {
  const ref = React.useRef(null);
  const [p, setP] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = r.height + vh;
        const passed = vh - r.top;
        const np = Math.max(0, Math.min(1, passed / total));
        setP(np);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  return { ref, progress: p };
}

Object.assign(window, { useReveal, Reveal, RevealStagger, useParallax, useScrollProgress });
