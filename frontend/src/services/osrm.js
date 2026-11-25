/**
 * Smart OSRM (Open Source Routing Machine) Service
 * Free public routing engine using OpenStreetMap road network.
 * Supports multiple alternative routes, shortest path calculation, and waypoints.
 * Note: OSRM uses [longitude, latitude] coordinate pairs.
 */

// Helper: Haversine distance in km between two lat/lon coordinates
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

export const getRouteDetails = async (startCoords, endCoords) => {
  try {
    const coordinatesString = `${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM route calculation failed');

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No driving route found between specified points');
    }

    const primaryRoute = data.routes[0];
    const distanceKm = Number((primaryRoute.distance / 1000).toFixed(1));
    const durationMinutes = Math.round(primaryRoute.duration / 60);
    const routeCoordinates = primaryRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

    return {
      distanceKm,
      durationMinutes,
      routeCoordinates,
    };
  } catch (error) {
    console.error('OSRM Service error:', error);
    const approxKm = calculateDistanceKm(startCoords.lat, startCoords.lon, endCoords.lat, endCoords.lon);
    return {
      distanceKm: Math.max(1, approxKm),
      durationMinutes: Math.max(2, Math.round(approxKm * 2)),
      routeCoordinates: [
        [startCoords.lat, startCoords.lon],
        [endCoords.lat, endCoords.lon],
      ],
    };
  }
};

/**
 * Smart Multi-Route Engine
 * Fetches multiple routes from actual road network, calculates distance/time,
 * identifies the SHORTEST route, and formats visual themes for each.
 */
export const getSmartRoutes = async (origin, destination, waypoints = []) => {
  if (!origin?.lat || !origin?.lon || !destination?.lat || !destination?.lon) {
    return { routes: [], shortestIndex: 0 };
  }

  // Construct coordinates chain: origin -> waypoint1 -> waypoint2 -> ... -> destination
  const coordList = [{ lat: origin.lat, lon: origin.lon }];

  if (Array.isArray(waypoints)) {
    waypoints.forEach((wp) => {
      if (wp?.lat && wp?.lon) {
        coordList.push({ lat: wp.lat, lon: wp.lon });
      }
    });
  }

  coordList.push({ lat: destination.lat, lon: destination.lon });

  const coordinatesString = coordList.map((c) => `${c.lon},${c.lat}`).join(';');

  // If waypoints exist, OSRM does not support alternatives; otherwise request up to 3 alternatives
  const hasWaypoints = coordList.length > 2;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson${
    hasWaypoints ? '' : '&alternatives=3'
  }`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch road routes from OSRM');

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No road route found');
    }

    // Determine the shortest route by distance
    let minDistance = Infinity;
    let shortestIndex = 0;

    data.routes.forEach((r, idx) => {
      if (r.distance < minDistance) {
        minDistance = r.distance;
        shortestIndex = idx;
      }
    });

    const routeThemes = [
      { color: '#059669', name: 'Shortest Route', style: 'solid', weight: 6, opacity: 0.9 },
      { color: '#0284c7', name: 'Alternative Route 1', style: 'dashed', weight: 4, dashArray: '8, 6', opacity: 0.8 },
      { color: '#8b5cf6', name: 'Alternative Route 2', style: 'dashed', weight: 4, dashArray: '6, 6', opacity: 0.8 },
    ];

    const routes = data.routes.map((r, idx) => {
      const distanceKm = Number((r.distance / 1000).toFixed(1));
      const durationMinutes = Math.max(1, Math.round(r.duration / 60));
      const routeCoordinates = r.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      const isShortest = idx === shortestIndex;

      const theme = isShortest
        ? routeThemes[0]
        : idx < shortestIndex
        ? routeThemes[1]
        : routeThemes[idx % routeThemes.length];

      return {
        id: `route_${idx}`,
        name: isShortest ? `Shortest Route (Via Road Network)` : `Alternative Route ${idx}`,
        distanceKm,
        durationMinutes,
        routeCoordinates,
        isShortest,
        estimatedCost: calculateFairCost(distanceKm),
        color: theme.color,
        dashArray: isShortest ? undefined : theme.dashArray,
        weight: isShortest ? 6 : 4,
        opacity: theme.opacity,
        legs: r.legs || [],
      };
    });

    return { routes, shortestIndex };
  } catch (err) {
    console.warn('Smart routing fallback to direct road model:', err.message);

    // Reliable offline road fallback
    const directDist = calculateDistanceKm(origin.lat, origin.lon, destination.lat, destination.lon);
    const simulatedDist1 = Number((directDist * 1.25).toFixed(1));
    const simulatedDist2 = Number((directDist * 1.45).toFixed(1));

    const route1Coords = [
      [origin.lat, origin.lon],
      ...coordList.slice(1, -1).map((w) => [w.lat, w.lon]),
      [destination.lat, destination.lon],
    ];

    const routes = [
      {
        id: 'route_0',
        name: 'Shortest Road Route',
        distanceKm: simulatedDist1,
        durationMinutes: Math.round(simulatedDist1 * 1.8),
        routeCoordinates: route1Coords,
        isShortest: true,
        estimatedCost: calculateFairCost(simulatedDist1),
        color: '#059669',
        weight: 6,
        opacity: 0.9,
      },
      {
        id: 'route_1',
        name: 'Alternative Route 1 (Via Arterial Road)',
        distanceKm: simulatedDist2,
        durationMinutes: Math.round(simulatedDist2 * 2.1),
        routeCoordinates: route1Coords,
        isShortest: false,
        estimatedCost: calculateFairCost(simulatedDist2),
        color: '#0284c7',
        weight: 4,
        dashArray: '8, 6',
        opacity: 0.8,
      },
    ];

    return { routes, shortestIndex: 0 };
  }
};

/**
 * Fair cost calculator formula:
 * (distance in km * average fuel cost per km + vehicle wear factor) / total sharing occupants
 */
export const calculateFairCost = (distanceKm, seatsAvailable = 3, fuelPricePerLiter = 1.4, mileageKmPerLiter = 14) => {
  if (!distanceKm || distanceKm <= 0) return 0;
  const litersUsed = distanceKm / mileageKmPerLiter;
  const fuelCost = litersUsed * fuelPricePerLiter;
  const wearAndTearFactor = distanceKm * 0.05; // maintenance factor
  const totalTripCost = fuelCost + wearAndTearFactor;

  const totalOccupants = Number(seatsAvailable) + 1;
  const perSeatCost = totalTripCost / totalOccupants;
  return Math.max(1, Number(perSeatCost.toFixed(2)));
};

/**
 * Environmental Impact Calculator
 */
export const calculateCO2SavedKg = (distanceKm, passengerCount = 1) => {
  const co2PerKmKg = 0.12;
  return Number((distanceKm * co2PerKmKg * passengerCount).toFixed(2));
};
