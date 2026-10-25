# Admin demo: Orders and Inventory (explained version)

**Length:** about 12 to 15 minutes, plus questions.

**How to use this page**
- **Do** = what to click.
- **Say** = what to tell the panel. Reword it in your own voice.
- **Why it works this way** = the reasoning behind the design. Use it when someone asks "why?".
- **Under the hood** = how it works technically. Use it when someone asks "how?".

---

## 1. The big picture (explain this first, about 1 minute)

TAPik sells custom NFC keychains. This is the whole journey of one order, and the admin is the person in the middle:

```
CUSTOMER                                   ADMIN (what you are demoing)
────────                                   ────────────────────────────
Designs keychain (shape, chain,
image cut to fit, NFC link)
        │
Places order (Metro Manila only,
shipping fee set by city)
        │
Scans the QR, pays, uploads a
screenshot of the payment
        │  order + design + proof are saved
        ▼
   "Payment submitted"  ───────────────►   Sees it in "Payments to verify"
                                           Checks the proof against the amount
                                                    │
                                    ┌───────────────┴───────────────┐
                                 Reject (with reason)           Confirm payment
                                    │                               │
                        Customer sees the reason            Receipt is created
                        and uploads a new proof             Stock is taken out
                                                                    │
                                                    Being prepared → Packed → Shipped → Delivered
                                                                    │
                                              Customer sees every step, with a pop-up each time
```

**Say:**
"Two things protect a small business here. First, **we never start making an order until a person has checked the money**. Second, **we never sell what we cannot make**, because the stock is tracked. The admin pages I'm about to show are how those two promises are kept."

---

## 2. Five rules to remember (the "why" behind everything)

| # | Rule | Why it exists |
|---|---|---|
| 1 | **A person verifies every payment.** | We have no payment gateway, so a human is the safety check. This also keeps fees at zero. |
| 2 | **Nothing is prepared or shipped until the payment is confirmed.** | Stops us from spending materials on unpaid or fake orders. The server enforces it, so it cannot be skipped by mistake. |
| 3 | **Stock comes out only when a payment is confirmed.** | A customer who never pays cannot block stock. Cancelling a paid order puts it back, once. |
| 4 | **Customers can only choose what is in stock.** | Prevents orders we cannot fulfil. Out-of-stock shapes and chains disappear from the Customize page. |
| 5 | **The admin sees changes within seconds.** | The page checks for updates about every 5 seconds, so nobody has to keep pressing refresh. |

---

## 3. Before you start (do this 15 minutes early)

### Set-up
- [ ] Latest `appsScript/Code.gs` is pasted into Apps Script and deployed as a **New version**. The `.env` URL is the live one. Restart `npm run dev` if you changed `.env`.
- [ ] **Use two separate browsers for the two roles.** Admin on your presentation screen. Customer on your phone, or an incognito window.
  Do not use two tabs of the same browser: they share one login, so logging in as admin signs the customer out.
- [ ] Log in as admin (`admin@tapikco.com`; the password is shown on the login screen). Open **Orders → Refresh**. You should see "N orders synced".
- [ ] Open **Inventory** once, so the stock sheet exists. Then set the demo stock:
  - **Round shape: stock 4, warn at 5** (shows "Low stock" and the warning banner).
  - **Rose Pink chain: stock 0** (shows "Out of stock"; customers can no longer pick it).
  - Everything else: leave at the default.
- [ ] Have **two different screenshots** ready on the customer device (any images will do).
- [ ] Browser zoom at 100%, pop-ups allowed for the site (Print and Report open a new window), notifications off.

### Sample orders to have ready (place them from the customer side, pay, then confirm and move them along)
| Order | City | Item | Final status | Why it is there |
|---|---|---|---|---|
| A | Pasig | Round / Gold x2 | Delivered | A finished order with a receipt |
| B | Quezon City | Square / Red x1 | Being prepared | A paid order in progress |
| C | Taguig | Curved / Blue x3 | Cancelled | Shows cancelling, and the "most ordered" toggle |
| D | (live) | Round / Gold x2 | You create it during the demo | Shows verify, stock deduction and the live update |

### If something goes wrong
| Problem | Fix |
|---|---|
| "The order database is out of date" | Redeploy `Code.gs` as a **New version** and check the `.env` URL |
| No orders on screen | Click **Refresh** and wait for the box to finish (3 to 5 seconds) |
| Stock tables say "Loading stock…" | The new `Code.gs` is not deployed yet |
| Print or Report window does not open | Allow pop-ups for the site |
| Customer device shows an old status | Press **Refresh** on its Orders page, or wait about 5 seconds |

