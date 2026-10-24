import ring from '../assets/clasps/ring.png'
import gold from '../assets/clasps/gold.png'
import silver from '../assets/clasps/silver.png'
import red from '../assets/clasps/red.png'
import orange from '../assets/clasps/orange.png'
import yellow from '../assets/clasps/yellow.png'
import green from '../assets/clasps/green.png'
import blue from '../assets/clasps/blue.png'
import purple from '../assets/clasps/purple.png'
import black from '../assets/clasps/black.png'
import white from '../assets/clasps/white.png'
import lightpink from '../assets/clasps/lightpink.png'
import rosepink from '../assets/clasps/rosepink.png'

// Acrylic body shapes: width (% of the keychain), height / width ratio, and corner radius.
export const ACRYLIC_SHAPES = {
  rectangle: { width: 44, ratio: 1.45, radius: '10px' },
  curved:    { width: 44, ratio: 1.45, radius: '38px 10px 38px 10px' },
  round:     { width: 52, ratio: 1.0,  radius: '50%' },
  square:    { width: 50, ratio: 1.0,  radius: '10px' },
}

const W = 30 // was 42

const base = { width: W, anchorX: 33, anchorY: 86, metal: '#c9c9c9' }
export const CLASP_ART = {
  ring:      { ...base, src: ring,      metal: '#5d5d5c', anchorX: 20, anchorY: 80, width: 30},
  gold:      { ...base, src: gold,      metal: '#d9b86a', anchorX: 36, anchorY: 95, width: 45},
  silver:    { ...base, src: silver,    metal: '#c8ccd2', anchorX: 70, anchorY: 90, width: 45},
  red:       { ...base, src: red,       metal: '#d9302a', anchorX: 47, anchorY: 87, width: 30 },
  orange:    { ...base, src: orange,    metal: '#f08a24', anchorX: 80, anchorY: 90},
  yellow:    { ...base, src: yellow,    metal: '#f5d310', anchorX: 38, anchorY: 90 },
  green:     { ...base, src: green,     metal: '#3fae4a', anchorX: 70, anchorY: 92},
  blue:      { ...base, src: blue,      metal: '#2f78d6', anchorX: 50, anchorY: 91, width: 28},
  purple:    { ...base, src: purple,    metal: '#7c4bc4', anchorX: 40, anchorY: 85},
  black:     { ...base, src: black,     metal: '#2b2b2b', anchorY: 90, width: 30},
  white:     { ...base, src: white,     metal: '#eeeeee', anchorX: 35, anchorY: 90, width: 25},
  lightpink: { ...base, src: lightpink, metal: '#f6b9cd', anchorX: 70, anchorY: 83},
  rosepink:  { ...base, src: rosepink,  metal: '#e8628f', anchorX: 60, anchorY: 87},
}