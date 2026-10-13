# Google Sheets + Apps Script setup (TAPik)

## 1. Create the spreadsheet
Create a Google Sheet named `TAPik Database`.
Create these tabs (exact names):
- Products
- Orders
- OrderItems
- Customers
- ShippingRates
- Shipments

Paste the provided header rows into cell A1 of each tab.

## 2. Add Apps Script
1. Open the spreadsheet.
2. Extensions -> Apps Script.
3. Paste the contents of `appsScript/Code.gs`.
4. Save.

## 3. Deploy as Web app
1. Click Deploy -> New deployment.
2. Type: Web app.
3. Execute as: Me.
4. Who has access: Anyone.
5. Copy the Web app URL.

## 4. Connect to React
Create `.env` in the project root:
```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
```
Restart `npm run dev`.

## 5. Current frontend status
The frontend currently stores cart and orders in localStorage so it works without a backend.
Use `src/services/api.js` to switch to the Apps Script backend.
##<|end|><|start|>write to=assistant<|channel|>analysis<|message|>Created file successfully: docs/apps-script-setup.md