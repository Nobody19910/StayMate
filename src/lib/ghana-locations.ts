// ─── Ghana Regions → Districts/Towns ─────────────────────────────────────────
// Comprehensive list of Ghana's 16 regions with major cities, towns, and districts.

export interface GhanaRegion {
  name: string;
  capital: string;
  districts: string[];
}

export const GHANA_REGIONS: GhanaRegion[] = [
  {
    name: "Greater Accra",
    capital: "Accra",
    districts: [
      "Accra Central", "East Legon", "Airport Residential", "Cantonments", "Osu",
      "Labone", "Dzorwulu", "Roman Ridge", "North Ridge", "Ridge",
      "Adabraka", "Asylum Down", "Kokomlemle", "Circle", "Nima",
      "Labadi", "Teshie", "Nungua", "Tema", "Tema New Town",
      "Community 1-25 (Tema)", "Spintex", "Baatsonaa", "Sakumono",
      "Ashongman", "Dome", "Kwabenya", "Haatso", "Madina",
      "Adenta", "Oyibi", "Dodowa", "Prampram", "Ningo",
      "Kasoa", "Weija", "Gbawe", "Dansoman", "Kaneshie",
      "Darkuman", "Odorkor", "Abelemkpe", "Achimota", "Tesano",
      "Abeka", "Lapaz", "Kwashieman", "Santa Maria", "Awoshie",
      "Ablekuma", "Pokuase", "Amasaman", "Afienya", "Ashaiman",
      "Kpone", "Ada Foah", "Sege", "Dawhenya",
    ],
  },
  {
    name: "Ashanti",
    capital: "Kumasi",
    districts: [
      "Kumasi Central", "Adum", "Kejetia", "Bantama", "Asafo",
      "Nhyiaeso", "Suame", "Tafo", "Dichemso", "Atonsu",
      "Ayigya", "Bomso", "Kotei", "KNUST Campus", "Ahodwo",
      "Danyame", "Patasi", "Abrepo", "Tanoso", "Santasi",
      "Abuakwa", "Sokoban", "Kwadaso", "Asokwa",
      "Obuasi", "Ejisu", "Konongo", "Mampong", "Offinso",
      "Bekwai", "Juaben", "Agogo", "Mankranso", "Nkawie",
      "Tepa", "New Edubiase", "Nsuta",
    ],
  },
  {
    name: "Central",
    capital: "Cape Coast",
    districts: [
      "Cape Coast", "UCC Campus", "Pedu", "Abura", "Ola",
      "Elmina", "Saltpond", "Mankessim", "Winneba", "Kasoa",
      "Agona Swedru", "Assin Fosu", "Dunkwa-on-Offin", "Twifo Praso",
      "Anomabu", "Moree", "Birwa", "Apam", "Biriwa",
      "Komenda", "Sekondi", "Abakrampa",
    ],
  },
  {
    name: "Western",
    capital: "Sekondi-Takoradi",
    districts: [
      "Takoradi", "Sekondi", "Effia", "Anaji", "Airport Ridge (Takoradi)",
      "Beach Road", "Market Circle", "Kojokrom", "Essikado",
      "Tarkwa", "Bogoso", "Prestea", "Axim", "Half Assini",
      "Agona Nkwanta", "Shama", "Elubo", "Enchi",
      "Bibiani", "Sefwi Wiawso",
    ],
  },
  {
    name: "Eastern",
    capital: "Koforidua",
    districts: [
      "Koforidua", "New Juaben", "Effiduase", "Nsawam", "Suhum",
      "Nkawkaw", "Mpraeso", "Abetifi", "Akropong", "Mampong (Eastern)",
      "Akim Oda", "Akim Tafo", "Kade", "Asamankese",
      "Akosombo", "Atimpoku", "Somanya", "Krobo Odumase",
      "Donkorkrom", "Afram Plains", "Begoro",
    ],
  },
  {
    name: "Volta",
    capital: "Ho",
    districts: [
      "Ho", "Ho Central", "Bankoe", "Fiave", "Sokode",
      "Hohoe", "Kpando", "Aflao", "Keta", "Denu",
      "Akatsi", "Adaklu", "Peki", "Jasikan",
      "Kadjebi", "Nkwanta", "Have", "Dzodze",
      "Anloga", "Sogakope",
    ],
  },
  {
    name: "Northern",
    capital: "Tamale",
    districts: [
      "Tamale Central", "Tamale South", "Lamashegu", "Vittin",
      "Jisonayili", "Sagnarigu", "Nyohini", "Kukuo",
      "Yendi", "Savelugu", "Damongo", "Bole",
      "Salaga", "Buipe", "Tolon", "Kumbungu",
      "Walewale", "Nalerigu",
    ],
  },
  {
    name: "Upper East",
    capital: "Bolgatanga",
    districts: [
      "Bolgatanga", "Navrongo", "Bawku", "Zebilla",
      "Paga", "Sandema", "Tongo", "Sirigu",
      "Nangodi", "Binduri", "Garu", "Tempane",
      "Pusiga", "Bongo",
    ],
  },
  {
    name: "Upper West",
    capital: "Wa",
    districts: [
      "Wa", "Wa Central", "Tumu", "Lawra",
      "Nandom", "Jirapa", "Nadowli", "Lambussie",
      "Sissala", "Funsi", "Gwollu", "Hamile",
    ],
  },
  {
    name: "Bono",
    capital: "Sunyani",
    districts: [
      "Sunyani", "Sunyani Central", "Berekum", "Dormaa Ahenkro",
      "Nkoranza", "Techiman", "Wenchi", "Kintampo",
      "Atebubu", "Yeji", "Sampa", "Drobo",
      "Japekrom", "New Drobo",
    ],
  },
  {
    name: "Bono East",
    capital: "Techiman",
    districts: [
      "Techiman", "Techiman Central", "Nkoranza", "Kintampo",
      "Atebubu", "Yeji", "Prang", "Kwame Danso",
    ],
  },
  {
    name: "Ahafo",
    capital: "Goaso",
    districts: [
      "Goaso", "Bechem", "Duayaw Nkwanta", "Kukuom",
      "Hwidiem", "Kenyasi", "Acherensua",
    ],
  },
  {
    name: "Western North",
    capital: "Sefwi Wiawso",
    districts: [
      "Sefwi Wiawso", "Bibiani", "Enchi", "Juaboso",
      "Akontombra", "Bodi", "Dadieso", "Essam",
    ],
  },
  {
    name: "Oti",
    capital: "Dambai",
    districts: [
      "Dambai", "Nkwanta", "Kadjebi", "Jasikan",
      "Krachi", "Chinderi", "Kete Krachi",
    ],
  },
  {
    name: "North East",
    capital: "Nalerigu",
    districts: [
      "Nalerigu", "Gambaga", "Walewale", "Bunkpurugu",
      "Yunyoo", "Chereponi",
    ],
  },
  {
    name: "Savannah",
    capital: "Damongo",
    districts: [
      "Damongo", "Bole", "Salaga", "Buipe",
      "Sawla", "Tuna", "Daboya", "Tolon",
    ],
  },
];

// Flat list of all region names
export const REGION_NAMES = GHANA_REGIONS.map(r => r.name);

// Get districts for a region
export function getDistrictsForRegion(regionName: string): string[] {
  return GHANA_REGIONS.find(r => r.name === regionName)?.districts ?? [];
}

// Get region capital
export function getRegionCapital(regionName: string): string {
  return GHANA_REGIONS.find(r => r.name === regionName)?.capital ?? "";
}

// Flat list of all major cities (region capitals)
export const MAJOR_CITIES = GHANA_REGIONS.map(r => r.capital);
