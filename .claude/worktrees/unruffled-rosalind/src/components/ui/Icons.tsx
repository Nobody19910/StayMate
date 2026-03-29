"use client";

interface IconProps {
  className?: string;
}

const defaults = "w-4 h-4 inline-block";

// --- Building/Property icons ---

export function IconHome({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

export function IconBuilding({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15v18h-15V3zm3 3h2.25M7.5 9.75h2.25M7.5 13.5h2.25M14.25 6h2.25M14.25 9.75h2.25M14.25 13.5h2.25M7.5 17.25h9v3.75h-9v-3.75z" />
    </svg>
  );
}

export function IconSchool({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L1.5 9l4.5 2.455V16.5L12 20.25l6-3.75v-5.045L21 9.75v6.75M22.5 9L12 3" />
    </svg>
  );
}

export function IconNeighborhood({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 21V10.5L8.25 6l4.5 4.5V21M15.75 21V13.5l3-3 3 3V21M6 13.5h1.5M6 16.5h1.5M9 13.5h1.5M9 16.5h1.5M17.25 16.5h1.5" />
    </svg>
  );
}

export function IconCity({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M5.25 21V6h4.5v15M10.5 21V3h4.5v18M15.75 21V8.25h3v12.75M7.5 9h.75M7.5 12h.75M12.75 6h.75M12.75 9h.75M12.75 12h.75M12.75 15h.75M17.25 11.25h.75M17.25 14.25h.75" />
    </svg>
  );
}

// --- Amenity icons ---

export function IconSnowflake({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5l-5 5-5-5M7 19l5-5 5 5M2 12h20M5 7l5 5-5 5M19 17l-5-5 5-5" />
    </svg>
  );
}

export function IconBolt({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

export function IconDroplet({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c0 0-7.5 8.25-7.5 13.125a7.5 7.5 0 0015 0C19.5 10.5 12 2.25 12 2.25z" />
    </svg>
  );
}

export function IconFaucet({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v3M8.25 4.5h7.5M12 7.5c3.75 0 6 1.5 6 4.5v1.5H6V12c0-3 2.25-4.5 6-4.5zM6 13.5v3c0 2.25 2.686 4.5 6 4.5s6-2.25 6-4.5v-3" />
    </svg>
  );
}

export function IconLock({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

export function IconFrying({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 11.25a8.625 8.625 0 1117.25 0 8.625 8.625 0 01-17.25 0zM20.25 14.25l2.25 2.25" />
    </svg>
  );
}

export function IconTie({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3h4.5L15 6.75l-3 14.25L9 6.75 9.75 3zM9.75 3h4.5" />
    </svg>
  );
}

export function IconSparkles({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

export function IconPool({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75c1.5 0 2.25-.75 3-1.5s1.5-1.5 3-1.5 2.25.75 3 1.5 1.5 1.5 3 1.5 2.25-.75 3-1.5 1.5-1.5 3-1.5M2.25 21.75c1.5 0 2.25-.75 3-1.5s1.5-1.5 3-1.5 2.25.75 3 1.5 1.5 1.5 3 1.5 2.25-.75 3-1.5 1.5-1.5 3-1.5M6.75 3.75v12M17.25 3.75v12M6.75 7.5h10.5M6.75 12h10.5" />
    </svg>
  );
}

export function IconWifi({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  );
}

export function IconCar({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 15.75h-.75a1.5 1.5 0 01-1.5-1.5v-2.25a1.5 1.5 0 011.5-1.5h.75M18.75 15.75h.75a1.5 1.5 0 001.5-1.5v-2.25a1.5 1.5 0 00-1.5-1.5h-.75M6 17.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18 17.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM6.75 10.5l1.5-4.5h7.5l1.5 4.5M5.25 10.5h13.5v5.25a1.5 1.5 0 01-1.5 1.5h-10.5a1.5 1.5 0 01-1.5-1.5V10.5z" />
    </svg>
  );
}

export function IconCouch({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 10.5V7.5a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25v3M3 10.5a1.5 1.5 0 011.5-1.5h.75v5.25H3.75A1.5 1.5 0 013 12.75v-2.25zM18.75 9a1.5 1.5 0 011.5 1.5v2.25a1.5 1.5 0 01-1.5 1.5H18V9h.75zM5.25 14.25h13.5M6 14.25V18M18 14.25V18" />
    </svg>
  );
}

export function IconPlant({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-9M12 12c0-3.314 2.686-6 6-6 0 3.314-2.686 6-6 6zM12 12c0-3.314-2.686-6-6-6 0 3.314 2.686 6 6 6zM12 15c0-2.21-1.79-4-4-4M12 15c0-2.21 1.79-4 4-4" />
    </svg>
  );
}

export function IconBroom({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25v9M8.25 14.25c0-1.5 1.5-3 3.75-3s3.75 1.5 3.75 3v0c0 2.25-.75 5.25-1.5 7.5h-4.5c-.75-2.25-1.5-5.25-1.5-7.5zM9.75 17.25h4.5M10.5 20.25h3" />
    </svg>
  );
}

export function IconShower({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5M3.75 9.75V6a2.25 2.25 0 012.25-2.25h0A2.25 2.25 0 018.25 6v3.75M7.5 13.5v2.25M10.5 13.5v2.25M13.5 13.5v2.25M16.5 13.5v2.25M9 17.25v2.25M12 17.25v2.25M15 17.25v2.25" />
    </svg>
  );
}

export function IconThermometer({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75V2.25M12 9.75a3.75 3.75 0 110 7.5 3.75 3.75 0 010-7.5zM15 3.75h-6M15 6h-6" />
      <circle cx="12" cy="13.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBook({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

export function IconShirt({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 2.25L4.5 5.25 3 9.75l3 1.5V21h12V11.25l3-1.5-1.5-4.5L15 2.25c0 0-.75 2.25-3 2.25S9 2.25 9 2.25z" />
    </svg>
  );
}

export function IconUtensils({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2.25v6a3 3 0 006 0v-6M9 8.25v13.5M17.25 2.25c-1.5 0-3 3-3 6s1.5 3.75 3 3.75V21.75" />
    </svg>
  );
}

export function IconCamera({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

export function IconBasket({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5l-1.5 11.25H5.25L3.75 9.75zM8.25 9.75V6a3.75 3.75 0 017.5 0v3.75M7.5 14.25v3M12 14.25v3M16.5 14.25v3" />
    </svg>
  );
}

export function IconChair({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3.75h10.5v7.5H6.75V3.75zM6.75 11.25H4.5v3h15v-3h-2.25M6 14.25v6.75M18 14.25v6.75M6.75 17.25h10.5" />
    </svg>
  );
}

export function IconDoor({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5.25 21V3.75a1.5 1.5 0 011.5-1.5h10.5a1.5 1.5 0 011.5 1.5V21M15 12.75h.008v.008H15v-.008z" />
    </svg>
  );
}

export function IconMountain({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 21l6.75-13.5L14.25 15l3-4.5L21.75 21" />
    </svg>
  );
}

export function IconFire({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 001.95-6.956C13.33 12.257 12 14.25 12 14.25s-1.33-1.993-1.95-3.206A3.75 3.75 0 0012 18z" />
    </svg>
  );
}

// --- Action/Status icons ---

export function IconChat({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443h2.387c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

export function IconCreditCard({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

export function IconCalendar({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

export function IconPhone({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

export function IconMail({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

export function IconPin({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

export function IconChart({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

export function IconTarget({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBell({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

export function IconClipboard({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v.75H9V5.25zM7.5 6v-.75A2.25 2.25 0 019.75 3h4.5a2.25 2.25 0 012.25 2.25V6m-9 0h9m-9 0H6a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 006 21h12a2.25 2.25 0 002.25-2.25V8.25A2.25 2.25 0 0018 6h-1.5" />
    </svg>
  );
}

export function IconMailbox({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v3.75M6.75 8.25h10.5M3.75 9.75v8.25a2.25 2.25 0 002.25 2.25h12a2.25 2.25 0 002.25-2.25V9.75l-3-6H6.75l-3 6z" />
    </svg>
  );
}

export function IconBed({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18.75V7.5M3 7.5v-3a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 4.5v3M3 7.5h18M21 7.5v11.25M3 18.75h18M3 18.75V21M21 18.75V21M6 10.5h3v3H6v-3z" />
    </svg>
  );
}

export function IconRuler({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75l16.5 16.5M5.636 15.364L2.25 18.75h4.5v-4.5l1.114 1.114M18.364 8.636L21.75 5.25h-4.5v4.5l-1.114-1.114M8.818 11.182l1.5-1.5M11.182 8.818l1.5-1.5M13.545 13.545l1.5-1.5" />
    </svg>
  );
}

export function IconFilm({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m-1.125 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M6 10.875v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h-1.5m1.5 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-1.5-3.75c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5 0h-1.5m1.5 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 10.875v1.5c0 .621.504 1.125 1.125 1.125m0 0h-1.5m0-9.75h-10.5" />
    </svg>
  );
}

export function IconShield({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

export function IconParty({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 21L3 15l6 1.5L4.5 21zM3 15l3.5-7L13 11.5 9 16.5 3 15zM15 3v3M18.75 5.25l-2.25 2.25M21 9h-3M10.5 4.5l1.5 1.5M17.25 12.75l1.5 1.5" />
    </svg>
  );
}

export function IconTrash({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export function IconIdCard({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
    </svg>
  );
}

export function IconWarning({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

export function IconShrug({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.75" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.75h.008M15 9.75h.008M8.25 15c.75 1.125 2.025 1.875 3.75 1.875s3-0.75 3.75-1.875" />
    </svg>
  );
}

export function IconCheckCircle({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// --- Symbols ---

export function IconStar({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

export function IconCheck({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export function IconClose({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function IconHeart({ className = defaults }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}
