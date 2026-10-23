'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
const slides = [
  {
    image: '/editorial/hero-study.webp',
    alt: 'Editorial arrangement of a laptop, books and backpack',
    heading: 'Everything you need on campus.',
  },
  {
    image: '/editorial/hero-finds.webp',
    alt: 'Editorial arrangement of sneakers, a camera and headphones',
    heading: 'Find it on campus.',
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
      className={`campus-hero hero-carousel ${index === 0 ? 'workspace-hero' : 'campus-hero-slide'}`}
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
        {slides.map((slide, slideIndex) => (
          <div className="hero-photo-frame" key={slide.image}>
            <div className="hero-objects">
              <Image
                src={slide.image}
                alt=""
                fill
                preload={slideIndex === 0}
                sizes="(max-width: 767px) 40vw, 44vw"
              />
            </div>
          </div>
        ))}
      </div>
      <span id="hero-instructions" className="sr-only">
        Swipe, drag or use the left and right arrow keys to change the photograph. Automatic
        rotation pauses while this area is focused.
      </span>
      <span className="sr-only">{slides[index].alt}</span>
      <div className="campus-hero-copy">
        <h1 id="home-heading">
          {index === 0 ? (
            <span>
              Everything you need
              <br />
              on campus.
            </span>
          ) : (
            <span>Find it on campus.</span>
          )}
        </h1>
        <p>
          {index === 0
            ? 'Buy, sell, discover and connect within the community.'
            : 'Buy, sell and discover what students have to offer.'}
        </p>
        {search}
      </div>
    </section>
  );
}
