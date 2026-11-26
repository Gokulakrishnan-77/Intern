import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, ShieldCheck, Crosshair, Loader2 } from 'lucide-react';

export const GoogleMapView = ({
  origin, // { lat, lon, label } or address string
  destination, // { lat, lon, label } or address string
  waypoints = [], // Array of { lat, lon, displayName }
  height = '400px',
  className = '',
  onLocateMe, // Optional callback to trigger geolocation from map controls
  isLocating = false,
}) => {
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite'

  // Extract and validate query addresses or coordinates for Google Maps
  // Format coordinates as lat,lon after validating ranges (-90 to 90 lat, -180 to 180 lon)
  const formatLocationParam = (loc, fallback) => {
    if (typeof loc === 'object' && loc !== null) {
      const lat = parseFloat(loc.lat);
      const lon = parseFloat(loc.lon);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return `${lat},${lon}`;
      }
      if (loc.displayName && loc.displayName.trim()) {
        return encodeURIComponent(loc.displayName.trim());
      }
    }
    if (typeof loc === 'string' && loc.trim()) {
      return encodeURIComponent(loc.trim());
    }
    return fallback;
  };

  const originQuery = formatLocationParam(origin, 'Bangalore, India');
  const destQuery = formatLocationParam(destination, 'Electronic City, Bangalore, India');

  // Build waypoints string for Google Maps ("+to:" syntax in daddr)
  const waypointSegments = waypoints
    .filter((wp) => {
      const lat = parseFloat(wp?.lat);
      const lon = parseFloat(wp?.lon);
      return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    })
    .map((wp) => `+to:${wp.lat},${wp.lon}`)
    .join('');

  // Google Maps Directions Embed URL with waypoints support
  const embedUrl = `https://maps.google.com/maps?saddr=${originQuery}&daddr=${destQuery}${waypointSegments}&t=${
    mapType === 'satellite' ? 'k' : 'm'
  }&output=embed`;

  // External live navigation link in Google Maps App / Website
  const waypointsParam = waypoints
    .filter((wp) => wp?.lat && wp?.lon)
    .map((wp) => `${wp.lat},${wp.lon}`)
    .join('|');
  const externalGmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}${
    waypointsParam ? `&waypoints=${encodeURIComponent(waypointsParam)}` : ''
  }&travelmode=driving`;

  const isCurrentGpsOrigin = typeof origin === 'object' && origin?.isCurrentLocation;

  return (
    <div
      style={{ height }}
      className={`w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-100 flex flex-col ${className}`}
    >
      {/* Google Maps Top Bar Controls */}
      <div className="bg-white/95 backdrop-blur-md px-4 py-2 border-b border-slate-200 z-10 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-bold text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="tracking-tight text-slate-900">
              Google <span className="text-emerald-600 font-extrabold">Maps</span>
            </span>
          </div>

          {isCurrentGpsOrigin && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-emerald-600" /> Live GPS Origin Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Use Current GPS Location Button on Map Bar */}
          {onLocateMe && (
            <button
              type="button"
              onClick={onLocateMe}
              disabled={isLocating}
              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all flex items-center gap-1 disabled:opacity-50"
              title="Detect and use current device location"
            >
              {isLocating ? (
                <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
              ) : (
                <Crosshair className="w-3 h-3 text-emerald-600" />
              )}
              <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
            </button>
          )}

          {/* Map Type Switcher */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                mapType === 'roadmap' ? 'bg-white text-slate-900 shadow-sm font-bold' : ''
              }`}
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                mapType === 'satellite' ? 'bg-white text-slate-900 shadow-sm font-bold' : ''
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Open in full Google Maps */}
          <a
            href={externalGmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
            title="Open in official Google Maps app"
          >
            <span>App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Official Google Maps Render Frame */}
      <div className="flex-1 w-full relative">
        <iframe
          key={`${originQuery}-${destQuery}-${mapType}-${waypoints.length}`}
          title="Google Maps Route"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
          className="w-full h-full"
        />
      </div>

      {/* Route Legend Footer */}
      <div className="bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-1 font-medium text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span> Pickup (
            {isCurrentGpsOrigin ? 'Your Current Location' : typeof origin === 'object' ? origin.displayName?.split(',')[0] : 'Origin'}
            )
          </span>
          <span className="flex items-center gap-1 font-medium text-rose-800">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span> Dropoff (
            {typeof destination === 'object' ? destination.displayName?.split(',')[0] : 'Destination'}
            )
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Live Google Maps Directions{waypoints.length > 0 ? ` • ${waypoints.length} stop(s)` : ''}
        </span>
      </div>
    </div>
  );
};

export default GoogleMapView;
