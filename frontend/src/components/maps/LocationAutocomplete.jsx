import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces } from '../../services/nominatim';
import { MapPin, Search, Loader2 } from 'lucide-react';

export const LocationAutocomplete = ({
  label,
  placeholder = 'Search address, neighborhood or landmark...',
  value,
  onChange,
  onSelect,
  required = false,
  error,
}) => {
  const [inputValue, setInputValue] = useState(value?.displayName || value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (typeof value === 'object' && value?.displayName) {
      setInputValue(value.displayName);
    } else if (typeof value === 'string') {
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!inputValue || inputValue.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const results = await searchPlaces(inputValue);
      setSuggestions(results);
      setIsLoading(false);
      setIsOpen(results.length > 0);
    }, 400);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSelect = (place) => {
    setInputValue(place.displayName);
    setIsOpen(false);
    if (onSelect) onSelect(place);
    if (onChange) onChange(place);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <MapPin className="h-4 w-4 text-emerald-600" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (onChange) onChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`block w-full rounded-lg text-sm pl-9 pr-9 py-2 border transition-colors ${
            error
              ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
              : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500 bg-white'
          } shadow-sm focus:outline-none focus:ring-2`}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-sm">
          {suggestions.map((place) => (
            <li
              key={place.placeId}
              onClick={() => handleSelect(place)}
              className="px-3.5 py-2.5 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-b-0 transition-colors flex items-start gap-2.5"
            >
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-1">{place.displayName.split(',')[0]}</p>
                <p className="text-[11px] text-slate-500 line-clamp-1">{place.displayName}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
