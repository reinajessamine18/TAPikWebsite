import barangays from './metroManilaBarangays.json'

// Barangay names come from the PSGC (Philippine Standard Geographic Code).
export function getBarangays(city) {
  return barangays[city] || []
}
