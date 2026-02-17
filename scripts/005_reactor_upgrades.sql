-- =============================================
-- 005: Reactor Upgrade History
-- =============================================

-- Track upgrade purchases (audit trail)
CREATE TABLE IF NOT EXISTS public.reactor_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  cost NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reactor_upgrades ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "reactor_upgrades_public_read" ON public.reactor_upgrades
  FOR SELECT USING (true);
CREATE POLICY "reactor_upgrades_insert" ON public.reactor_upgrades
  FOR INSERT WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_reactor_upgrades_wallet ON public.reactor_upgrades(wallet_address);

-- Also add clicks_per_coin column to user_energy so server tracks per-level efficiency
ALTER TABLE public.user_energy ADD COLUMN IF NOT EXISTS clicks_per_coin INTEGER NOT NULL DEFAULT 50;
