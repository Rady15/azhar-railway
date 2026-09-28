# Official Letter Delivery & Attachments

## Admin
- Create official letters and target all tenants or a specific tenant.
- Attach one official PDF/JPG/PNG/WEBP file up to 8 MB.
- Open or download the attachment from the letter details.

## Tenant
- `GET /api/tenant-portal/letters` returns letters visible to the logged-in tenant.
- Each attached letter includes `attachmentMediaId`, `attachmentUrl`, `attachmentFileName`, and `attachmentMimeType`.
- Tenant can open or download the attachment only when the letter is addressed to that tenant or all tenants.

## Endpoints
- `POST /api/letters` — create an official letter.
- `POST /api/letters/:id/attachment` — upload/replace the official letter file (Admin).
- `GET /api/letters/:id/attachment` — open the attachment (Admin).
- `GET /api/letters/:id/attachment?download=1` — download the attachment (Admin).
- `GET /api/tenant-portal/letters` — list tenant letters.
- `GET /api/tenant-portal/letters/:id/attachment` — open the tenant's letter attachment.
- `GET /api/tenant-portal/letters/:id/attachment?download=1` — download the tenant's letter attachment.

Files are stored in the existing PostgreSQL `media_assets` table; no Cloudinary/external file storage is required.
