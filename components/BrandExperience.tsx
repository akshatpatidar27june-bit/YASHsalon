'use client';

import { useEffect, useState } from 'react';

const LOGO_SRC = '/yash-hair-salon-logo.svg';

function YashLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      className={`block h-full w-full object-contain ${className}`}
      alt="Yash Hair Salon & Academy"
      draggable={false}
    />
  );
}

export function BrandLogo() {
  return (
    <div className="h-[42px] w-[170px] overflow-hidden sm:h-[48px] sm:w-[190px]">
      <YashLogo />
    </div>
  );
}

export function BrandExperience() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black"
      aria-label="Yash Hair Salon introduction"
    >
      <div className="flex flex-col items-center">
        <div className="h-[200px] w-[200px] sm:h-[250px] sm:w-[250px]">
          <YashLogo />
        </div>
        <div className="mt-5 h-px w-16 bg-white/30" />
        <span className="mt-4 text-[10px] font-semibold uppercase tracking-[.45em] text-white/75">
          Welcome
        </span>
      </div>
    </div>
  );
}
