import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom colored SVG pin markers to avoid Vite asset path issues with standard Leaflet markers
const createCustomIcon = (colorHex) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="${colorHex}">
    <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
  </svg>`;
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); cursor: pointer;">${svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const originIcon = createCustomIcon('#059669'); // Emerald green
const destinationIcon = createCustomIcon('#e11d48'); // Rose red
const defaultPinIcon = createCustomIcon('#2563eb'); // Blue

// Helper component to auto-fit map bounds when coordinates or routes change
const MapBoundsAdjuster = ({ bounds, center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        // ignore bounds calculation error
      }
    } else if (center) {
      map.setView(center, zoom || 13);
    }
  }, [bounds, center, zoom, map]);

  return null;
};

export const LeafletMapView = ({
  center = [12.9716, 77.5946], // Default center: Bangalore / Metro area
  zoom = 12,
  origin, // { lat, lon, label }
  destination, // { lat, lon, label }
  routeCoordinates = [], // Array of [lat, lon]
  markers = [], // Array of additional { lat, lon, label, color }
  height = '400px',
  className = '',
}) => {
  // Compute bounds if origin and destination are present
  let bounds = [];
  if (routeCoordinates && routeCoordinates.length > 0) {
    bounds = routeCoordinates;
  } else if (origin?.lat && destination?.lat) {
    bounds = [
      [origin.lat, origin.lon],
      [destination.lat, destination.lon],
    ];
  } else if (origin?.lat) {
    center = [origin.lat, origin.lon];
  }

  return (
    <div style={{ height }} className={`w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner relative ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Free OpenStreetMap Tile Layer (no API key required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Origin Marker */}
        {origin?.lat && origin?.lon && (
          <Marker position={[origin.lat, origin.lon]} icon={originIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <span className="font-bold text-emerald-700 block">Trip Origin</span>
                <span>{origin.label || 'Pickup Location'}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination?.lat && destination?.lon && (
          <Marker position={[destination.lat, destination.lon]} icon={destinationIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <span className="font-bold text-rose-700 block">Trip Destination</span>
                <span>{destination.label || 'Dropoff Location'}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Additional Custom Markers */}
        {markers.map((m, idx) => (
          <Marker
            key={idx}
            position={[m.lat, m.lon]}
            icon={m.color ? createCustomIcon(m.color) : defaultPinIcon}
          >
            {m.label && (
              <Popup>
                <div className="text-xs font-sans">{m.label}</div>
              </Popup>
            )}
          </Marker>
        ))}

        {/* Route Geometry Polyline from OSRM */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            color="#059669"
            weight={5}
            opacity={0.8}
            lineJoin="round"
          />
        )}

        {/* Auto fitter */}
        <MapBoundsAdjuster bounds={bounds} center={center} zoom={zoom} />
      </MapContainer>
    </div>
  );
};
