"use client";

import { useState, useRef, useEffect, memo } from "react";

/**
 * Supabase Storage image transform URL builder.
 * Appends width/quality params for server-side resizing.
 */
function getOptimizedUrl(src: string, width: number, quality = 75): string {
  if (!src) return "";
  if (src.includes("supabase.co/storage/v1/object/public/")) {
    const transformUrl = src.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    const sep = transformUrl.includes("?") ? "&" : "?";
    return `${transformUrl}${sep}width=${width}&quality=${quality}`;
  }
  if (src.includes("images.unsplash.com")) {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}w=${width}&q=${quality}&auto=format`;
  }
  return src;
}

/* ── In-memory cache so revisited images paint instantly ── */
const loadedCache = new Set<string>();

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  /** If true, skip lazy/IO and load immediately (e.g. above-the-fold) */
  priority?: boolean;
}

/**
 * Progressive blur-up image:
 * 1. Immediately show a tiny (32px wide, quality 20) blurred placeholder
 * 2. Lazy-load the full-res version (width × quality)
 * 3. Crossfade from blur → sharp
 * 4. Cache URLs in memory so repeat views are instant (0ms swap)
 *
 * Combined with the PWA service worker, images are also cached on disk
 * after first download — subsequent app loads serve from SW cache.
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width = 400,
  quality = 75,
  className = "",
  style,
  priority = false,
}: OptimizedImageProps) {
  const fullSrc = getOptimizedUrl(src, width, quality);
  const thumbSrc = getOptimizedUrl(src, 32, 20);

  // If we've already loaded this URL in this session, skip the blur phase
  const alreadyCached = loadedCache.has(fullSrc);

  const [fullLoaded, setFullLoaded] = useState(alreadyCached);
  const [inView, setInView] = useState(priority || alreadyCached);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading (skip if priority or cached)
  useEffect(() => {
    if (inView) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" } // start loading 300px before visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  function handleFullLoad() {
    loadedCache.add(fullSrc);
    setFullLoaded(true);
  }

  return (
    <div ref={containerRef} className={className} style={style}>
      {/* Layer 1: Tiny blurred placeholder — loads almost instantly */}
      {inView && !alreadyCached && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc}
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "blur(12px)",
            transform: "scale(1.05)", // hide blur edge artifacts
            opacity: fullLoaded ? 0 : 1,
            transition: "opacity 0.3s ease-out",
          }}
        />
      )}

      {/* Layer 2: Full resolution image — crossfades in on load */}
      {inView && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fullSrc}
          alt={alt}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          onLoad={handleFullLoad}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: fullLoaded ? 1 : 0,
            transition: alreadyCached ? "none" : "opacity 0.3s ease-in",
          }}
        />
      )}
    </div>
  );
});

export default OptimizedImage;
