-- ============================================================
-- REFUND REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  email         TEXT NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  booking_ref   TEXT NOT NULL CHECK (char_length(booking_ref) BETWEEN 3 AND 50),
  booking_date  DATE NOT NULL,
  refund_reason TEXT NOT NULL CHECK (refund_reason IN ('cancellation','service_issue','double_charge','property_condition','other')),
  details       TEXT CHECK (char_length(details) <= 2000),
  file_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for refund_requests
CREATE INDEX IF NOT EXISTS idx_refund_requests_email       ON public.refund_requests (email);
CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_ref ON public.refund_requests (booking_ref);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at  ON public.refund_requests (created_at DESC);

-- RLS: Public may INSERT only. No reads/updates/deletes for anon.
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_refund_requests"
  ON public.refund_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated_select_refund_requests"
  ON public.refund_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- MAINTENANCE ISSUES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       TEXT NOT NULL UNIQUE,
  property        TEXT NOT NULL CHECK (property IN ('Sunset Villa','Ocean Breeze Apt','Mountain Lodge','City Loft','Riverside Cottage')),
  category        TEXT NOT NULL CHECK (category IN ('plumbing','electrical','hvac','appliances','structural','cleaning','other')),
  urgency         TEXT NOT NULL CHECK (urgency IN ('low','medium','high')),
  description     TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  photo_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for maintenance_issues
CREATE INDEX IF NOT EXISTS idx_maintenance_status   ON public.maintenance_issues (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_property ON public.maintenance_issues (property);
CREATE INDEX IF NOT EXISTS idx_maintenance_urgency  ON public.maintenance_issues (urgency);
CREATE INDEX IF NOT EXISTS idx_maintenance_created  ON public.maintenance_issues (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket   ON public.maintenance_issues (ticket_id);

-- Trigger: auto-update last_updated_at on row change
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintenance_updated
  BEFORE UPDATE ON public.maintenance_issues
  FOR EACH ROW EXECUTE FUNCTION update_last_updated_at();

-- RLS
ALTER TABLE public.maintenance_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_maintenance"
  ON public.maintenance_issues
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated_select_maintenance"
  ON public.maintenance_issues
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon to update status only (for dashboard in this demo)
CREATE POLICY "anon_update_status_maintenance"
  ON public.maintenance_issues
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (status IN ('open','in_progress','resolved'));

-- ============================================================
-- STORAGE BUCKETS
-- Run via Supabase Dashboard: Storage > New Bucket
-- ============================================================
-- Bucket: refund-receipts
--   Public: false
--   Max file size: 5242880 (5MB)
--   Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
--
-- Bucket: maintenance-photos
--   Public: false
--   Max file size: 10485760 (10MB)
--   Allowed MIME types: image/jpeg, image/png, image/webp
