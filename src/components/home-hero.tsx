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
    heading: 'Your next great find, right here on campus.',
  },
];
export function HomeHero({ search }: { search: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
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
  const move = (direction: number) =>
    setIndex((i) => (i + direction + slides.length) % slides.length);
  return (
    <section
      className="campus-hero hero-carousel"
      aria-labelledby="home-heading"
      aria-roledescription="carousel"
      aria-describedby="hero-instructions"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          move(e.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('input,button,a'))
          return;
        pointer.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerCancel={() => {
        pointer.current = null;
      }}
      onPointerUp={(e) => {
        const start = pointer.current;
        pointer.current = null;
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
        Swipe or use the left and right arrow keys to change the photograph. Automatic rotation
        pauses while this area is focused.
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
              right here on campus.
            </>
          )}
        </h1>
        <p>Buy, sell, discover and connect within the community.</p>
        {search}
      </div>
    </section>
  );
}
