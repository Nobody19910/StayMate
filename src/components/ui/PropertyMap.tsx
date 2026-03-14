'use client';

import { useEffect, useState } from 'react';
import { GoogleMap, MarkerF, LoadScriptF } from '@react-google-maps/api';

interface PropertyMapProps {
  lat?: number;
  lng?: number;
  title?: string;
  height?: string;
}

const defaultCenter = {
  lat: 5.6037,
  lng: -0.1870,
};

const mapOptions = {
  zoom: 15,
  mapTypeControl: false,
  fullscreenControl: false,
  streetViewControl: false,
};

export default function PropertyMap({
  lat = defaultCenter.lat,
  lng = defaultCenter.lng,
  title = 'Property Location',
  height = '300px',
}: PropertyMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{ height, background: '#F6F6F6' }}
        className="rounded-xl flex items-center justify-center text-gray-500"
      >
        Loading map...
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        style={{ height }}
        className="rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 text-sm"
      >
        Map API not configured
      </div>
    );
  }

  return (
    <LoadScriptF googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={{ lat, lng }}
        zoom={15}
        options={mapOptions}
      >
        <MarkerF
          position={{ lat, lng }}
          title={title}
          icon={{
            url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMDZDMTY3Ii8+PC9zdmc+',
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16),
          }}
        />
      </GoogleMap>
    </LoadScriptF>
  );
}
