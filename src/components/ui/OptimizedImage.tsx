"use client";

import { useState, useRef, useEffect, memo } from "react";
import { getCachedImageUrl } from "@/lib/image-cache";
import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

/**
 * Supabase Storage image transform URL builder.
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
 * Progressive blur-up image with native Capacitor filesystem caching.
 *
 * On native (Capacitor):
 * 1. Show tiny blurred placeholder
 * 2. Check native filesystem cache for full image → instant if cached
 * 3. If not cached, download + save to app cache dir (no permission needed)
 * 4. Crossfade from blur → sharp
 *
 * On web (browser):
 * 1. Same blur-up, but uses SW cache instead of filesystem
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

  const alreadyCached = loadedCache.has(fullSrc);

  const [resolvedSrc, setResolvedSrc] = useState(alreadyCached ? fullSrc : "");
  const [fullLoaded, setFullLoaded] = useState(alreadyCached);
  const [inView, setInView] = useState(priority || alreadyCached);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading
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
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  // Resolve image source — on native, check filesystem cache first
  useEffect(() => {
    if (!inView || alreadyCached) return;

    if (isNative) {
      getCachedImageUrl(fullSrc).then((cached) => {
        setResolvedSrc(cached);
      });
    } else {
      setResolvedSrc(fullSrc);
    }
  }, [inView, fullSrc, alreadyCached]);

  function handleFullLoad() {
    loadedCache.add(fullSrc);
    setFullLoaded(true);
  }

  return (
    <div ref={containerRef} className={className} style={style}>
      {/* Layer 1: Tiny blurred placeholder */}
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
            transform: "scale(1.05)",
            opacity: fullLoaded ? 0 : 1,
            transition: "opacity 0.3s ease-out",
          }}
        />
      )}

      {/* Layer 2: Full resolution (from native cache or network) */}
      {resolvedSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
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
