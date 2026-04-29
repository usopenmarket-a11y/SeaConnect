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

// ── useTilt — pointer-driven 3D tilt for cards ────────
function useTilt(max = 8) {
  const ref = React.useRef(null);
  const [s, setS] = React.useState({ rx: 0, ry: 0, mx: 50, my: 50, hover: false });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      setS({
        rx: (0.5 - y) * max * 2,
        ry: (x - 0.5) * max * 2,
        mx: x * 100,
        my: y * 100,
        hover: true,
      });
    };
    const onLeave = () => setS({ rx: 0, ry: 0, mx: 50, my: 50, hover: false });
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max]);
  const style = {
    transform: `perspective(900px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) translateZ(0)`,
    transition: s.hover ? 'transform 0.08s linear' : 'transform 0.5s cubic-bezier(.2,.8,.2,1)',
  };
  return { ref, style, mx: s.mx, my: s.my, hover: s.hover };
}

// ── useMagnetic — buttons drift toward cursor ─────────
function useMagnetic(strength = 14) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate3d(${(x / r.width) * strength}px, ${(y / r.height) * strength}px, 0)`;
    };
    const onLeave = () => { el.style.transform = 'translate3d(0,0,0)'; };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [strength]);
  return ref;
}

// ── useCountUp — count to target when in view ────────
function useCountUp(target, opts = {}) {
  const ref = React.useRef(null);
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          io.disconnect();
          const dur = opts.duration || 1500;
          const t0 = performance.now();
          const tick = (now) => {
            const t = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            setN(target * eased);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return { ref, value: n };
}

// alias
function useScrollScrub() { return useScrollProgress(); }

Object.assign(window, { useReveal, Reveal, RevealStagger, useParallax, useScrollProgress, useTilt, useMagnetic, useCountUp, useScrollScrub });