---

## 4. The demo

### 4.1 Opening and navigation (1 minute)

**What you are showing:** the admin's workspace.

**Do:** Log in as admin. Point at the menu button (☰) and the three tabs: **Dashboard, Orders, Inventory**. Point at the small yellow numbers on the tabs.

**Say:**
"This is the admin workspace. Three tabs: the Dashboard gives me the overview, Orders is where I handle every order, and Inventory is where I manage stock. The little yellow numbers are my to-do list: payments waiting for me, and items running low."

**Why it works this way:** the tab badges let the admin see what needs attention without opening anything. On a phone, the menu slides in from the side to save space.

**Under the hood:** each tab has its own web address (for example `#admin/orders`), so refreshing the page keeps you on the same tab.

---

### 4.2 Dashboard (1.5 minutes)

**What you are showing:** a quick health check of the business.

**Do:** Point at the four cards, then **Payments to verify**, then the amber stock warning, then **Most ordered**.

**Say:**
- "**Needs attention** is the number I act on today: payments to verify plus orders I still have to prepare."
- "**Gross sales** counts **only confirmed payments**. An unpaid or rejected order is never counted as money we have."
- "**Payments to verify** lists customers who sent proof of payment, **oldest first**, so nobody waits unfairly."
- "The amber banner shows up when a shape or chain reaches its warning level, so I can reorder before we run out."
- "**Most ordered** shows which shapes and chains sell best. It counts keychains, not orders, and leaves out cancelled and rejected ones unless I tick the box."

**Why it works this way:** the numbers only count real, paid orders, so they can be trusted for decisions like what to restock.

**Under the hood:** the dashboard works out its numbers from the same order list the Orders tab uses, so the two never disagree.

---

### 4.3 Orders: finding what you need (2 minutes)

**What you are showing:** how the admin searches a growing list.

**Do:** Open **Orders**. Point at the five cards on top.

**Say:**
"These five cards describe **exactly the orders in the table**. When I filter, they change with it. So if I filter to one city and one week, I instantly see that city's sales for that week."

| Card | What it means |
|---|---|
| Orders | How many orders match the filters |
| Sales | Total of confirmed payments (not cancelled) |
| Items sold | Number of keychains, not counting cancelled or rejected |
| Average order | Sales divided by the number of paid orders |
| Needs attention | Payments to verify plus orders to prepare |

