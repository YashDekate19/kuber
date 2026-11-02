'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { PlaceSuggestion } from '@/types';
import { api } from '@/lib/apiClient';

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  dotColor?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  dotColor = 'bg-black',
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (text: string) => {
    setQuery(text);
    onChange(text);

    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setShowDropdown(true);

    try {
      const { data } = await api.get<PlaceSuggestion[]>('/api/location/search', {
        params: { q: text },
      });
      if (data && Array.isArray(data)) {
        setSuggestions(data);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: PlaceSuggestion) => {
    setQuery(item.display_name);
    onChange(item.display_name, { lat: item.lat, lng: item.lng });
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="relative flex items-center">
        <div className={`absolute left-3.5 h-2.5 w-2.5 rounded-full ${dotColor}`} />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          className="pl-9 pr-9 font-medium text-neutral-900 border-neutral-200 focus-visible:ring-black h-12"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-neutral-400" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-neutral-100 bg-white shadow-xl">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-b-0"
            >
              <MapPin className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 line-clamp-1">
                  {item.display_name.split(',')[0]}
                </p>
                <p className="text-xs text-neutral-500 line-clamp-1">
                  {item.display_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

