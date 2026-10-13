// TAPik component pricing based on the business proposal.
// Prices are in Philippine Pesos (PHP).

export const SHAPES = [
  { id: 'round', label: 'Round', price: 20 },
  { id: 'square', label: 'Square', price: 20 },
  { id: 'heart', label: 'Heart', price: 20 },
  { id: 'octagonal', label: 'Octagonal', price: 20 },
]

export const CHAINS = [
  { id: 'split', label: 'Split ring only', price: 0 },
  { id: 'gold', label: 'Gold ring + lobster clasp', price: 12 },
  { id: 'silver', label: 'Silver ring + lobster clasp', price: 12 },
  { id: 'beaded', label: 'Beaded strap', price: 12 },
]

export const PRINTS = [
  { id: 'single', label: 'Single-sided print', price: 11 },
  { id: 'double', label: 'Double-sided print', price: 22 },
]

export const NFC_PRICE = 18
export const PACKAGING_PRICE = 7
export const ASSEMBLY_PRICE = 10

export function computePrice({ shape = 'round', chain = 'gold', print = 'single', nfc = true } = {}) {
  let total = 0
  const selectedShape = SHAPES.find((s) => s.id === shape) || SHAPES[0]
  const selectedChain = CHAINS.find((c) => c.id === chain) || CHAINS[0]
  const selectedPrint = PRINTS.find((p) => p.id === print) || PRINTS[0]
  total += selectedShape.price
  total += selectedChain.price
  total += selectedPrint.price
  if (nfc) total += NFC_PRICE
  total += PACKAGING_PRICE
  total += ASSEMBLY_PRICE
  return total
}

// Simulated J&T Express style delivery brackets (PHP), used for demo/prototype.
export const SHIPPING_BRACKETS = [
  { maxKg: 1, fee: 60 },
  { maxKg: 2, fee: 80 },
  { maxKg: 3, fee: 100 },
]

export function estimateShipping(weightGrams = 200) {
  const kg = Math.max(0.001, weightGrams / 1000)
  const bracket = SHIPPING_BRACKETS.find((b) => kg <= b.maxKg) || SHIPPING_BRACKETS[SHIPPING_BRACKETS.length - 1]
  return bracket.fee
}
