import React, { useState } from 'react';
import { LocationAutocomplete } from '../maps/LocationAutocomplete';
import { Button } from '../common/Button';
import { Search, Calendar, SlidersHorizontal, ArrowRightLeft } from 'lucide-react';

export const RideSearchForm = ({ onSearch, initialValues = {} }) => {
  const [origin, setOrigin] = useState(initialValues.origin || null);
  const [destination, setDestination] = useState(initialValues.destination || null);
  const [date, setDate] = useState(initialValues.date || new Date().toISOString().split('T')[0]);
  const [timeWindow, setTimeWindow] = useState('any');
  const [detourTolerance, setDetourTolerance] = useState(3); // 3 km default
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({
        origin,
        destination,
        date,
        timeWindow,
        detourTolerance: Number(detourTolerance),
      });
    }
  };

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Origin */}
        <div className="md:col-span-5">
          <LocationAutocomplete
            label="Pickup Location"
            placeholder="Neighborhood, building, or address..."
            value={origin}
            onSelect={setOrigin}
            required
          />
        </div>

        {/* Swap button */}
        <div className="md:col-span-1 flex justify-center items-center pt-5 md:pt-4">
          <button
            type="button"
            onClick={handleSwap}
            className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-emerald-600 transition-colors"
            title="Swap locations"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Destination */}
        <div className="md:col-span-6">
          <LocationAutocomplete
            label="Destination"
            placeholder="Office, university, or dropoff point..."
            value={destination}
            onSelect={setDestination}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-12 gap-3 items-end">
        {/* Travel Date */}
        <div className="sm:col-span-1 md:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Travel Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Time Window */}
        <div className="sm:col-span-1 md:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Preferred Time
          </label>
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="any">Anytime Today</option>
            <option value="morning">Morning Commute (06:00 - 10:00)</option>
            <option value="afternoon">Midday (10:00 - 16:00)</option>
            <option value="evening">Evening Return (16:00 - 21:00)</option>
          </select>
        </div>

        {/* Search Action */}
        <div className="sm:col-span-1 md:col-span-4 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            icon={SlidersHorizontal}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Tolerance'}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            icon={Search}
          >
            Find Rides
          </Button>
        </div>
      </div>

      {/* Advanced Detour Tolerance Slider */}
      {showFilters && (
        <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Max Detour Tolerance (Driver Pickup Radius):</span>
            <span className="font-bold text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded-full">
              Within {detourTolerance} km of main route
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={detourTolerance}
            onChange={(e) => setDetourTolerance(e.target.value)}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <p className="text-slate-500 text-[11px]">
            Higher detour tolerance shows more rides where the driver is willing to take a small route diversion to pick you up.
          </p>
        </div>
      )}
    </form>
  );
};
