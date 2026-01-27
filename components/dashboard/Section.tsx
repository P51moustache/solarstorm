'use client';

import { ReactNode } from 'react';

interface SectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, children, className = '' }: SectionProps) {
  return (
    <section className={`mb-6 ${className}`}>
      {title && (
        <h2 className="text-base font-semibold text-solar-text mb-3">{title}</h2>
      )}
      {children}
    </section>
  );
}
