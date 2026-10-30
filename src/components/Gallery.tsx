"use client";

import { useState } from "react";

export function Gallery({ images, alt, fallback }: { images: string[]; alt: string; fallback: React.ReactNode }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return <div className="aspect-square overflow-hidden rounded-2xl bg-surface text-accent">{fallback}</div>;
  }
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-2xl bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={alt} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, idx) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(idx)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${idx === i ? "border-accent" : "border-transparent"}`}
              aria-label={`รูปที่ ${idx + 1}`}
              aria-current={idx === i ? "true" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
