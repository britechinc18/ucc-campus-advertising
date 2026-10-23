'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
const slides = [
  {
    image: '/editorial/workspace.webp',
    alt: 'A sunlit desk with laptops, books, a chair and plants',
    heading: 'Everything you need on campus.',
  },
  {
    image: '/editorial/campus.webp',
    alt: 'The real clock tower and red-roofed buildings at the University of Ghana, photographed by Maxx Sas',
    heading: 'Your next great find, right on campus.',
  },
];
export function HomeHero({ search }: { search: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    const restart = () => {
      clearInterval(timer);
      if (hovered || focused || reduced.matches || document.hidden) return;
      timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 180_000);
    };
    restart();
    reduced.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
    return () => {
      clearInterval(timer);
      reduced.removeEventListener('change', restart);
      document.removeEventListener('visibilitychange', restart);
    };
  }, [index, hovered, focused]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat
      )
        return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        target.closest(
          'input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="dialog"],[role="menu"],[role="slider"],[role="combobox"]',
        ) ||
        document.querySelector('[aria-modal="true"],.account-menu[open],.notification-menu[open]')
      )
        return;
      const box = hero.current?.getBoundingClientRect();
      if (!box || box.bottom <= 0 || box.top >= window.innerHeight) return;
      event.preventDefault();
      setIndex((i) => (i + (event.key === 'ArrowLeft' ? -1 : 1) + slides.length) % slides.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const move = (direction: number) =>
    setIndex((i) => (i + direction + slides.length) % slides.length);
  return (
    <section
      ref={hero}
      className="campus-hero hero-carousel"
      aria-labelledby="home-heading"
      aria-roledescription="carousel"
      aria-describedby="hero-instructions"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onPointerDown={(e) => {
        if (
          !e.isPrimary ||
          e.button !== 0 ||
          (e.target as HTMLElement).closest('input,button,a,textarea,select')
        )
          return;
        pointer.current = { x: e.clientX, y: e.clientY };
        if (e.pointerType === 'mouse') e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onDragStart={(e) => e.preventDefault()}
      onLostPointerCapture={() => {
        pointer.current = null;
      }}
      onPointerCancel={() => {
        pointer.current = null;
      }}
      onPointerUp={(e) => {
        const start = pointer.current;
        pointer.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
        if (!start) return;
        const dx = e.clientX - start.x,
          dy = e.clientY - start.y;
        if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
      }}
    >
      <div
        className="hero-photographs"
        aria-hidden="true"
        style={{ transform: `translateX(-${index * 50}%)` }}
      >
        <div className="hero-photo-frame">
          <Image
            src={slides[0].image}
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, 1360px"
          />
        </div>
        <div className="hero-photo-frame campus-frame">
          <div className="campus-scene">
            <Image
              src={slides[1].image}
              alt=""
              fill
              sizes="(max-width: 767px) 70vw, 800px"
              className="campus-day"
            />
            <Image
              src="/editorial/campus-dusk.webp"
              alt=""
              fill
              sizes="(max-width: 767px) 70vw, 800px"
              className="campus-night"
            />
          </div>
        </div>
      </div>
      <span id="hero-instructions" className="sr-only">
        Swipe, drag or use the left and right arrow keys to change the photograph. Automatic
        rotation pauses while this area is focused.
      </span>
      <span className={`sr-only ${index === 1 ? 'campus-day-description' : ''}`}>
        {slides[index].alt}
      </span>
      {index === 1 ? (
        <span className="sr-only campus-night-description">
          Real campus buildings illuminated at dusk, photographed by Afrank4436.
        </span>
      ) : null}
      <div className="campus-hero-copy">
        <h1 id="home-heading">
          {index === 0 ? (
            <>
              Everything you need
              <br />
              on campus.
            </>
          ) : (
            <>
              Your next great find,
              <br />
              right on campus.
            </>
          )}
        </h1>
        <p>Buy, sell, discover and connect within the community.</p>
        {search}
      </div>
    </section>
  );
}
