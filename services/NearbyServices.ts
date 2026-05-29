import NetInfo from '@react-native-community/netinfo';
import { getCached, setCache } from './OfflineCache';

export type ServiceCategory =
  | 'hospital'
  | 'police'
  | 'ambulance_station'
  | 'towing'
  | 'puncture_shop'
  | 'car_showroom'
  | 'fire_station'
  | 'pharmacy';

export interface NearbyPlace {
  id: string;
  name: string;
  category: ServiceCategory;
  lat: number;
  lng: number;
  distanceKm: number;
  phone?: string;
  address?: string;
  openNow?: boolean;
}

// Overpass API query templates per category
const OVERPASS_TAGS: Record<ServiceCategory, string> = {
  hospital:          '["amenity"~"hospital|clinic"]',
  police:            '["amenity"="police"]',
  ambulance_station: '["emergency"~"ambulance_station|landing_site"]',
  towing:            '["amenity"~"vehicle_inspection"]["service:vehicle:tyres"]|["shop"="tyres"]["service:vehicle:tyres"]',
  puncture_shop:     '["shop"~"tyres|bicycle"]["service:bicycle:repair"]|["shop"="tyres"]',
  car_showroom:      '["shop"~"car|motorcycle"]',
  fire_station:      '["amenity"="fire_station"]',
  pharmacy:          '["amenity"="pharmacy"]',
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_M = 5000; // 5km default

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchFromOverpass(
  lat: number, lng: number, category: ServiceCategory, radiusM = RADIUS_M
): Promise<NearbyPlace[]> {
  const tag = OVERPASS_TAGS[category];
  const query = `[out:json][timeout:10];
(node${tag}(around:${radiusM},${lat},${lng});
 way${tag}(around:${radiusM},${lat},${lng}););
out center 20;`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const json = await res.json();

  return (json.elements ?? []).map((el: any) => {
    const elLat = el.lat ?? el.center?.lat ?? 0;
    const elLng = el.lon ?? el.center?.lon ?? 0;
    return {
      id: String(el.id),
      name: el.tags?.name ?? el.tags?.['name:en'] ?? categoryLabel(category),
      category,
      lat: elLat,
      lng: elLng,
      distanceKm: haversineKm(lat, lng, elLat, elLng),
      phone: el.tags?.phone ?? el.tags?.['contact:phone'],
      address: [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', ') || undefined,
    } as NearbyPlace;
  }).sort((a: NearbyPlace, b: NearbyPlace) => a.distanceKm - b.distanceKm);
}

export async function getNearby(
  lat: number,
  lng: number,
  category: ServiceCategory,
  radiusM = RADIUS_M
): Promise<{ places: NearbyPlace[]; fromCache: boolean }> {
  // Try cache first
  const cached = await getCached<NearbyPlace[]>(lat, lng, category);

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    return { places: cached ?? [], fromCache: true };
  }

  try {
    const places = await fetchFromOverpass(lat, lng, category, radiusM);
    if (places.length > 0) await setCache(lat, lng, category, places);
    return { places, fromCache: false };
  } catch {
    // Network failed mid-request — fall back to cache
    return { places: cached ?? [], fromCache: true };
  }
}

export async function getAllNearby(lat: number, lng: number): Promise<{
  results: Record<ServiceCategory, NearbyPlace[]>;
  fromCache: boolean;
}> {
  const categories: ServiceCategory[] = [
    'hospital', 'police', 'ambulance_station',
    'towing', 'puncture_shop', 'car_showroom',
    'fire_station', 'pharmacy',
  ];

  const settled = await Promise.allSettled(
    categories.map((c) => getNearby(lat, lng, c))
  );

  const results = {} as Record<ServiceCategory, NearbyPlace[]>;
  let anyFromCache = false;
  categories.forEach((cat, i) => {
    const r = settled[i];
    if (r.status === 'fulfilled') {
      results[cat] = r.value.places;
      if (r.value.fromCache) anyFromCache = true;
    } else {
      results[cat] = [];
    }
  });

  return { results, fromCache: anyFromCache };
}

// Reverse-geocode country from coordinates using Nominatim (OSM, free)
export async function getCountryCode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'BlackBoxSOS/1.0' } }
    );
    const json = await res.json();
    return json.address?.country_code?.toUpperCase() ?? 'IN';
  } catch { return 'IN'; }
}

export function categoryLabel(c: ServiceCategory): string {
  return {
    hospital: 'Hospital',
    police: 'Police Station',
    ambulance_station: 'Ambulance',
    towing: 'Towing Service',
    puncture_shop: 'Puncture Shop',
    car_showroom: 'Car Showroom',
    fire_station: 'Fire Station',
    pharmacy: 'Pharmacy',
  }[c] ?? c;
}

export function categoryIcon(c: ServiceCategory): string {
  return {
    hospital: '🏥',
    police: '👮',
    ambulance_station: '🚑',
    towing: '🚛',
    puncture_shop: '🔧',
    car_showroom: '🚗',
    fire_station: '🚒',
    pharmacy: '💊',
  }[c] ?? '📍';
}
