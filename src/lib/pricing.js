// TAPik component pricing based on the business proposal.
// Prices are in Philippine Pesos (PHP).
export const SHAPES = [
  { id: 'rectangle', label: 'Rectangle', price: 20 },
  { id: 'curved', label: 'Curved Rectangle', price: 20 },
  { id: 'round', label: 'Round', price: 20 },
  { id: 'square', label: 'Square', price: 20 },
]
export const CHAINS = [
  { id: 'ring',      label: 'Ring',       price: 13 },
  { id: 'gold',      label: 'Gold',       price: 13 },
  { id: 'silver',    label: 'Silver',     price: 13 },
  { id: 'red',       label: 'Red',        price: 13 },
  { id: 'orange',    label: 'Orange',     price: 13 },
  { id: 'yellow',    label: 'Yellow',     price: 13 },
  { id: 'green',     label: 'Green',      price: 13 },
  { id: 'blue',      label: 'Blue',       price: 13 },
  { id: 'purple',    label: 'Purple',     price: 13 },
  { id: 'black',     label: 'Black',      price: 13 },
  { id: 'white',     label: 'White',      price: 13 },
  { id: 'lightpink', label: 'Light Pink', price: 13 },
  { id: 'rosepink',  label: 'Rose Pink',  price: 13 },
]

export const NFC_PRICE = 20
export const PACKAGING_PRICE = 5
export const ASSEMBLY_PRICE = 10
export const PRINT_PRICE = 10 // fixed/double-sided print allowance included in standard PHP 78

export function computePrice({ shape = 'rectangle', chain = 'gold' } = {}) {
  const selectedShape = SHAPES.find((s) => s.id === shape) || SHAPES[0]
  const selectedChain = CHAINS.find((c) => c.id === chain) || CHAINS[0]
  let total = 0
  total += selectedShape.price
  total += selectedChain.price
  total += NFC_PRICE
  total += PRINT_PRICE
  total += PACKAGING_PRICE
  total += ASSEMBLY_PRICE
  return total
}

// Shipping is a base fee by delivery zone (distance from the production site
// in Pinagbuhatan, Pasig) plus a weight add-on, in Philippine Pesos.
export const SHIPPING_ZONES = [
  { zone: 1, fee: 60, cities: ['Pasig', 'Marikina', 'Mandaluyong', 'San Juan', 'Taguig', 'Pateros'] },
  { zone: 2, fee: 80, cities: ['Quezon City', 'Makati', 'Manila', 'Pasay'] },
  { zone: 3, fee: 100, cities: ['Parañaque', 'Caloocan', 'Muntinlupa'] },
  { zone: 4, fee: 120, cities: ['Las Piñas', 'Valenzuela', 'Malabon', 'Navotas'] },
]

export const WEIGHT_SURCHARGES = [
  { maxKg: 1, fee: 0 },
  { maxKg: 2, fee: 20 },
  { maxKg: 3, fee: 40 },
]

export const METRO_MANILA_CITIES = SHIPPING_ZONES.flatMap((z) => z.cities).sort((a, b) =>
  a.localeCompare(b)
)

// Returns null when the city is not a delivery city.
export function calculateShippingFee(weightGrams = 200, city = '') {
  const zone = SHIPPING_ZONES.find((z) => z.cities.includes(city))
  if (!zone) return null
  const kg = Math.max(0.001, weightGrams / 1000)
  const bracket =
    WEIGHT_SURCHARGES.find((b) => kg <= b.maxKg) ||
    WEIGHT_SURCHARGES[WEIGHT_SURCHARGES.length - 1]
  return zone.fee + bracket.fee
}
