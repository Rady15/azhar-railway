# Azhar Residence media + tenant mobile API update

Implemented:
- Announcement/ad images: stored in `media_assets`, category `announcement-image`, public `/media/:id` display URL, admin upload control.
- Tenant profile photo: tenant can change it from the tenant portal; it is persisted to the tenant record and authenticated user profile.
- Staff/technician profile photo: same flow through the shared profile settings and staff profile API.
- Unit photos: admin can add/replace a unit image from the unit edit screen; persisted as `imageUrl` and rendered in unit details.
- Self profile editing: tenant/staff display name, email and supported phone fields are synchronized to both the entity record and `app_users`.
- Facilities already had image support; the public media route now keeps facility images visible to users.
- FCM device registration already existed and is now paired with Firebase Cloud Messaging HTTP v1 server support. New announcements trigger push notifications to Tenant users when Firebase server credentials are configured.
- `public/firebase-messaging-sw.js` now loads public Firebase config from `/api/firebase-public-config` instead of hard-coded placeholder values.

## Firebase server configuration

Set **one** of:
- `FIREBASE_SERVICE_ACCOUNT_JSON` = the full service-account JSON.
- Or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

Also set the existing `VITE_FIREBASE_*` values for the web/mobile-facing Firebase project configuration and `VITE_FIREBASE_VAPID_KEY` for web push.

Never put a Firebase service-account private key in a `VITE_*` variable.

## Tenant mobile Postman collection

Import:
- `api_collections/Azhar-Tenant-Mobile.postman_collection.json`
- `api_collections/Azhar-Tenant-Mobile.postman_environment.json`

Flow:
1. Set `baseUrl` and tenant credentials.
2. Run **Login**; the collection stores access/refresh tokens.
3. Run **Register FCM device** after the mobile app obtains its FCM token.
4. Use profile, media, announcements, facilities, bookings, maintenance, complaints, documents and notifications endpoints.

The database schema is backward-compatible; startup applies the existing `media_assets`/`user_devices` structures and the new media/FCM migration marker automatically.
