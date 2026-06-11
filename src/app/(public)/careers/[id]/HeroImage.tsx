'use client';

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface HeroImageProps {
  src: string;
  alt: string;
}

export function HeroImage({ src, alt }: HeroImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fallbackUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069";

  useEffect(() => {
    setImgSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (imgSrc !== fallbackUrl) {
      setImgSrc(fallbackUrl);
      setHasError(true);
    }
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="relative w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 animate-pulse">
          <Loader2 className="w-8 h-8 text-openlead-blue animate-spin opacity-20" />
        </div>
      )}
      
      <img 
        src={imgSrc} 
        alt={alt} 
        className={`w-full h-full object-cover transition-all duration-1000 ${isLoading ? 'scale-110 blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'}`}
        onLoad={handleLoad}
        onError={handleError}
      />

      {hasError && !isLoading && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full text-[10px] text-white/60 font-bold uppercase tracking-widest border border-white/10">
          <ImageIcon className="w-3 h-3" />
          Stock Visual
        </div>
      )}
    </div>
  );
}
