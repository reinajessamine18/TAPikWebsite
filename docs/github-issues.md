# TAPik GitHub Issues (ready to paste)

Each section below is one issue. The first line is the title, and the rest is the body.
Suggested build order: 3 -> 4 -> 5 -> 2 -> 7 -> 8, with 1 and 6 done anytime.
Issue 7 depends on Issue 2 (stock is deducted on "Confirmed payment").

---

## Issue 1

**Title:** Improve readability: body font and color contrast

**Labels:** enhancement, ui

### Description
Use an easier-to-read font for body and information text, and adjust the color scheme so text contrasts better with the background. The logo font stays unchanged.

### Tasks
- [ ] Choose a body font (suggested: Inter, Poppins, or DM Sans) and apply it everywhere except the logo
- [ ] Adjust text and background colors to meet WCAG AA contrast (4.5:1 for body text)
- [ ] Check status badges, buttons, form fields and tables in both customer and admin views
- [ ] Define colors as CSS variables in `src/index.css` so they can be tweaked in one place

### Acceptance criteria
- All body text is clearly readable against its background
- The logo font is unchanged

---

## Issue 2

**Title:** Proof of payment with demo QR code and admin verification

**Labels:** enhancement, backend, admin

### Description
Customers pay by scanning a system-generated (demo) QR code and then upload proof of payment. The admin reviews the proof, and only after verification does the order become "Confirmed payment". No payment API is needed. The admin's review is the protection against scams.

### Tasks
- [ ] Generate a demo QR code on the payment step. It should encode the order id and amount and be clearly marked as demo
- [ ] Add a proof-of-payment upload (screenshot) and a reference number field
- [ ] Save the proof to Drive and the reference number to the Orders sheet through `appsScript/Code.gs`, like design images
- [ ] Add statuses in `src/lib/orderStatus.js`: `Awaiting payment`, `Payment submitted`, `Confirmed payment`, `Payment rejected`
- [ ] Admin Orders tab: show the proof image and amount due, with **Confirm** and **Reject (with reason)** buttons
- [ ] Orders move to "Confirmed payment" only when the admin clicks Confirm
- [ ] Customer sees payment status and can re-upload after a rejection
- [ ] Flag a duplicate reference number across orders for the admin
- [ ] Enforce the payment-status transition on the server in `updateOrderStatus`, not only in the browser

### Acceptance criteria
- An order cannot reach "Confirmed payment" without admin verification
- The admin can see the expected amount next to the uploaded proof

---

## Issue 3

**Title:** Require design upload and NFC link before adding to cart

**Labels:** enhancement, ui

### Tasks
- [ ] Disable "Add to cart" until an image is uploaded and an NFC link is entered
- [ ] Validate the link format (must start with `http://` or `https://`)
- [ ] Show an inline message saying what is missing
- [ ] Also enforce the check inside `handleAdd()` in `src/pages/Customize.jsx`, not only by disabling the button

### Acceptance criteria
- A cart item cannot exist without a design image and a valid NFC link

---

## Issue 4

**Title:** Hide shipping fee in cart; show it at checkout once the address is entered

**Labels:** enhancement, ui

### Description
The cart summary should show only the subtotal. The shipping fee appears at Place Order, after the city is selected.

### Tasks
- [ ] `src/pages/Cart.jsx`: remove the shipping and total lines, and show "Shipping calculated at checkout"
- [ ] `src/pages/Checkout.jsx`: show the shipping fee in the order summary once a city is selected, and update the total
- [ ] Before a city is chosen, show "Select a city to see the shipping fee"

### Acceptance criteria
- The cart page shows no shipping fee
- The checkout total updates when the city changes

---

## Issue 5

**Title:** Metro Manila-only delivery with city/barangay dropdowns and distance-based shipping

**Labels:** enhancement, backend

### Description
Delivery is limited to Metro Manila (the scope of the paper). The shipping fee depends on the distance of the delivery city from the production site in Pinagbuhatan, Pasig.

