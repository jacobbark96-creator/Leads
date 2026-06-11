'use client';

import React from 'react';

interface HeroImageProps {
  src: string;
  alt: string;
}

export function HeroImage({ src, alt }: HeroImageProps) {
  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-full h-full object-cover"
      onError={(e) => {
        // Fallback if AI image fails
        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069";
      }}
    />
  );
}
