import { METRO_MANILA_CITIES } from './pricing'
import { getBarangays } from '../data/metroManila'

export const REGION = 'Metro Manila'

// Delivery is limited to Metro Manila. Older saved details may hold a free-text
// city or another province, so drop anything that is not a valid selection.
export function normalizeDetails(details) {
  if (!details) return details
  const city = METRO_MANILA_CITIES.includes(details.city) ? details.city : ''
  const barangay = getBarangays(city).includes(details.barangay) ? details.barangay : ''
  return { ...details, province: REGION, city, barangay }
}

export const isAddressComplete = (details) => Boolean(details?.city && details?.barangay)
