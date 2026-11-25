import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Compass, Eye, ShieldCheck, Car, Sparkles, CornerDownRight } from 'lucide-react';
import { formatFare } from '../../utils/currency';

// SVG Icon factory for crisp Leaflet map pins
const createPinIcon = (colorHex, badgeText = '') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
    <path fill="${colorHex}" d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
    ${badgeText ? `<circle cx="12" cy="8" r="6" fill="#ffffff"/><text x="12" y="11" font-size="8" font-family="sans-serif" font-weight="bold" fill="${colorHex}" text-anchor="middle">${badgeText}</text>` : ''}
  </svg>`;

  return L.divIcon({
    className: 'custom-smart-pin',
    html: `<div style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); cursor: pointer;">${svg}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const pickupIcon = createPinIcon('#059669', 'P'); // Green Pickup
const destIcon = createPinIcon('#e11d48', 'D');   // Red Destination
const waypointIcon = (idx) => createPinIcon('#d97706', String(idx + 1)); // Amber Waypoints
const driverPinIcon = createPinIcon('#2563eb', '🚗'); // Blue Driver

// Auto-adjust bounds when route coordinates or markers change
const AutoBounds = ({ bounds, center }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 1) {
      try {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      } catch (_) {}
    } else if (center) {
      map.setView(center, 13);
    }
  }, [bounds, center, map]);
  return null;
};

