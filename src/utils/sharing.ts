import type { Trip } from '../types';

// Encode trip to a URL-safe base64 string
export function encodeTripForSharing(trip: Trip): string {
  const json = JSON.stringify(trip);
  return btoa(unescape(encodeURIComponent(json)));
}

// Decode trip from URL-safe base64 string
export function decodeTripFromSharing(encoded: string): Trip | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Generate full share URL
export function generateShareUrl(trip: Trip): string {
  const encoded = encodeTripForSharing(trip);
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`;
}

// Check if current URL has shared trip data
export function getSharedTripFromUrl(): Trip | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return null;
  const encoded = hash.slice(7); // remove '#share='
  return decodeTripFromSharing(encoded);
}
