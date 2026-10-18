# Google Sheets + Apps Script setup (TAPik)

## 1. Create the spreadsheet

Create a Google spreadsheet named `TAPik Database` with these tabs. Put each comma-separated header list in row 1 of the named tab, in the listed order:

- `Products`: `ProductID, ProductName, Description, Category, Price, Stock, ImageURL, WeightGrams, IsActive, CreatedAt, UpdatedAt`
- `Orders`: `OrderID, CustomerID, OrderDate, Subtotal, ShippingFee, TotalAmount, PaymentMethod, PaymentStatus, OrderStatus, ShippingAddressID, Notes`
- `OrderItems`: `OrderItemID, OrderID, ProductID, Quantity, UnitPrice, Subtotal`
- `Customers`: `CustomerID, CustomerName, Email, Phone`
- `ShippingRates`: `RateID, DestinationProvince, DestinationCity, DestinationZIP, MinWeightGrams, MaxWeightGrams, ShippingFee, IsActive`
- `Shipments`: `ShipmentID, OrderID, Courier, TrackingNumber, ShipmentStatus, RecipientName, RecipientPhone, DeliveryAddress, BookedAt, ShippedAt, DeliveredAt, TrackingURL, IsSimulated, Remarks`

Keep these headers unchanged; the Apps Script reads and updates rows by header name for products and order statuses.

## 2. Add and deploy Apps Script

1. Open the spreadsheet and choose Extensions -> Apps Script.
2. Replace the script contents with `appsScript/Code.gs` and save.
3. Deploy -> New deployment -> Web app.
4. Execute as your account. Set access to the audience that needs the storefront, then deploy and copy the web app URL.

After editing `appsScript/Code.gs`, deploy a new version of the web app and update the deployment if the URL changes. The Admin -> Apps Script tab can test the deployed endpoint and sync the order feed.

Custom item artwork and NFC targets are stored as JSON in the order's `Notes` cell because the requested `OrderItems` schema has no image or link columns. Uploaded artwork files are saved in a Drive folder named `TAPik Customer Designs`; its URL and the NFC target are included in that order metadata. The current implementation grants anyone with the file link viewer access so the admin page can display it. Treat those image links as public.

### Authorize uploaded-design storage

Before using the database, authorize Sheets and Drive once. In the Apps Script editor, choose `authorizeDriveAccess` from the function dropdown and click **Run**. Review and approve both requested Google Sheets and Google Drive access using the account that owns the deployment. This also creates or reuses the `TAPik Customer Designs` folder. Then deploy a new web-app version. Image-free orders still need Sheets permission; Drive permission is used for uploaded designs.

## 3. Connect the storefront

Set the deployed URL in the project root `.env`:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Restart Vite after changing `.env`. When the URL is configured, checkout sends each order to Apps Script and only confirms it after the script reports a successful save; on failure, the cart stays intact and the error is shown so the order can be retried. The Admin dashboard loads orders when opened and refreshes them every 30 seconds while open. The Apps Script tab shows connection status and includes an optional manual sync. Without a URL, the storefront uses browser-local demo storage.

## Accounts and security

The current sign-in/sign-up flow is a frontend demonstration. Customer accounts, sessions, and passwords are stored in that browser's local storage; they are not shared across devices and are not secure authentication. The seeded demo admin is `admin@tapikco.com` with password `TapikAdmin2026!`. This is not a production admin credential.

The Apps Script endpoint currently accepts write requests from its deployment audience without validating a user session. Do not expose a production spreadsheet this way. Before real customer or payment data is used, add server-side authentication and role checks for order and inventory actions, and replace the public-Drive image sharing behavior with an access-controlled delivery method.