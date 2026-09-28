# Azhar Residence – Visibility & Persistence Fixes

## Fixed
- Tenant maintenance requests are now persisted immediately to PostgreSQL and remain visible to Admin and Tenant portals.
- Tenant complaints are now persisted immediately and visible to Admin, Tenant, and Staff.
- Tenant facility bookings are now persisted immediately and visible to Admin and Tenant.
- Facility CRUD and booking CRUD now explicitly persist after successful mutations.
- Letters are explicitly persisted on create/update and tenant recipient matching accepts `AllTenants`, `All Tenants`, and `All_Tenants`.
- Staff portal now receives facilities, facility bookings, and letters.
- Staff portal now has a Services & Facilities section showing complaints, facilities, bookings, and letters.
- New unassigned maintenance requests no longer disappear from the Staff portal. Staff can claim an unassigned request before changing its status.
- Staff maintenance status/notes and complaint status changes are explicitly persisted.
- UUID-based IDs are used for new maintenance/complaint/booking/facility records to reduce ID collisions across concurrent deployments.
- Existing database data is not deleted or mass-replaced by these changes.

## Persistence model
PostgreSQL remains the source of truth. Successful writes are persisted using targeted upserts; reads reload the current database state so records created on another Railway/server instance become visible.

## Verification performed
- Package JSON and Postman collection JSON parsed successfully.
- Relevant API routes were inspected for Maintenance, Complaints, Facilities, FacilityBookings, Letters, Tenant Portal, and Staff Portal.
- Modified TypeScript/TSX source has balanced braces/parentheses at the source-text level.
- Full TypeScript/build verification could not be completed in this environment because the uploaded project's npm dependencies are not installed completely (`vite` and several type packages are missing). This does not change the source files in the delivery.

## Deployment
1. Replace the old project with this ZIP.
2. Keep the existing Railway `DATABASE_URL`, `JWT_SECRET`, and production environment variables.
3. Deploy/build normally with the project's existing scripts.
4. After deployment, test with:
   - Tenant: create maintenance request → Admin Maintenance → Staff Tasks.
   - Tenant: create complaint → Admin Complaints → Staff Services.
   - Tenant: create facility booking → Admin Facility Bookings → Tenant Bookings.
   - Admin: create/update facility → Tenant Facilities.
   - Admin: send letter to all tenants or a specific tenant → Tenant Letters.
