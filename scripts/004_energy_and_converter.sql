-- =============================================
-- 004: Ether Reactor (Energy) & Matter Converter
-- =============================================

-- User energy: tracks reactor energy per wallet
CREATE TABLE IF NOT EXISTS public.user_energy (
  wallet_address TEXT PRIMARY KEY,
  energy NUMERIC(10, 2) NOT NULL DEFAULT 100,
  max_energy NUMERIC(10, 2) NOT NULL DEFAULT 100,
  level INTEGER NOT NULL DEFAULT 1,
  total_harvested NUMERIC(18, 2) NOT NULL DEFAULT 0,
  last_regen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_harvest_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert history: logs every item conversion
CREATE TABLE IF NOT EXISTS public.convert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  spin_history_id UUID NOT NULL REFERENCES public.spin_history(id),
  item_id INTEGER NOT NULL REFERENCES public.items(id),
  item_rarity TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('energy', 'coins')),
  reward_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_energy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convert_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "energy_public_read" ON public.user_energy
  FOR SELECT USING (true);
CREATE POLICY "energy_insert" ON public.user_energy
  FOR INSERT WITH CHECK (true);
CREATE POLICY "energy_update" ON public.user_energy
  FOR UPDATE USING (true);

CREATE POLICY "convert_history_public_read" ON public.convert_history
  FOR SELECT USING (true);
CREATE POLICY "convert_history_insert" ON public.convert_history
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_energy_wallet ON public.user_energy(wallet_address);
CREATE INDEX IF NOT EXISTS idx_convert_history_wallet ON public.convert_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_convert_history_created ON public.convert_history(created_at DESC);
