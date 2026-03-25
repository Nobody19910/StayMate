"use client";

import { useState, useRef, useEffect, memo } from "react";

/**
 * Supabase Storage image transform URL builder.
 * Appends ?width=N&quality=Q to Supabase storage public URLs.
 * Falls back to original URL for non-Supabase images.
 */
function getOptimizedUrl(src: string, width: number, quality = 75): string {
  if (!src) return "";
  // Supabase storage public URLs contain /storage/v1/object/public/
  if (src.includes("supabase.co/storage/v1/object/public/")) {
    // Use Supabase image transform endpoint
    const transformUrl = src.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    const sep = transformUrl.includes("?") ? "&" : "?";
    return `${transformUrl}${sep}width=${width}&quality=${quality}`;
  }
  // Unsplash — use their built-in resize
  if (src.includes("images.unsplash.com")) {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}w=${width}&q=${quality}&auto=format`;
  }
  return src;
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;  // desired display width in CSS px (used for transform sizing)
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Lazy-loaded image with:
 * - Supabase/Unsplash resize transforms (smaller downloads)
 * - IntersectionObserver lazy loading (no offscreen paints)
 * - Fade-in on load (perceived smoothness)
 * - CSS contain for layout stability
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width = 400,
  quality = 75,
  className = "",
  style,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // start loading 200px before visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const optimizedSrc = getOptimizedUrl(src, width, quality);

  return (
    <div ref={imgRef} className={className} style={style}>
      {inView && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={optimizedSrc}
          alt={alt}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.25s ease-in",
          }}
        />
      )}
    </div>
  );
});

export default OptimizedImage;
