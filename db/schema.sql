CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS entity_id TEXT;
CREATE INDEX IF NOT EXISTS idx_app_users_entity ON app_users(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_exp ON password_reset_tokens(expires_at);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, role_id)
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_exp ON refresh_tokens(expires_at);

-- Business entities use dedicated tables so each module can be indexed, paged and backed up independently.
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_search ON tenants USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_tenants_updated ON tenants(updated_at DESC);
CREATE TABLE IF NOT EXISTS houses (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_houses_search ON houses USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_houses_updated ON houses(updated_at DESC);
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_search ON staff USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_staff_updated ON staff(updated_at DESC);
CREATE TABLE IF NOT EXISTS electricity_meters (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_electricity_meters_search ON electricity_meters USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_electricity_meters_updated ON electricity_meters(updated_at DESC);
ALTER TABLE electricity_meters ADD COLUMN IF NOT EXISTS unit_id TEXT;
CREATE INDEX IF NOT EXISTS idx_electricity_meters_unit_id ON electricity_meters(unit_id);
CREATE TABLE IF NOT EXISTS maintenance (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_search ON maintenance USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_maintenance_updated ON maintenance(updated_at DESC);
CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_letters_search ON letters USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_letters_updated ON letters(updated_at DESC);
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcements_search ON announcements USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_announcements_updated ON announcements(updated_at DESC);
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaints_search ON complaints USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_complaints_updated ON complaints(updated_at DESC);
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_search ON expenses USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_expenses_updated ON expenses(updated_at DESC);
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_search ON companies USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_companies_updated ON companies(updated_at DESC);
CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_facilities_search ON facilities USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_facilities_updated ON facilities(updated_at DESC);
CREATE TABLE IF NOT EXISTS facility_bookings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_facility_bookings_search ON facility_bookings USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_facility_bookings_updated ON facility_bookings(updated_at DESC);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_search ON notifications USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_notifications_updated ON notifications(updated_at DESC);
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_search ON contracts USING gin(to_tsvector('simple', search_text));
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  data JSONB NOT NULL,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_search ON payments USING gin(to_tsvector('simple', search_text));

CREATE TABLE IF NOT EXISTS azhar_profiles (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS azhar_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_azhar_audit_created ON azhar_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_azhar_audit_user ON azhar_audit_log(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rental accounting engine (normalized, append-only financial history)
CREATE TABLE IF NOT EXISTS rent_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  installment_no INTEGER NOT NULL,
  due_date DATE NOT NULL,
  original_amount NUMERIC(14,2) NOT NULL CHECK (original_amount >= 0),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Partially Paid','Paid','Overdue','Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contract_id, installment_no)
);
CREATE INDEX IF NOT EXISTS idx_rent_installments_due ON rent_installments(due_date, status);
CREATE INDEX IF NOT EXISTS idx_rent_installments_contract ON rent_installments(contract_id, installment_no);
CREATE INDEX IF NOT EXISTS idx_rent_installments_tenant ON rent_installments(tenant_id, due_date);

CREATE TABLE IF NOT EXISTS rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT UNIQUE,
  receipt_no TEXT NOT NULL UNIQUE,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  reference_no TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Posted' CHECK (status IN ('Posted','Reversed')),
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rental_payments_tenant ON rental_payments(tenant_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_rental_payments_contract ON rental_payments(contract_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_rental_payments_status ON rental_payments(status, payment_date DESC);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES rental_payments(id) ON DELETE CASCADE,
  installment_id UUID NOT NULL REFERENCES rent_installments(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, installment_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_installment ON payment_allocations(installment_id);

CREATE TABLE IF NOT EXISTS rent_events (
  id BIGSERIAL PRIMARY KEY,
  contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rent_events_contract ON rent_events(contract_id, created_at DESC);

CREATE TABLE IF NOT EXISTS water_meters (
  id TEXT PRIMARY KEY,
  unit_id TEXT,
  building TEXT NOT NULL DEFAULT '',
  unit_number TEXT NOT NULL DEFAULT '',
  meter_number TEXT NOT NULL UNIQUE,
  last_reading NUMERIC(14,3),
  reading_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE water_meters ADD COLUMN IF NOT EXISTS unit_id TEXT;
CREATE INDEX IF NOT EXISTS idx_water_meters_unit_id ON water_meters(unit_id);
CREATE INDEX IF NOT EXISTS idx_water_meters_unit ON water_meters(building, unit_number);

CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  building_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Core relationship layer for compounds, units and utility meters.
CREATE TABLE IF NOT EXISTS compounds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO compounds(id,name,code) VALUES
  ('1','Azhar Residence','AZHAR'),
  ('2','Meadow Park Garden','MEADOW'),
  ('4','Daar Residence','DAAR')
ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, code=EXCLUDED.code, updated_at=NOW();

ALTER TABLE houses ADD COLUMN IF NOT EXISTS compound_id TEXT;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS compound_name TEXT;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS unit_type TEXT;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS is_furnished BOOLEAN;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS notes_text TEXT;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS annual_rent NUMERIC(14,2);

UPDATE houses
SET compound_id = COALESCE(NULLIF(data->>'compoundId',''), '1'),
    compound_name = COALESCE(NULLIF(data->>'compoundName',''), CASE COALESCE(NULLIF(data->>'compoundId',''),'1') WHEN '2' THEN 'Meadow Park Garden' WHEN '4' THEN 'Daar Residence' ELSE 'Azhar Residence' END),
    unit_type = COALESCE(NULLIF(data->>'type',''), 'Apartment'),
    is_furnished = COALESCE((data->>'isFurnished')::boolean, false),
    notes_text = COALESCE(data->>'notes',''),
    annual_rent = COALESCE(NULLIF(data->>'annualRent','')::numeric, 0)
WHERE compound_id IS NULL OR compound_name IS NULL OR unit_type IS NULL OR is_furnished IS NULL OR notes_text IS NULL OR annual_rent IS NULL;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS house_id TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS compound_id TEXT;
UPDATE tenants t
SET house_id = h.id
FROM houses h
WHERE t.house_id IS NULL
  AND (
    (t.data->>'houseId') = h.id
    OR COALESCE(t.data->>'houseNumber','') = COALESCE(h.data->>'houseNumber',h.data->>'unitNumber','')
  );
UPDATE buildings b
SET compound_id = '1'
WHERE b.compound_id IS NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS house_id TEXT;
UPDATE contracts c
SET house_id = COALESCE(NULLIF(c.data->>'houseId',''), h.id)
FROM houses h
WHERE c.house_id IS NULL
  AND ((c.data->>'houseId') = h.id
    OR (COALESCE(c.data->>'unitNumber',c.data->>'houseNumber','') = COALESCE(h.data->>'unitNumber',h.data->>'houseNumber','')
        AND (COALESCE(c.data->>'buildingNumber','') = '' OR COALESCE(c.data->>'buildingNumber','') = COALESCE(h.data->>'buildingNumber',''))));

UPDATE electricity_meters em
SET unit_id = COALESCE(NULLIF(em.data->>'unitId',''), h.id)
FROM houses h
WHERE (em.data->>'unitId') = h.id
   OR (COALESCE(em.data->>'unitNumber','') = COALESCE(h.data->>'unitNumber',h.data->>'houseNumber','')
       AND COALESCE(em.data->>'building','') = COALESCE(h.data->>'buildingNumber',''));
UPDATE water_meters wm SET unit_id=NULL WHERE unit_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM houses h WHERE h.id=wm.unit_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_houses_compound') THEN
    ALTER TABLE houses ADD CONSTRAINT fk_houses_compound FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_tenants_house') THEN
    ALTER TABLE tenants ADD CONSTRAINT fk_tenants_house FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_buildings_compound') THEN
    ALTER TABLE buildings ADD CONSTRAINT fk_buildings_compound FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_contracts_house') THEN
    ALTER TABLE contracts ADD CONSTRAINT fk_contracts_house FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_electricity_meters_unit') THEN
    ALTER TABLE electricity_meters ADD CONSTRAINT fk_electricity_meters_unit FOREIGN KEY (unit_id) REFERENCES houses(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_water_meters_unit') THEN
    ALTER TABLE water_meters ADD CONSTRAINT fk_water_meters_unit FOREIGN KEY (unit_id) REFERENCES houses(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_houses_compound ON houses(compound_id);
CREATE INDEX IF NOT EXISTS idx_contracts_house ON contracts(house_id);
CREATE INDEX IF NOT EXISTS idx_tenants_house ON tenants(house_id);
CREATE INDEX IF NOT EXISTS idx_buildings_compound ON buildings(compound_id);

-- Normalize the allowed accounting frequencies. Legacy monthly/bi-monthly contracts are retained safely as quarterly schedules.
UPDATE contracts
SET data = jsonb_set(
  data,
  '{paymentFrequency}',
  to_jsonb(CASE
    WHEN lower(COALESCE(data->>'paymentFrequency','')) LIKE '%semi%' THEN 'Semi-Annual'
    WHEN lower(COALESCE(data->>'paymentFrequency','')) LIKE '%quarter%' THEN 'Quarterly'
    WHEN lower(COALESCE(data->>'paymentFrequency','')) LIKE '%annual%' OR lower(COALESCE(data->>'paymentFrequency','')) LIKE '%year%' THEN 'Annual'
    WHEN lower(COALESCE(data->>'paymentFrequency','')) LIKE '%four%' OR lower(COALESCE(data->>'paymentFrequency','')) LIKE '%4 month%' THEN 'Every-4-Months'
    ELSE 'Quarterly'
  END::text)
)
WHERE lower(COALESCE(data->>'paymentFrequency','')) IN ('monthly','bi-monthly','bimonthly','');
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_payment_frequency_check;
DO $$ BEGIN
  ALTER TABLE contracts ADD CONSTRAINT contracts_payment_frequency_check CHECK (
    lower(COALESCE(data->>'paymentFrequency','')) IN ('four-monthly','every-4-months','quarterly','semi-annual','annual','')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Media / document storage (profile images, tenant IDs, manual contracts, facility images, attachments)
CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text,
  entity_id text,
  category text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL,
  content bytea NOT NULL,
  uploaded_by uuid NULL REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON media_assets(entity_type, entity_id, category, created_at DESC);

CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL UNIQUE,
  device_type text NOT NULL DEFAULT 'web',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);

INSERT INTO schema_migrations(version) VALUES ('2026-08-15-full-audit-v1') ON CONFLICT DO NOTHING;
