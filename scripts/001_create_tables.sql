-- Create items table: stores gacha reward metadata
CREATE TABLE IF NOT EXISTS public.items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Rare', 'SSR')),
  image_url TEXT NOT NULL,
  drop_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create spin_history table: logs every spin result
CREATE TABLE IF NOT EXISTS public.spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  item_won_id INTEGER NOT NULL REFERENCES public.items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

-- Items are publicly readable (anyone can see the gacha pool)
CREATE POLICY "items_public_read" ON public.items
  FOR SELECT USING (true);

-- Spin history is publicly readable (for the "recent drops" feed)
CREATE POLICY "spin_history_public_read" ON public.spin_history
  FOR SELECT USING (true);

-- Spin history can be inserted by anyone (we validate via server action)
CREATE POLICY "spin_history_public_insert" ON public.spin_history
  FOR INSERT WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_spin_history_created_at ON public.spin_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spin_history_wallet ON public.spin_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON public.items(rarity);