**Do, one at a time:**
1. Type a customer name in the search box.
2. Open the status dropdown and pick one. Then click **To verify**.
3. Click the **date button**. Click one day (just that day), then click a second day (now a range). Click **Done**.
4. Click **More filters**. Pick a **city**, then a **barangay** (it only lists that city's barangays), then a **shape** or **chain**.
5. Point at the **tags** under the filters, click the **×** on one, then **Clear filters**.

**Say:**
"Search finds a name, email, phone number, order number, even the NFC link. The filters combine, so I can ask something specific like 'paid orders in Pasig this week using the round shape'. Each active filter shows as a tag I can remove with one click. The table shows 10 orders per page, so it stays quick when there are hundreds."

**Why it works this way:** the everyday filters (search, status, date) are always visible. The less common ones (location, shape, chain) are tucked behind **More filters**, so the screen is not overwhelming.

**Under the hood:** filtering happens in the browser on the order list it already has, so it responds instantly. Choosing a city also resets the barangay, because a barangay only makes sense inside its city.

---

### 4.4 Orders: verifying a payment, live (3 minutes)

**What you are showing:** the most important admin job.

**Do:** On the **customer device**, place Order D and submit proof of payment (upload your first screenshot).

**Say (while it loads):**
"The order only reaches our database **when the customer submits their payment**. Until then it lives only in their own browser. That is why you will not see abandoned carts here. Saving takes a few seconds because we are saving the order, the design they cut, and the proof."

**Do:** Watch the admin screen. The **Dashboard** badge goes up and **Payments to verify** shows the order within about 5 seconds. Go to **Orders** and click **Verify payment**.

**Say:**
"Because we do not use a payment gateway, **a person verifies every payment**. This window shows me the customer's screenshot, **the exact amount they should have paid**, and when they sent it. I compare the amount and the details on the screenshot with the order."

**Do (the strongest moment):** On the customer device, submit the **same screenshot** on another order. On the admin screen point at the red **⚠ Same proof reused**.

**Say:**
"A common trick is reusing one screenshot for several orders. The system recognises when the same image is used twice and warns me."

**Under the hood:** each proof image gets a digital fingerprint (a SHA-256 hash). If two orders have the same fingerprint, both are flagged. It catches an exact reused image. A different screenshot of a fake payment still needs the admin's eyes, which is why the human check stays.

**Do:** Click **Reject**. Show that a reason is required, then click **Back**.

**Say:**
"If something is wrong, I reject it and **must give a reason**. The customer sees that reason on their order and can upload a new proof. Nothing is lost."

**Do:** Click **Confirm payment**.

**Say:**
"On confirm, three things happen at once: the order becomes **Confirmed payment**, the **official receipt** is created, and **the stock is taken out**. Only now. Not before."

**Do on the customer device:** a pop-up appears: "Order … is now Confirmed payment". Show the receipt buttons on the order.

**Why it works this way:** the receipt is only created after payment is confirmed, so a receipt always means "paid". The customer gets a pop-up so they never have to wonder.

**Under the hood:** the confirm button asks the Google Apps Script server to do all of it in one step. The server also refuses to confirm an order that has no proof waiting.

---

### 4.5 Orders: moving an order through fulfilment (1.5 minutes)

**What you are showing:** how an order progresses, and the rules that protect it.

**Do:** In Order D's Status column, open the dropdown and show the choices: **Being prepared → Packed → Shipped → Delivered**. Pick **Being prepared**. Watch the customer device update.

**Say:**
"After payment, I move the order along these steps, and the customer sees each change on their phone with a pop-up. There are some rules built in:"
- "**I cannot prepare or ship an order that is not paid.** The server refuses it, so it cannot happen even by accident."
- "**Delivered and Cancelled are final.** Once an order is delivered or cancelled, the screen offers no more changes, and a cancelled order can never be reopened."
- "An unpaid order has a **Cancel order** link. For a paid order, I choose **Cancelled** in this same dropdown, and the stock goes back, once."

**Why it works this way:** the order of steps matches how the shop actually works, and the dropdown only offers choices that make sense, so the admin cannot make a mistake that costs money.

**Under the hood:** the two rules that protect the money, no preparing or shipping before the payment is confirmed and a cancelled order can never be reopened, are enforced on the server, not just hidden on the screen. Even someone calling the system directly cannot get around them. "Delivered is final" is a screen rule only.

---

### 4.6 Orders: looking inside an order, and the report (2 minutes)

**What you are showing:** all the detail in one place, and exporting.

**Do:** Click **View** on Order B.

**Say:**
"Everything about one order in one window: who the customer is, where it is going, **the exact design they cut and positioned**, their NFC link, the payment, and the receipt. Production can download the artwork from here."

**Do:** Click **View original** or **Download** on the design, then **Download / print receipt (PDF)**. Close the window.

**Why it works this way:** the design is saved already cut to the shape the customer chose, so what the customer saw on screen is what gets printed.

**Do:** Click **Generate report**.

**Say:**
"The report covers **exactly what my filters show**. It has the totals and the most-ordered shapes and chains. I can export it for Excel as a CSV, or print it as a PDF for a meeting or a record."

**Do:** Click **Download CSV**, then **Print / Save as PDF**.

**Under the hood:** the CSV opens correctly in Excel, including names like "Parañaque". The PDF is the browser's print window, where "Save as PDF" is chosen as the printer.

---

### 4.7 Inventory (3 minutes)

**What you are showing:** how stock is tracked and why customers never over-order.

**Do:** Open **Inventory**. Point at the amber banner, the badges, then the two tables, **Shapes** and **Chains**. Show **Next** to move through pages (6 rows per page).

**Say:**
"Each keychain is made from **one shape and one chain**, so I track both. **Stock** is how many we have. **Warn at** is the level where the system starts warning me, so I can reorder in time. The badge is green for In stock, yellow for Low stock, red for Out of stock."

**Do:**
1. Type "round" in the search box.
2. Round now shows **2**. **Say:** "It was 4 before we confirmed Order D, which used 2 Round shapes and 2 Gold chains. The stock came out the moment I confirmed the payment." Clear the search and point at Gold, which also went down by 2.
3. Go to **Orders**, open Order D's status dropdown and choose **Cancelled**. Return to Inventory: Round is back to **4**. **Say:** "Cancelling a paid order puts the stock back, **exactly once**."
4. Change **Gold's stock** to a new number and click **Save**. The badge and the colour update.

**Do, on the customer device (Customize page):** the **Rose Pink** chain is not offered. Raise its stock to 5 and click **Save**. Watch it appear on the customer device within a few seconds. (Set it back to 0 afterwards if you want to repeat the demo.)

**Say:**
"This is the point of the whole page: **a customer can never order something we have run out of**, and **I find out about shortages before they happen**. Stock is taken out at payment confirmation, not when an order is placed, so a customer who never pays does not block stock for others."

**Why it works this way:** reserving stock at checkout would let one person who never pays lock up items. Taking it out at confirmation keeps the numbers honest.

**Under the hood:** if two customers order the last item at nearly the same time, the system checks stock when the order is saved and again at confirmation. If it ran short, the admin sees a warning, and the count never goes below zero.

---

### 4.8 Closing (1 minute)

**Say:**
"To sum up: **orders are verified by a person, the rules that matter are enforced by the server, stock stays accurate through payments and cancellations, and the admin can filter, report and export.** It works on a phone as well as a computer."

**Be upfront about the limits (a panel respects this):**
- The payment QR is a **demo**, and the J&T tracking numbers are **simulated**.
- Accounts and the admin login are for demonstration. A production version needs real authentication on the server.
- Delivery is limited to Metro Manila, with fees set by distance from Pasig.

---

## 5. Words you will use

| Word | Plain meaning |
|---|---|
| **Awaiting payment** | The customer has not paid yet. |
| **Payment submitted** | The customer sent a screenshot and is waiting for the admin to check it. |
| **Payment rejected** | The admin did not accept the proof and gave a reason. The customer can upload a new one. |
| **Confirmed payment** | The admin accepted the payment. The receipt exists and the stock is taken out. |
| **Being prepared / Packed / Shipped / Delivered** | The steps of making and sending the order. |
| **Cancelled** | The order was stopped. If it was paid, the stock goes back. |
| **Stock** | How many of a shape or chain we have. |
| **Warn at** | The level at which the system warns that stock is getting low. |
| **Proof reused** | The same screenshot was used on more than one order. |
| **Receipt** | The proof of purchase, available only after the payment is confirmed. |

---

## 6. Likely questions, with full answers

**How do you stop fake payments?**
"Three layers. A person checks every proof against the exact amount. The system flags a screenshot that is reused on another order. And the server will not let an order move to preparing until the payment is confirmed. A skilled forger with a fresh fake screenshot would still need to get past the admin's check, which is the honest limit of not having a payment gateway."

**What if two customers order the last item?**
"Stock is checked when the order is saved and again when payment is confirmed. If it ran short in between, the admin gets a warning and the number stops at zero, so the admin can contact the customer. It never goes negative."

**Why do unpaid orders not appear for the admin?**
"They stay in the customer's own browser until payment is submitted. That keeps the admin's list to orders that are really in progress, and it avoids storing designs for people who never pay."

**Is it real time?**
"Near real time. The admin and the customer pages check for changes about every 5 seconds and when you come back to the tab. In the same browser it is instant."

**Why Google Sheets and Apps Script?**
"It is free, a small business can open and read the data without special tools, and it is enough for the scope of this study. The limits are speed (a few seconds per save) and security, which are the first things to improve for a real launch."

**Can anyone open the admin page?**
"It needs the admin login. For a real launch the server should also check who is calling, not just the screen. That is listed as future work."

**How are shipping fees decided?**
"By delivery city. We group the Metro Manila cities by distance from our production site in Pinagbuhatan, Pasig, from ₱60 for nearby cities up to ₱120 for the farthest, plus a small add-on for heavier orders. The server recalculates the fee, so it cannot be changed from the browser."

**What happens to the customer's design?**
"They zoom and move their picture inside the acrylic window, and what falls outside is cut off. We save only the visible part, so the picture we print is exactly the one they approved."

**What would you improve next?**
"Real server-side login with hashed passwords, a check on the server for who is calling, email notices when a payment is confirmed or an order ships, and a lighter way to store designs. These are the main steps from a working demo to a production system."

---

## 7. One-line summaries (if you only have 30 seconds per feature)

- **Dashboard:** "The admin's morning check: what needs me, what is selling, what is running low."
- **Orders:** "Find any order fast, verify the money, then move it to delivered, with the customer updated at every step."
- **Verify payment:** "A person confirms the money, the system flags reused proofs, and only then are the receipt and stock handled."
- **Report:** "Export exactly what is on screen, as a spreadsheet or a PDF."
- **Inventory:** "Stock for every shape and chain, warnings before it runs out, and customers can only choose what exists."
