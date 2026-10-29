# Laural's Haven - Gourmet Ordering

Static storefront hosted on GitHub Pages. No server required.

- Live site: https://andrewvijaykumar123.github.io/Laural-sHaven-UI/
- Admin console: https://andrewvijaykumar123.github.io/Laural-sHaven-UI-AdminConsole/

## How the two sites work together

Both sites share one Firebase project (Firestore + Authentication, free Spark plan) and sync in real time.

- Customers sign in anonymously and can only create orders. They cannot read orders.
- Only the admin account can read orders, change status, verify payment, and edit the open/closed and sold-out settings (see `firestore.rules` in the admin repo).
- Customers follow their order through a status document readable by order id only (no personal data).
- When an order is completed, the customer can rate the service and each product (1 to 5 stars) and leave a comment, once per order. Feedback is stored privately and appears in the admin console Feedback tab.
- Totals are recomputed from the embedded menu by the admin console; all user text is sanitised and escaped.
- Offline writes queue in the browser cache and sync when the connection returns.

Free-tier capacity (Firestore Spark): about 20,000 writes and 50,000 reads per day.

## Files

- `index.html`, `styles.css`, `app.js` - storefront UI
- `core.js` - shared menu (85 items, 18 categories) and Firebase layer (identical copy lives in the admin repo)
- `fb.js` - self-hosted Firebase SDK bundle (built from `tools/fb` in the admin repo)
- `fb-config.js` - public Firebase web config

## Deploy

Push to `main`; the GitHub Actions workflow publishes the site.
