# Azhar Legal API Endpoints

Both endpoints are public and intentionally do not require a JWT token. They are registered before the global `/api` authentication middleware.

## 1. Privacy Policy

`GET /api/legal/privacy-policy`

Example full URL:

`https://YOUR-DOMAIN.com/api/legal/privacy-policy`

## 2. Terms of Use

`GET /api/legal/terms-of-use`

Example full URL:

`https://YOUR-DOMAIN.com/api/legal/terms-of-use`

## Response

Both return JSON in this shape:

```json
{
  "success": true,
  "data": {
    "slug": "privacy-policy",
    "title": "سياسة الخصوصية",
    "titleEn": "Privacy Policy",
    "version": "1.0",
    "effectiveDate": "2026-09-27",
    "lastUpdated": "2026-09-27",
    "language": "ar",
    "sections": []
  }
}
```

The legal text is currently stored in `server.ts` so it is available immediately without a database migration. Before public launch, replace the placeholder organization/contact wording with the company's actual legal identity and contact details.
