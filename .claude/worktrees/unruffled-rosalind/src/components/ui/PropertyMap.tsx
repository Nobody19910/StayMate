'use client';

interface PropertyMapProps {
  lat?: number;
  lng?: number;
  title?: string;
  city?: string;
}

export default function PropertyMap({
  lat,
  lng,
  title = 'Property Location',
  city,
}: PropertyMapProps) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Location</p>
      <p className="text-sm font-medium text-gray-900">{city || 'Location not specified'}</p>
      {title && <p className="text-xs text-gray-500 mt-1">{title}</p>}
    </div>
  );
}
