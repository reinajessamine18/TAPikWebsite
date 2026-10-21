# Google Sheets + Apps Script setup (TAPik)

## 1. Create the spreadsheet

Create a Google spreadsheet named `TAPik Database` with these tabs. Put each comma-separated header list in row 1 of the named tab, in the listed order:

- `Products`: `ProductID, ProductName, Description, Category, Price, Stock, ImageURL, WeightGrams, IsActive, CreatedAt, UpdatedAt`
- `Orders`: `OrderID, CustomerID, OrderDate, Subtotal, ShippingFee, TotalAmount, PaymentMethod, PaymentStatus, OrderStatus, ShippingAddressID, Notes, ReceiptNumber, ReceiptURL`
- `OrderItems`: `OrderItemID, OrderID, ProductID, Quantity, UnitPrice, Subtotal`
- `Customers`: `CustomerID, CustomerName, Email, Phone`
- `ShippingRates`: `RateID, DestinationProvince, DestinationCity, DestinationZIP, MinWeightGrams, MaxWeightGrams, ShippingFee, IsActive`
- `Shipments`: `ShipmentID, OrderID, Courier, TrackingNumber, ShipmentStatus, RecipientName, RecipientPhone, DeliveryAddress, BookedAt, ShippedAt, DeliveredAt, TrackingURL, IsSimulated, Remarks`

Keep the listed core headers unchanged; the Apps Script reads and updates rows by header name. It automatically adds these optional columns to `Orders` if they are not present: `ReceiptNumber`, `ReceiptURL`, `Landmark`, `Barangay`, `City`, `ProofURL`, `ProofHash`, `PaymentSubmittedAt`, `PaymentVerifiedAt`, `PaymentRejectReason`.

### Payment flow

New orders start as `Awaiting payment` (`PaymentStatus` = `Pending`, `PaymentMethod` = `QR (demo)`). The customer scans a demo QR code, then uploads a screenshot of the payment (`submitPaymentProof`, status `Payment submitted`, `PaymentStatus` = `Submitted`). An admin reviews the proof in Admin -> Orders (`verifyPayment`): confirming sets the status `Confirmed payment` and `PaymentStatus` = `Paid`; rejecting sets `Payment rejected` with a reason, and the customer can upload a new proof. `updateOrderStatus` only accepts `Being prepared`, `Packed`, `Shipped`, `Delivered` (after the payment is `Paid`) and `Cancelled`. Proofs are saved privately in the `TAPik Payment Proofs` Drive folder and read back through `getPaymentProof`. Each proof image is fingerprinted (SHA-256) in `ProofHash`; an order whose proof image is identical to another order's is flagged to the admin.

## 2. Add and deploy Apps Script

1. Open the spreadsheet and choose Extensions -> Apps Script.
2. Replace the script contents with `appsScript/Code.gs` and save.
3. Deploy -> New deployment -> Web app.
4. Execute as your account. Set access to the audience that needs the storefront, then deploy and copy the web app URL.

After editing `appsScript/Code.gs`, deploy a new version of the web app and update the deployment if the URL changes. The Admin -> Apps Script tab can test the deployed endpoint and sync the order feed.

Custom item artwork and NFC targets are stored as JSON in the order's `Notes` cell because the requested `OrderItems` schema has no image or link columns. Uploaded artwork files are saved in a Drive folder named `TAPik Customer Designs`; a direct image URL and the NFC target are included in that order metadata. The admin order list shows the customer's uploaded artwork (not the keychain mockup) and provides links to view and download the original. The current implementation grants anyone with the file link viewer access so the admin page can display it. Treat those image links as public.

All current shipments are simulated. Apps Script assigns each new shipment a simulated J&T Express tracking number in `JT-` followed by digits format, and replaces missing or incorrectly formatted numbers on existing simulated shipments when Admin data is loaded. These numbers are for demonstration only and are not valid with the real courier. They are stored in the matching `Shipments` row and shown read-only in Admin.

Each new order also receives a numbered PDF order receipt/payment acknowledgment. Apps Script stores the PDF in the `TAPik Receipts` Drive folder and stores its receipt number and download URL in the `ReceiptNumber` and `ReceiptURL` columns on the `Orders` sheet. The script adds these two columns automatically if missing. Checkout, Orders, and Admin request the stored PDF through the Apps Script `getReceipt` action for download. Admin artwork previews are loaded through `getDesignImage`, which returns a thumbnail from the `TAPik Customer Designs` folder. These actions require the deployed script account to have Drive access and the latest script version to be deployed. This is an order receipt, not a BIR-registered tax invoice; the PDF does not represent payment as complete unless the saved payment status is `Paid`. Drive files are shared with anyone who has the link so customers can download them; links should be treated as public.

### Authorize uploaded-design storage

Before using the database, authorize Sheets and Drive once. In the Apps Script editor, choose `authorizeDriveAccess` from the function dropdown and click **Run**. Review and approve both requested Google Sheets and Google Drive access using the account that owns the deployment. This also creates or reuses the `TAPik Customer Designs`, `TAPik Receipts` and `TAPik Payment Proofs` folders. Then deploy a new web-app version. Image-free orders still need Sheets permission; Drive permission is used for uploaded designs.

## 3. Connect the storefront

Set the deployed URL in the project root `.env`:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Restart Vite after changing `.env`. When the URL is configured, checkout sends each order to Apps Script and only confirms it after the script reports a successful save; on failure, the cart stays intact and the error is shown so the order can be retried. The Admin dashboard loads orders when opened and refreshes them every 30 seconds while open. The Apps Script tab shows connection status and includes an optional manual sync. Without a URL, the storefront uses browser-local demo storage.

## Accounts and security

The current sign-in/sign-up flow is a frontend demonstration. Customer accounts, sessions, and passwords are stored in that browser's local storage; they are not shared across devices and are not secure authentication. The seeded demo admin is `admin@tapikco.com` with password `TapikAdmin2026!`. This is not a production admin credential.

The Apps Script endpoint currently accepts write requests from its deployment audience without validating a user session. Do not expose a production spreadsheet this way. Before real customer or payment data is used, add server-side authentication and role checks for order and inventory actions, and replace the public-Drive image sharing behavior with an access-controlled delivery method.