### Tasks
- [ ] Fix the region to "Metro Manila" (read-only)
- [ ] City dropdown limited to the 16 Metro Manila cities and the municipality of Pateros
- [ ] Barangay dropdown filtered to the selected city, and reset when the city changes
- [ ] Add a local data file (e.g. `src/data/metroManila.js`) with cities and barangays (use a PSGC-based dataset)
- [ ] Replace the weight-only shipping in `src/lib/pricing.js` with a city zone fee plus a weight add-on
- [ ] Store city and barangay as separate fields on the order (needed by Issue 8)
- [ ] Recompute the shipping fee in `createOrder` in `appsScript/Code.gs`

### Suggested zones (from Pasig)
| Zone | Cities | Base fee |
|---|---|---|
| 1 (nearby) | Pasig, Marikina, Mandaluyong, San Juan, Taguig, Pateros | PHP 60 |
| 2 | Quezon City, Makati, Manila, Pasay | PHP 80 |
| 3 | Parañaque, Caloocan, Muntinlupa | PHP 100 |
| 4 (farthest) | Las Piñas, Valenzuela, Malabon, Navotas | PHP 120 |

Weight add-on: +PHP 0 up to 1 kg, +PHP 20 up to 2 kg, +PHP 40 up to 3 kg.
Please verify the zone assignments against a courier's real rate map.

### Acceptance criteria
- Only Metro Manila cities and their own barangays can be chosen
- Farther cities cost more, within a realistic range

---

## Issue 6

**Title:** Make customer and admin views responsive

**Labels:** enhancement, ui, admin

### Tasks
- [ ] Customer navbar collapses to a hamburger menu on small screens (`src/components/Navbar.jsx`)
- [ ] Admin header and tabs wrap or scroll on small screens
- [ ] Admin orders and dashboard tables scroll horizontally or switch to cards on mobile
- [ ] Customize, Cart and Checkout stack to a single column on phones
- [ ] Test at 360px, 768px and 1280px widths

### Acceptance criteria
- No content is cut off or overflows horizontally at any tested width

---

## Issue 7

**Title:** Admin inventory with customer-side availability and low-stock warning

**Labels:** enhancement, backend, admin, blocked (needs Issue 2)

### Tasks
- [ ] Add an **Inventory** tab to Admin (the code exists but is hidden because it is not in `TABS` in `src/pages/Admin.jsx`)
- [ ] Add an `Inventory` sheet (one row per shape and chain: ItemType, ItemId, Stock, Threshold)
- [ ] Add Apps Script actions to read and update inventory
- [ ] Customize page hides or disables shapes and chains with 0 stock
- [ ] Admin sees a warning banner and highlighted row when stock is at or below the threshold
- [ ] Deduct stock **only when the status becomes "Confirmed payment"**, on the server in `updateOrderStatus`, under the script lock
- [ ] Do not deduct twice if an order is re-confirmed; consider restoring stock if a confirmed order is later cancelled
- [ ] Re-check stock at checkout in case two customers order the last unit

### Acceptance criteria
- Out-of-stock options cannot be selected by customers
- Stock only changes when payment is confirmed

---

## Issue 8

**Title:** Report generation, advanced order filters, and most-ordered tables

**Labels:** enhancement, admin

### Tasks
- [ ] Orders tab filters: city (all/specific), barangay (all/specific, depends on city), date (single date or range), status, shape, chain
- [ ] Dashboard "Generate report" button that exports the filtered orders as CSV (optionally a print-friendly PDF)
- [ ] Dashboard tables: most-ordered shapes and most-ordered chains, with counts and revenue
- [ ] Report summary: total orders, total sales, and counts per status
- [ ] Exclude cancelled and rejected orders from "most ordered" by default, with an option to include them

### Acceptance criteria
- Filters can be combined, and the report matches what the filters show
- The dashboard shows which shape and chain are ordered most

---

## Notes
- Issues 2, 5 and 7 change `appsScript/Code.gs`, and each needs a new Apps Script deployment version.
- Accounts are frontend-only and Apps Script has no authentication. Mention this as a limitation in the paper.
