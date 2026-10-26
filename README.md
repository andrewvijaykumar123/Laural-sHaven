# Laural's Haven Ordering Experience

A polished restaurant ordering app for Laural's Haven with:
- complete café menu and pricing
- cart and checkout flow
- UPI deep links for GPay, PhonePe, Paytm, BHIM
- QR scan-to-pay option using the UPI payment ID
- order confirmation emails sent to Havenlaurals06@gmail.com when SMTP is configured

## Run locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## Environment setup

Copy .env.example to .env and configure your SMTP credentials:

```bash
copy .env.example .env
```

Set the following values:

- SMTP_HOST: e.g. smtp.gmail.com or your self-hosted SMTP relay
- SMTP_PORT: 587
- SMTP_SECURE: false
- SMTP_USER: your SMTP username
- SMTP_PASS: your SMTP password or app password
- SMTP_FROM: sender address
- EMAIL_TO: Havenlaurals06@gmail.com
- UPI_ID: paytm.s1pl5v7@pty

## Production email note

The project uses Nodemailer with SMTP so you can send order confirmations to the production Gmail address using an open-source SMTP setup or a self-hosted mail relay without relying on a proprietary frontend-only flow. If SMTP is not configured, the app still accepts the order and logs the email status to the server output.

## Features included

- menu-driven ordering from the café catalogue
- mobile-first restaurant UI
- instant cart totals with service fee
- UPI app deep-link checkout
- QR code generation for payment scanning
- email-order record generation for the restaurant inbox
