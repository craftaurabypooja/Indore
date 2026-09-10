# CraftAura by Pooja

A lightweight mobile-first handicraft catalogue and COD order website.

## Architecture

- GitHub Pages: website hosting
- Google Sheets: product catalogue + orders
- Google Drive: product photos/videos
- Google Apps Script: small backend/API
- Browser localStorage: shopping cart
- Payment: Cash on Delivery

## 1. Google Sheet

Create a sheet named **Products** with these exact headers:

`Product ID | Product Name | Category | Price | Description | Stock | Photo 1 | Photo 2 | Photo 3 | Video | Active.`

Example:

| Product ID | Product Name | Category | Price | Description | Stock | Photo 1 | Photo 2 | Photo 3 | Video | Active. |
|---|---|---|---:|---|---:|---|---|---|---|---|
| HA001 | Pearl Hair Clip | Hair Accessories | 149 | Handmade pearl hair clip | 10 | Drive link | Drive link | | | Yes |

Use **Yes** in Active. to show the product. Use **No** to hide it.

### Google Drive links

For each image/video, share the Drive file as **Anyone with the link – Viewer**.

Paste the normal Google Drive sharing link into the corresponding Photo/Video cell. The website converts common Drive file links automatically.

## 2. Apps Script

Open the Google Sheet -> Extensions -> Apps Script.

Copy `google-apps-script/Code.gs` into Apps Script.

Replace:

`PASTE_YOUR_GOOGLE_SHEET_ID_HERE`

with the ID from your Google Sheet URL.

Deploy:

- New deployment
- Type: Web app
- Execute as: Me
- Who has access: Anyone
- Deploy

Copy the generated `/exec` URL.

## 3. Connect the website

Open `js/config.js` and replace:

`PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

with the Apps Script `/exec` URL.

## 4. GitHub Pages

Create a GitHub repository, upload all files while preserving the folders, then:

Repository -> Settings -> Pages -> Deploy from branch -> main -> / (root)

Open the generated GitHub Pages address.

## 5. Orders

The first successful order automatically creates an **Orders** sheet.

Columns:

Order ID, Date/Time, Customer Name, Mobile, WhatsApp, Address, City, PIN Code, Products, Quantities, Prices, Total, Payment, Order Note, Status.

Orders are COD and initially marked **New**.

## Important

This is intentionally not a payment gateway/e-commerce backend. The seller processes COD orders manually.

For production, consider adding:
- seller/admin authentication
- order cancellation/confirmation workflow
- WhatsApp order notifications
- shipping charges
- GST/invoice fields if required
- better media hosting/CDN if the catalogue becomes large
