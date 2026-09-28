# Azhar Tenant Unit Linking & Portal Fix

## Backend
- `/api/tenant-portal/me` now resolves the tenant's unit by:
  1. `houses.tenantId`
  2. explicit tenant `unitId/houseId`
  3. active/current contract `houseId/unitId`
  4. contract unit number + building
  5. legacy tenant unit/house number + building
- The resolved relationship is repaired in both directions:
  - Tenant: `unitId`, `houseId`, `unitNumber`, `houseNumber`, `buildingNumber`
  - Unit: `tenantId`, `tenantName`, occupied state
- The response now includes:
  - `tenant.unitId`
  - `tenant.houseId`
  - `tenant.unitNumber`
  - `tenant.houseNumber`
  - `tenant.buildingNumber`
  - `tenant.unitType`
  - `tenant.unitCompoundId`
  - `tenant.unitCompoundName`
  - `tenant.unitImageUrl`
  - `tenant.unitImageName`
  - `tenant.unitImageUrls`
  - `tenant.unitImages`
  - `tenant.unit` (complete unit record)
  - top-level `unit`
  - top-level `unitImages`
- Unit-image media stored in `media_assets` is loaded and exposed through the public unit-image URL.
- The unit response also includes the matching electricity meter information when available.

## Tenant Portal
- Added a dedicated **My Unit / الوحدة السكنية** section.
- Added a responsive image gallery (up to 8 images) with click-to-open.
- Added complete unit information:
  building, floor, compound, type, area, rooms, bathrooms, living, majlis,
  furnished, installed kitchen, central AC, garage, garden, status, annual rent,
  electricity meter and notes.
- Added a compact unit preview to the home dashboard.
- The portal reads the unit data from `/api/tenant-portal/me`, so an admin image change is reflected after the next portal data refresh.

## Verification
Targeted source checks passed for the endpoint, tenant/unit resolution, bidirectional repair,
unit-media retrieval, public image URLs, complete unit response, unit tab, gallery and unit details.

A full `npm run check` could not be completed in this workspace because the uploaded archive
does not contain `node_modules`, and the available dependency installation attempt timed out.
Run `npm ci` followed by `npm run check` in the deployment/development environment.
