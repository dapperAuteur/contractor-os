-- 152_contact_website_addresses.sql
-- Add website field + contact_addresses table for person contacts.
-- Work.WitUS only — CentenarianOS can safely ignore these.

ALTER TABLE user_contacts ADD COLUMN IF NOT EXISTS website TEXT;

-- ============================================================
-- contact_addresses — multiple addresses per contact
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES user_contacts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'home',
  street      TEXT,
  city        TEXT,
  state       TEXT,
  postal_code TEXT,
  country     TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_addresses_contact ON contact_addresses(contact_id);

-- Migrate existing home_city/home_state/home_country into contact_addresses
INSERT INTO contact_addresses (contact_id, label, city, state, country, is_primary)
SELECT id, 'home', home_city, home_state, home_country, true
FROM user_contacts
WHERE (home_city IS NOT NULL AND home_city <> '')
   OR (home_state IS NOT NULL AND home_state <> '')
   OR (home_country IS NOT NULL AND home_country <> '')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE contact_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_addresses_owner ON contact_addresses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_contacts uc WHERE uc.id = contact_addresses.contact_id AND uc.user_id = auth.uid())
  );
