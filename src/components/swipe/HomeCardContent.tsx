import type { Property } from "@/lib/types";
import Image from "next/image";

interface Props {
  property: Property;
}

export default function HomeCardContent({ property }: Props) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col">
      {/* Photo */}
      <div className="relative flex-1">
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          className="object-cover"
          sizes="(max-width: 480px) 100vw, 480px"
          unoptimized
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* For Sale badge */}
        {property.forSale && (
          <div className="absolute top-4 right-4 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            FOR SALE
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="px-4 py-3 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{property.title}</h2>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {property.address}, {property.city}
            </p>
          </div>
          <span className="text-base font-extrabold text-black whitespace-nowrap">
            {property.priceLabel}
          </span>
        </div>

        {/* Specs row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <BedIcon />
            {property.beds} {property.beds === 1 ? "bed" : "beds"}
          </span>
          <span className="flex items-center gap-1">
            <BathIcon />
            {property.baths} {property.baths === 1 ? "bath" : "baths"}
          </span>
          <span className="flex items-center gap-1">
            <SqftIcon />
            {property.sqft.toLocaleString()} sqft
          </span>
          <span className="capitalize text-gray-400 ml-auto">{property.propertyType}</span>
        </div>
      </div>
    </div>
  );
}

function BedIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z" />
    </svg>
  );
}
function BathIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7 6c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm11 6H4V6c0-1.1-.9-2-2-2s-2 .9-2 2v6H0v2h24v-2h-6z" />
    </svg>
  );
}
function SqftIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}
