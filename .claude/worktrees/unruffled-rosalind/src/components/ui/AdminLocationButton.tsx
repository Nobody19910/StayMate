'use client';

interface AdminLocationButtonProps {
  lat?: number;
  lng?: number;
  title?: string;
  city?: string;
}

export default function AdminLocationButton({
  lat,
  lng,
  title,
  city,
}: AdminLocationButtonProps) {
  const hasCoordinates = lat !== undefined && lng !== undefined && lat !== 0 && lng !== 0;

  function openGoogleMaps() {
    if (!hasCoordinates) {
      alert('No coordinates available for this property');
      return;
    }
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
  }

  return (
    <button
      onClick={openGoogleMaps}
      disabled={!hasCoordinates}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        hasCoordinates
          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 003 16.382V5.618a1 1 0 011.553-.894L9 7m0 0l6.553-3.276A1 1 0 0117 5.618v10.764a1 1 0 01-1.553.894L9 13m0 0l-6.553 3.276A1 1 0 003 16.382m0 0V5.618" />
      </svg>
      <span>{city || 'View on Maps'}</span>
      {hasCoordinates && (
        <span className="text-xs text-gray-500 ml-1">
          ({lat?.toFixed(4)}, {lng?.toFixed(4)})
        </span>
      )}
    </button>
  );
}