// Map click handler to add waypoints or inspect locations
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const SmartRouteMapView = ({
  origin, // { lat, lon, displayName }
  destination, // { lat, lon, displayName }
  waypoints = [], // Array of { lat, lon, displayName }
  routes = [], // Array of routes from getSmartRoutes
  selectedRouteIndex = 0,
  onSelectRoute,
  onMapClick,
  matchingDrivers = [], // Array of drivers for location-based display
  currency = 'INR',
  height = '420px',
  className = '',
}) => {
  const center = origin?.lat && origin?.lon ? [origin.lat, origin.lon] : [12.9716, 77.5946];

  // Consolidate bounds
  let allPoints = [];
  if (routes.length > 0 && routes[selectedRouteIndex]?.routeCoordinates?.length > 0) {
    allPoints = routes[selectedRouteIndex].routeCoordinates;
  } else {
    if (origin?.lat) allPoints.push([origin.lat, origin.lon]);
    if (destination?.lat) allPoints.push([destination.lat, destination.lon]);
    waypoints.forEach((wp) => {
      if (wp?.lat) allPoints.push([wp.lat, wp.lon]);
    });
  }

  const selectedRoute = routes[selectedRouteIndex] || routes[0];

  return (
    <div
      style={{ height }}
      className={`w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative flex flex-col bg-slate-100 ${className}`}
    >
      {/* Top Floating Route Selector & Distance Overlay */}
      {routes.length > 0 && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Clickable route selection pills */}
          <div className="flex flex-wrap gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-200 text-xs">
            {routes.map((r, idx) => {
              const isSelected = idx === selectedRouteIndex;
              return (
                <button
                  key={r.id || idx}
                  type="button"
                  onClick={() => onSelectRoute && onSelectRoute(idx)}
                  className={`py-1 px-3 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  <span>{r.isShortest ? '⚡ Shortest Route' : `Route ${idx + 1}`}</span>
                  <span className="opacity-80 font-normal">
                    ({r.distanceKm} km • {r.durationMinutes}m)
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Route Quick Metric */}
          {selectedRoute && (
            <div className="pointer-events-auto bg-emerald-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2">
              <span className="text-emerald-300">
                {selectedRoute.distanceKm} km • ~{selectedRoute.durationMinutes} mins
              </span>
              <span className="bg-emerald-500 text-white text-[11px] px-2 py-0.5 rounded-md font-bold">
                Est. {formatFare(selectedRoute.estimatedCost || 3.5, currency)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Standard OpenStreetMap Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Map click listener */}
          <MapClickHandler onMapClick={onMapClick} />

          {/* Auto bounds adjuster */}
          <AutoBounds bounds={allPoints} center={center} />

          {/* Render All Available Routes simultaneously with distinct visual styles */}
          {routes.map((r, idx) => {
            const isSelected = idx === selectedRouteIndex;
            return (
              <Polyline
                key={r.id || idx}
                positions={r.routeCoordinates}
                pathOptions={{
                  color: isSelected ? r.color : '#94a3b8',
                  weight: isSelected ? (r.isShortest ? 6 : 5) : 3,
                  opacity: isSelected ? 0.95 : 0.45,
                  dashArray: isSelected ? r.dashArray : '5, 5',
                  lineJoin: 'round',
                }}
                eventHandlers={{
                  click: () => onSelectRoute && onSelectRoute(idx),
                }}
              >
                <Popup>
                  <div className="text-xs font-sans space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </div>
                    <div className="text-slate-600">
                      Distance: <strong>{r.distanceKm} km</strong> • Time: <strong>{r.durationMinutes} mins</strong>
                    </div>
                    <div className="text-emerald-700 font-bold">
                      Est. Share: {formatFare(r.estimatedCost, currency)}
                    </div>
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => onSelectRoute && onSelectRoute(idx)}
                        className="w-full mt-1 py-1 text-[11px] font-bold bg-slate-900 text-white rounded"
                      >
                        Select This Route
                      </button>
                    )}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Pickup Marker */}
          {origin?.lat && origin?.lon && (
            <Marker position={[origin.lat, origin.lon]} icon={pickupIcon}>
              <Popup>
                <div className="text-xs font-sans space-y-0.5">
                  <span className="font-bold text-emerald-700 block">🟢 Pickup Location</span>
                  <span className="text-slate-700">{origin.displayName || 'Your Pickup Point'}</span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Intermediate Waypoints */}
          {waypoints.map((wp, idx) => (
            <Marker key={idx} position={[wp.lat, wp.lon]} icon={waypointIcon(idx)}>
              <Popup>
                <div className="text-xs font-sans space-y-0.5">
                  <span className="font-bold text-amber-700 block">📍 Stop #{idx + 1}</span>
                  <span className="text-slate-700">{wp.displayName || `Waypoint ${idx + 1}`}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Destination Marker */}
          {destination?.lat && destination?.lon && (
            <Marker position={[destination.lat, destination.lon]} icon={destIcon}>
              <Popup>
                <div className="text-xs font-sans space-y-0.5">
                  <span className="font-bold text-rose-700 block">🔴 Dropoff Destination</span>
                  <span className="text-slate-700">{destination.displayName || 'Destination Point'}</span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Matching Drivers Pins */}
          {matchingDrivers.map((driver) => {
            const dLat = driver.origin?.lat || driver.originLat;
            const dLon = driver.origin?.lon || driver.originLon;
            if (!dLat || !dLon) return null;
            return (
              <Marker key={driver.id} position={[dLat, dLon]} icon={driverPinIcon}>
                <Popup>
                  <div className="text-xs font-sans space-y-1">
                    <span className="font-bold text-blue-700 flex items-center gap-1">
                      🚗 Driver: {driver.driver?.name || 'Available Driver'}
                    </span>
                    <div className="text-[11px] text-slate-600">
                      Vehicle: {driver.driver?.vehicle?.make} {driver.driver?.vehicle?.model} ({driver.driver?.vehicle?.type?.toUpperCase()})
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-700">
                      Seats Open: {driver.availableSeats} • Fare: {formatFare(driver.pricePerSeat, currency)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Legend Footer */}
      <div className="bg-white/95 backdrop-blur-md px-4 py-2 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 z-[900]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Pickup
          </span>
          {waypoints.length > 0 && (
            <span className="flex items-center gap-1 font-semibold text-amber-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {waypoints.length} Stop(s)
            </span>
          )}
          <span className="flex items-center gap-1 font-semibold text-rose-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Dropoff
          </span>
          <span className="flex items-center gap-1 font-semibold text-blue-800">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> {matchingDrivers.length} Nearby Driver(s)
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Click any route or map location to customize • Real road-network routing
        </span>
      </div>
    </div>
  );
};

export default SmartRouteMapView;
