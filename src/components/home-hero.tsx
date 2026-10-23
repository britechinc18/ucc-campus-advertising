'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icon';
const slides = [
  {
    image: '/editorial/workspace.webp',
    alt: 'A sunlit desk with laptops, books, a chair and plants',
    heading: 'Everything you need on campus.',
  },
  {
    image: '/editorial/campus.webp',
    alt: 'The real clock tower and red-roofed buildings at the University of Ghana, photographed by Maxx Sas',
    heading: 'Find it on campus.',
  },
];
export function HomeHero({ search }: { search: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    const restart = () => {
      clearInterval(timer);
      if (paused || hovered || focused || reduced.matches || document.hidden) return;
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
  }, [index, paused, hovered, focused]);
  const move = (direction: number) =>
    setIndex((i) => (i + direction + slides.length) % slides.length);
  return (
    <section
      className="campus-hero hero-carousel"
      aria-labelledby="home-heading"
      aria-roledescription="carousel"
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
      <div className="hero-photographs" aria-hidden="true">
        {slides.map((slide, i) => (
          <Image
            key={slide.image}
            src={slide.image}
            alt=""
            fill
            priority={i === 0}
            sizes="(max-width: 767px) 100vw, 1360px"
            className={`${i === index ? 'is-active' : ''} ${i === 1 ? 'campus-photograph' : ''}`}
          />
        ))}
      </div>
      <span className="sr-only">{slides[index].alt}</span>
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
              Find it
              <br className="mobile-hero-break" /> on campus.
            </>
          )}
        </h1>
        <p>Buy, sell, discover and connect within the community.</p>
        {search}
      </div>
      <div className="hero-carousel-controls" aria-label="Hero image controls">
        <button type="button" aria-label="Previous hero image" onClick={() => move(-1)}>
          <Icon name="back" />
        </button>
        {slides.map((slide, i) => (
          <button
            type="button"
            className="hero-dot"
            key={slide.image}
            aria-label={`Show hero image ${i + 1}`}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
          >
            <span />
          </button>
        ))}
        <button type="button" aria-label="Next hero image" onClick={() => move(1)}>
          <Icon name="arrow" />
        </button>
        <button
          type="button"
          className="hero-rotation"
          aria-label={paused ? 'Resume automatic hero rotation' : 'Pause automatic hero rotation'}
          onClick={() => setPaused(!paused)}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
      </div>
    </section>
  );
}
