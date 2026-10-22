'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function SearchInput({
  id,
  value,
  placeholder,
}: {
  id: string;
  value: string;
  placeholder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const path = usePathname();
  useEffect(() => {
    const focus = () => {
      if (location.hash === '#' + id) ref.current?.focus();
    };
    focus();
    window.addEventListener('hashchange', focus);
    return () => window.removeEventListener('hashchange', focus);
  }, [id, path]);
  return (
    <input
      ref={ref}
      id={id}
      type="search"
      name="q"
      defaultValue={value}
      placeholder={placeholder}
      maxLength={100}
    />
  );
}
