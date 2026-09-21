# Stow & Settle quotation app

An internal Shopify Admin app for creating revision-safe bespoke seating quotations. The first production model intentionally has only four pricing concepts: seating full price, optional additional-option rows, delivery cost, and grand total. All amounts are GBP, inclusive of VAT, and stored as integer pennies.

## Current scope and safety

- Staff create and review quotes inside Shopify Admin.
- Saving creates an immutable `QuoteRevision`; older quoted prices never recalculate.
- Approval queues a Shopify Draft Order. Nothing is sent to Shopify merely because a form changes.
- A worker creates or updates one Draft Order per approved revision, then generates the PDF.
- Customer email sending is explicit and idempotent; preview mode is the development default.
- Customer PDFs and generated images use private S3-compatible storage in production and an ignored `storage/` directory locally.
- No production store, Render service, email recipient, or image provider is configured by this repository.

The previous fabric-charge, discount, subtotal, VAT-amount, deposit, and remaining-balance calculations are deliberately absent.

## Stack

- Shopify's recommended React Router embedded-app architecture
- TypeScript/React and Shopify App Bridge/Polaris
- PostgreSQL with Prisma
- A separate Node worker using the same PostgreSQL job table
- PDFKit, SMTP abstraction, and S3-compatible object storage

## Local development

Requirements: Node 22, Corepack/pnpm, PostgreSQL, a Shopify development app, and a development store.

1. Copy `.env.development.example` to `.env` and replace placeholders locally.
2. Run `corepack enable` and `pnpm install`.
3. Run `pnpm db:migrate` and `pnpm db:seed`.
4. In one terminal run `pnpm dev`; in another run `pnpm worker`.
5. Link the development app with `shopify app config link` and use `shopify.app.toml`.

Use only a development store while configuring the integration. The required scopes are `write_draft_orders`, `read_draft_orders`, `read_customers`, and `write_customers`.

## Configuration

`.env.example` is the canonical variable inventory. Development and production examples contain placeholders only. Never commit `.env` files or credentials.

- `DATABASE_URL`: PostgreSQL connection string.
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SHOPIFY_SCOPES`: server-side Shopify app settings.
- `SESSION_SECRET`: randomly generated production secret.
- `EMAIL_PROVIDER`: `preview` or `smtp`; SMTP credentials remain server-side.
- `OBJECT_STORAGE_*`: private S3-compatible bucket. Use a dedicated bucket with encryption, private access, lifecycle/retention rules, and signed downloads.
- `IMAGE_PROVIDER`, `IMAGE_API_KEY`, `IMAGE_MODEL`: optional server-side image integration; `disabled` by default.

Do not put secrets in `shopify.app*.toml`, source code, browser JavaScript, screenshots, logs, or GitHub Actions variables that are printed by a workflow.

## Database and release commands

- Development migration: `pnpm db:migrate`
- Generate Prisma client: `pnpm db:generate`
- Production release migration: `pnpm db:deploy`
- Seed placeholder styles once: `pnpm db:seed`
- Full verification: `pnpm check`

Render runs `pnpm db:deploy` as its pre-deploy command. Migrations are forward-only and must be reviewed before merging.

## GitHub to Render

1. Review `render.yaml`; choose the desired paid plans and region before creating resources.
2. In Render, create a **Blueprint** and connect `bedcare01/stow-quote`.
3. Render proposes the web service, worker, and PostgreSQL database. Review costs before applying.
4. Set every `sync: false` variable in the Render dashboard. Use the development Shopify app first; do not use production credentials until an approved release window.
5. Create a private S3-compatible bucket and add its endpoint, region, bucket name, and access keys.
6. Keep `EMAIL_PROVIDER=preview` until SMTP delivery has been reviewed with a test recipient.
7. Replace production placeholders in `shopify.app.production.toml`, then deploy that Shopify configuration explicitly with `shopify app deploy --config production`.
8. Confirm `/healthz` returns HTTP 200, run a test quote in a development store, and inspect worker logs before enabling production access.

The Blueprint does not include a Render disk because private object storage is safer for multi-instance deployments and survives redeploys. The health endpoint checks database connectivity and returns no customer data.

## Shopify Draft Orders

The principal custom line item is the complete bespoke seat. Each additional option and non-zero delivery cost is represented as another custom line item. Their manual prices exactly sum to the revision's grand total. The quote reference and revision are included as custom attributes. The worker updates the stored Draft Order rather than creating an accidental duplicate.

`orders/paid` and `app/uninstalled` webhooks are authenticated by the Shopify library; webhook IDs are recorded for idempotency. A quote becomes paid only after the Shopify payment webhook.

## Data handling

- Internal notes are never passed to PDF or customer email renderers.
- Avoid logging customer names, addresses, email bodies, PDF contents, access tokens, or invoice URLs.
- Define retention and deletion periods before production use. Delete expired customer artifacts from object storage and database backups consistently.
- Uploaded files are not implemented yet. When added, enforce allow-listed MIME types, byte limits, malware scanning, private storage, and random object keys.

## Business information still needed

- Approved style names, reference images, descriptions, and dimension rules
- Logo, company details, fonts, colours, terms, and quotation validity wording
- Delivery policy and lead times
- Email sender/provider and test recipients
- Object-storage provider, region, retention period, and access policy
- Whether optional AI imagery is required and, if so, its provider/model
- Final Shopify development and production app/store details
