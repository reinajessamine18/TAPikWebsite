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

// Shipping fee brackets in Philippine Pesos, based on package weight.
export const SHIPPING_BRACKETS = [
  { maxKg: 1, fee: 60 },
  { maxKg: 2, fee: 80 },
  { maxKg: 3, fee: 100 },
]

export function calculateShippingFee(weightGrams = 200) {
  const kg = Math.max(0.001, weightGrams / 1000)
  const bracket = SHIPPING_BRACKETS.find((b) => kg <= b.maxKg) || SHIPPING_BRACKETS[SHIPPING_BRACKETS.length - 1]
  return bracket.fee
}
