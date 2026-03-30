export interface AfricanCountry {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  dialCode: string; // e.g. "+233"
  flag: string; // emoji flag
  currency: string; // ISO 4217
  currencySymbol: string;
  digits: number; // local digits after country code (excluding leading 0)
}

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  { name: "Algeria",                  code: "DZ", dialCode: "+213", flag: "🇩🇿", currency: "DZD", currencySymbol: "DA",  digits: 9 },
  { name: "Angola",                   code: "AO", dialCode: "+244", flag: "🇦🇴", currency: "AOA", currencySymbol: "Kz",  digits: 9 },
  { name: "Benin",                    code: "BJ", dialCode: "+229", flag: "🇧🇯", currency: "XOF", currencySymbol: "CFA", digits: 8 },
  { name: "Botswana",                 code: "BW", dialCode: "+267", flag: "🇧🇼", currency: "BWP", currencySymbol: "P",   digits: 7 },
  { name: "Burkina Faso",             code: "BF", dialCode: "+226", flag: "🇧🇫", currency: "XOF", currencySymbol: "CFA", digits: 8 },
  { name: "Burundi",                  code: "BI", dialCode: "+257", flag: "🇧🇮", currency: "BIF", currencySymbol: "Fr",  digits: 8 },
  { name: "Cabo Verde",               code: "CV", dialCode: "+238", flag: "🇨🇻", currency: "CVE", currencySymbol: "Esc", digits: 7 },
  { name: "Cameroon",                 code: "CM", dialCode: "+237", flag: "🇨🇲", currency: "XAF", currencySymbol: "CFA", digits: 8 },
  { name: "Central African Republic", code: "CF", dialCode: "+236", flag: "🇨🇫", currency: "XAF", currencySymbol: "CFA", digits: 8 },
  { name: "Chad",                     code: "TD", dialCode: "+235", flag: "🇹🇩", currency: "XAF", currencySymbol: "CFA", digits: 8 },
  { name: "Comoros",                  code: "KM", dialCode: "+269", flag: "🇰🇲", currency: "KMF", currencySymbol: "CF",  digits: 7 },
  { name: "Congo (DRC)",              code: "CD", dialCode: "+243", flag: "🇨🇩", currency: "CDF", currencySymbol: "FC",  digits: 9 },
  { name: "Congo (Republic)",         code: "CG", dialCode: "+242", flag: "🇨🇬", currency: "XAF", currencySymbol: "CFA", digits: 9 },
  { name: "Côte d'Ivoire",            code: "CI", dialCode: "+225", flag: "🇨🇮", currency: "XOF", currencySymbol: "CFA", digits: 8 },
  { name: "Djibouti",                 code: "DJ", dialCode: "+253", flag: "🇩🇯", currency: "DJF", currencySymbol: "Fdj", digits: 8 },
  { name: "Egypt",                    code: "EG", dialCode: "+20",  flag: "🇪🇬", currency: "EGP", currencySymbol: "E£",  digits: 10 },
  { name: "Equatorial Guinea",        code: "GQ", dialCode: "+240", flag: "🇬🇶", currency: "XAF", currencySymbol: "CFA", digits: 9 },
  { name: "Eritrea",                  code: "ER", dialCode: "+291", flag: "🇪🇷", currency: "ERN", currencySymbol: "Nfk", digits: 7 },
  { name: "Eswatini",                 code: "SZ", dialCode: "+268", flag: "🇸🇿", currency: "SZL", currencySymbol: "L",   digits: 8 },
  { name: "Ethiopia",                 code: "ET", dialCode: "+251", flag: "🇪🇹", currency: "ETB", currencySymbol: "Br",  digits: 9 },
  { name: "Gabon",                    code: "GA", dialCode: "+241", flag: "🇬🇦", currency: "XAF", currencySymbol: "CFA", digits: 7 },
  { name: "Gambia",                   code: "GM", dialCode: "+220", flag: "🇬🇲", currency: "GMD", currencySymbol: "D",   digits: 7 },
  { name: "Ghana",                    code: "GH", dialCode: "+233", flag: "🇬🇭", currency: "GHS", currencySymbol: "GH₵", digits: 9 },
  { name: "Guinea",                   code: "GN", dialCode: "+224", flag: "🇬🇳", currency: "GNF", currencySymbol: "FG",  digits: 9 },
  { name: "Guinea-Bissau",            code: "GW", dialCode: "+245", flag: "🇬🇼", currency: "XOF", currencySymbol: "CFA", digits: 7 },
  { name: "Kenya",                    code: "KE", dialCode: "+254", flag: "🇰🇪", currency: "KES", currencySymbol: "KSh", digits: 9 },
  { name: "Lesotho",                  code: "LS", dialCode: "+266", flag: "🇱🇸", currency: "LSL", currencySymbol: "L",   digits: 8 },
  { name: "Liberia",                  code: "LR", dialCode: "+231", flag: "🇱🇷", currency: "LRD", currencySymbol: "L$",  digits: 7 },
  { name: "Libya",                    code: "LY", dialCode: "+218", flag: "🇱🇾", currency: "LYD", currencySymbol: "LD",  digits: 9 },
  { name: "Madagascar",               code: "MG", dialCode: "+261", flag: "🇲🇬", currency: "MGA", currencySymbol: "Ar",  digits: 9 },
  { name: "Malawi",                   code: "MW", dialCode: "+265", flag: "🇲🇼", currency: "MWK", currencySymbol: "MK",  digits: 9 },
  { name: "Mali",                     code: "ML", dialCode: "+223", flag: "🇲🇱", currency: "XOF", currencySymbol: "CFA", digits: 8 },
  { name: "Mauritania",               code: "MR", dialCode: "+222", flag: "🇲🇷", currency: "MRU", currencySymbol: "UM",  digits: 8 },
  { name: "Mauritius",                code: "MU", dialCode: "+230", flag: "🇲🇺", currency: "MUR", currencySymbol: "Rs",  digits: 8 },
  { name: "Morocco",                  code: "MA", dialCode: "+212", flag: "🇲🇦", currency: "MAD", currencySymbol: "د.م", digits: 9 },
  { name: "Mozambique",               code: "MZ", dialCode: "+258", flag: "🇲🇿", currency: "MZN", currencySymbol: "MT",  digits: 9 },
  { name: "Namibia",                  code: "NA", dialCode: "+264", flag: "🇳🇦", currency: "NAD", currencySymbol: "N$",  digits: 9 },
  { name: "Niger",                    code: "NE", dialCode: "+227", flag: "🇳🇪", currency: "XOF", currencySymbol: "CFA", digits: 8 },
  { name: "Nigeria",                  code: "NG", dialCode: "+234", flag: "🇳🇬", currency: "NGN", currencySymbol: "₦",   digits: 10 },
  { name: "Rwanda",                   code: "RW", dialCode: "+250", flag: "🇷🇼", currency: "RWF", currencySymbol: "Fr",  digits: 9 },
  { name: "São Tomé & Príncipe",      code: "ST", dialCode: "+239", flag: "🇸🇹", currency: "STN", currencySymbol: "Db",  digits: 7 },
  { name: "Senegal",                  code: "SN", dialCode: "+221", flag: "🇸🇳", currency: "XOF", currencySymbol: "CFA", digits: 9 },
  { name: "Seychelles",               code: "SC", dialCode: "+248", flag: "🇸🇨", currency: "SCR", currencySymbol: "Rs",  digits: 7 },
  { name: "Sierra Leone",             code: "SL", dialCode: "+232", flag: "🇸🇱", currency: "SLL", currencySymbol: "Le",  digits: 8 },
  { name: "Somalia",                  code: "SO", dialCode: "+252", flag: "🇸🇴", currency: "SOS", currencySymbol: "Sh",  digits: 8 },
  { name: "South Africa",             code: "ZA", dialCode: "+27",  flag: "🇿🇦", currency: "ZAR", currencySymbol: "R",   digits: 9 },
  { name: "South Sudan",              code: "SS", dialCode: "+211", flag: "🇸🇸", currency: "SSP", currencySymbol: "£",   digits: 9 },
  { name: "Sudan",                    code: "SD", dialCode: "+249", flag: "🇸🇩", currency: "SDG", currencySymbol: "ج.س", digits: 9 },
  { name: "Tanzania",                 code: "TZ", dialCode: "+255", flag: "🇹🇿", currency: "TZS", currencySymbol: "TSh", digits: 9 },
  { name: "Togo",                     code: "TG", dialCode: "+228", flag: "🇹🇬", currency: "XOF", currencySymbol: "CFA", digits: 8 },
  { name: "Tunisia",                  code: "TN", dialCode: "+216", flag: "🇹🇳", currency: "TND", currencySymbol: "DT",  digits: 8 },
  { name: "Uganda",                   code: "UG", dialCode: "+256", flag: "🇺🇬", currency: "UGX", currencySymbol: "USh", digits: 9 },
  { name: "Zambia",                   code: "ZM", dialCode: "+260", flag: "🇿🇲", currency: "ZMW", currencySymbol: "ZK",  digits: 9 },
  { name: "Zimbabwe",                 code: "ZW", dialCode: "+263", flag: "🇿🇼", currency: "ZWL", currencySymbol: "Z$",  digits: 9 },
];

export const DEFAULT_COUNTRY = AFRICAN_COUNTRIES.find(c => c.code === "GH")!;

/** Normalise a raw phone string into E.164 format: +dialCode + local digits (no leading 0) */
export function toE164(local: string, dialCode: string): string {
  const digits = local.replace(/\D/g, "");
  const stripped = digits.startsWith("0") ? digits.slice(1) : digits;
  return `${dialCode}${stripped}`;
}

/** Format local digits as groups of 3: 0XX XXX XXXX */
export function formatLocal(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  // Show leading 0 while typing, remove when converting to E.164
  const d = digits.startsWith("0") ? digits : "0" + digits;
  // Group: 0XX XXX XXXX
  return d.replace(/(\d{3})(\d{0,3})(\d{0,4})/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(" ")
  ).trim();
}
