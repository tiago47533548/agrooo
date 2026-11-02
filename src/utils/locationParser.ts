import { MISIONES_MUNICIPALITIES } from '../db/misionesCatalog';

export interface ParsedLocationResult {
  success: boolean;
  lat: number | null;
  lng: number | null;
  rawInput: string;
  sourceType: 'google_maps_url' | 'whatsapp_location' | 'geo_uri' | 'osm_url' | 'raw_decimal' | 'dms_coordinates' | 'unknown';
  estimatedMunicipality: string | null;
  distanceKmToMunicipality: number | null;
  isInMisionesRange: boolean;
  formattedText: string;
  errorMessage?: string;
}

/**
 * Calculates haversine distance in kilometers between two lat/lng points
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Finds the nearest Misiones municipality to a given coordinate
 */
export function findNearestMisionesMunicipality(lat: number, lng: number): { name: string; distanceKm: number } | null {
  if (isNaN(lat) || isNaN(lng)) return null;

  let nearestName = MISIONES_MUNICIPALITIES[0]?.name || 'Oberá';
  let minDistance = Infinity;

  for (const m of MISIONES_MUNICIPALITIES) {
    const d = calculateDistanceKm(lat, lng, m.lat, m.lng);
    if (d < minDistance) {
      minDistance = d;
      nearestName = m.name;
    }
  }

  return { name: nearestName, distanceKm: minDistance };
}

/**
 * Checks if coordinates fall within or immediately adjacent to Misiones Province
 * Misiones bounding box approx: Lat [-28.3, -25.4], Lng [-56.3, -53.5]
 */
export function isCoordinateInMisionesRange(lat: number, lng: number): boolean {
  return lat >= -28.6 && lat <= -25.2 && lng >= -56.6 && lng <= -53.4;
}

/**
 * Parse Degrees, Minutes, Seconds (e.g. 27°29'10.3"S 55°07'13.8"W)
 */
function parseDMS(input: string): { lat: number; lng: number } | null {
  const dmsRegex = /(\d+)[\s°]+(\d+)[\s']+(\d+(?:\.\d+)?)[\s"]*([NSEWnsew])[\s,]+(\d+)[\s°]+(\d+)[\s']+(\d+(?:\.\d+)?)[\s"]*([NSEWnsew])/;
  const match = input.match(dmsRegex);
  if (!match) return null;

  const latDeg = parseFloat(match[1]);
  const latMin = parseFloat(match[2]);
  const latSec = parseFloat(match[3]);
  const latDir = match[4].toUpperCase();

  const lngDeg = parseFloat(match[5]);
  const lngMin = parseFloat(match[6]);
  const lngSec = parseFloat(match[7]);
  const lngDir = match[8].toUpperCase();

  let lat = latDeg + latMin / 60 + latSec / 3600;
  if (latDir === 'S') lat = -lat;

  let lng = lngDeg + lngMin / 60 + lngSec / 3600;
  if (lngDir === 'W' || lngDir === 'O') lng = -lng;

  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

/**
 * Main parser: accepts links (WhatsApp, Google Maps, OSM), geo URIs or raw coordinate strings
 */
export function parseLocationInput(rawInput: string): ParsedLocationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      success: false,
      lat: null,
      lng: null,
      rawInput,
      sourceType: 'unknown',
      estimatedMunicipality: null,
      distanceKmToMunicipality: null,
      isInMisionesRange: false,
      formattedText: '',
      errorMessage: 'El campo de ubicación está vacío.'
    };
  }

  let lat: number | null = null;
  let lng: number | null = null;
  let sourceType: ParsedLocationResult['sourceType'] = 'unknown';

  // 1. Google Maps / WhatsApp link query pattern: ?q=-27.4862,-55.1205 or q=loc:-27.4862,-55.1205
  const gmapsQueryMatch = trimmed.match(/[?&]q=(?:loc:)?(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/i);
  if (gmapsQueryMatch) {
    lat = parseFloat(gmapsQueryMatch[1]);
    lng = parseFloat(gmapsQueryMatch[2]);
    sourceType = trimmed.toLowerCase().includes('whatsapp') || trimmed.toLowerCase().includes('wa.me') 
      ? 'whatsapp_location' 
      : 'google_maps_url';
  }

  // 2. Google Maps /place/.../@-27.4862,-55.1205
  if (lat === null) {
    const gmapsAtMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (gmapsAtMatch) {
      lat = parseFloat(gmapsAtMatch[1]);
      lng = parseFloat(gmapsAtMatch[2]);
      sourceType = 'google_maps_url';
    }
  }

  // 3. OpenStreetMap URL: mlat=-27.4862&mlon=-55.1205 or #map=16/-27.4862/-55.1205
  if (lat === null) {
    const osmMatch = trimmed.match(/mlat=(-?\d+\.\d+)&mlon=(-?\d+\.\d+)/i) || trimmed.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/i);
    if (osmMatch) {
      lat = parseFloat(osmMatch[1]);
      lng = parseFloat(osmMatch[2]);
      sourceType = 'osm_url';
    }
  }

  // 4. Geo URI: geo:-27.4862,-55.1205
  if (lat === null) {
    const geoMatch = trimmed.match(/geo:(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (geoMatch) {
      lat = parseFloat(geoMatch[1]);
      lng = parseFloat(geoMatch[2]);
      sourceType = 'geo_uri';
    }
  }

  // 5. Degrees, Minutes, Seconds (DMS)
  if (lat === null) {
    const dms = parseDMS(trimmed);
    if (dms) {
      lat = dms.lat;
      lng = dms.lng;
      sourceType = 'dms_coordinates';
    }
  }

  // 6. Raw decimal coordinates: e.g. -27.4862, -55.1205 or -27.4862 -55.1205 or Lat: -27.4862 Lng: -55.1205
  if (lat === null) {
    const decimalMatch = trimmed.match(/(-?\d{1,2}\.\d{3,10})[\s,;|/]+(-?\d{1,3}\.\d{3,10})/);
    if (decimalMatch) {
      const p1 = parseFloat(decimalMatch[1]);
      const p2 = parseFloat(decimalMatch[2]);

      // Detect if reversed (lng first, lat second)
      // Misiones lat is negative around -25 to -28, lng is negative around -53 to -56
      if (p1 < 0 && p1 > -35 && p2 < 0 && p2 < -40) {
        lat = p1;
        lng = p2;
      } else if (p2 < 0 && p2 > -35 && p1 < 0 && p1 < -40) {
        // Inverted: longitude was first
        lat = p2;
        lng = p1;
      } else {
        lat = p1;
        lng = p2;
      }
      sourceType = 'raw_decimal';
    }
  }

  // Validate results
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return {
      success: false,
      lat: null,
      lng: null,
      rawInput,
      sourceType: 'unknown',
      estimatedMunicipality: null,
      distanceKmToMunicipality: null,
      isInMisionesRange: false,
      formattedText: '',
      errorMessage: 'No se pudieron extraer coordenadas válidas del enlace o texto ingresado.'
    };
  }

  // Round to 6 decimals (sub-meter precision)
  lat = Number(lat.toFixed(6));
  lng = Number(lng.toFixed(6));

  const nearest = findNearestMisionesMunicipality(lat, lng);
  const inRange = isCoordinateInMisionesRange(lat, lng);

  return {
    success: true,
    lat,
    lng,
    rawInput,
    sourceType,
    estimatedMunicipality: nearest?.name || null,
    distanceKmToMunicipality: nearest?.distanceKm || null,
    isInMisionesRange: inRange,
    formattedText: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  };
}
