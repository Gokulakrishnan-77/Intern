/**
 * Free OpenStreetMap Nominatim Geocoding Service
 * No API key required. Respects Nominatim usage policy (1 request/sec or user-triggered).
 */

export const searchPlaces = async (query) => {
  if (!query || query.trim().length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&addressdetails=1&limit=5`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item) => ({
      placeId: item.place_id,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.county || '',
      state: item.address?.state || '',
      neighborhood: item.address?.suburb || item.address?.neighbourhood || '',
    }));
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
};

export const reverseGeocode = async (lat, lon) => {
  try {
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) return null;

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedLat}&lon=${parsedLon}`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    if (!response.ok) return null;
    const item = await response.json();
    return {
      displayName: item.display_name,
      address: item.address,
      lat: parsedLat,
      lon: parsedLon,
      city: item.address?.city || item.address?.town || item.address?.village || '',
      state: item.address?.state || '',
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
};
