-- =============================================
-- 007: Combined Bugfix Migration
-- Fixes: image paths, UR rarity, missing tables
-- =============================================

-- ─── 1) Fix rarity CHECK constraint to include UR ───
-- Drop old constraint and recreate with UR
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_rarity_check;
ALTER TABLE public.items ADD CONSTRAINT items_rarity_check CHECK (rarity IN ('Common', 'Rare', 'SSR', 'UR'));

-- ─── 2) Fix item image paths (old SVGs → correct PNGs) ───
-- Update all existing items to use the correct PNG images
UPDATE public.items SET image_url = '/images/nft-common_01.png' WHERE name = 'Little Music Lover Duck';
UPDATE public.items SET image_url = '/images/nft-common_02.png' WHERE name = 'Sweet Pastel Candy';
UPDATE public.items SET image_url = '/images/nft-common_03.png' WHERE name = 'Rainbow on Fluffy Clouds';
UPDATE public.items SET image_url = '/images/nft-common_04.png' WHERE name = 'Pink Heart Gem Ring';
UPDATE public.items SET image_url = '/images/nft-common_05.png' WHERE name = 'Smiling Little Sta';
UPDATE public.items SET image_url = '/images/nft-rare_01.png'   WHERE name = 'Pink Bunny with Heart Wand';
UPDATE public.items SET image_url = '/images/nft-rare_02.png'   WHERE name = 'Little Wizard Cat';
UPDATE public.items SET image_url = '/images/nft-rare_03.png'   WHERE name = 'Tiny Buddy Robot';
UPDATE public.items SET image_url = '/images/nft-ssr_01.png'    WHERE name = 'Joyful Friends Party';
UPDATE public.items SET image_url = '/images/nft-ssr_02.png'    WHERE name = 'Little Rainbow Unicorn';
UPDATE public.items SET image_url = '/images/nft-ssr_03.png'    WHERE name = 'Little Fire-Breathing Golden Dragon';

-- Fallback: if items were seeded with generic SVG names instead of character names
UPDATE public.items SET image_url = '/images/nft-common_01.png' WHERE image_url LIKE '%nft-common.svg%';
UPDATE public.items SET image_url = '/images/nft-rare_01.png'   WHERE image_url LIKE '%nft-rare.svg%';
UPDATE public.items SET image_url = '/images/nft-ssr_01.png'    WHERE image_url LIKE '%nft-ssr.svg%';

-- ─── 3) Add UR item ───
INSERT INTO items (name, rarity, image_url, drop_rate) VALUES
  ('Crystal Snow Nine-Tailed Fox', 'UR', '/images/nft-ur_01.png', 0.005)
ON CONFLICT DO NOTHING;

-- ─── 4) Create reactor_upgrades table (from 005) ───
CREATE TABLE IF NOT EXISTS public.reactor_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  cost NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reactor_upgrades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reactor_upgrades_public_read') THEN
    CREATE POLICY "reactor_upgrades_public_read" ON public.reactor_upgrades FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reactor_upgrades_insert') THEN
    CREATE POLICY "reactor_upgrades_insert" ON public.reactor_upgrades FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reactor_upgrades_wallet ON public.reactor_upgrades(wallet_address);

-- Add clicks_per_coin column to user_energy if it doesn't exist
ALTER TABLE public.user_energy ADD COLUMN IF NOT EXISTS clicks_per_coin INTEGER NOT NULL DEFAULT 50;

-- ─── 5) Create gvcoin_exchanges table (from 006) ───
CREATE TABLE IF NOT EXISTS public.gvcoin_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  gacha_amount NUMERIC(18, 2) NOT NULL,
  gvc_amount NUMERIC(18, 8) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'mint_failed', 'no_contract')),
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gvcoin_exchanges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gvcoin_exchanges_public_read') THEN
    CREATE POLICY "gvcoin_exchanges_public_read" ON public.gvcoin_exchanges FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gvcoin_exchanges_insert') THEN
    CREATE POLICY "gvcoin_exchanges_insert" ON public.gvcoin_exchanges FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gvcoin_exchanges_update') THEN
    CREATE POLICY "gvcoin_exchanges_update" ON public.gvcoin_exchanges FOR UPDATE USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gvcoin_exchanges_wallet ON public.gvcoin_exchanges(wallet_address);
CREATE INDEX IF NOT EXISTS idx_gvcoin_exchanges_created ON public.gvcoin_exchanges(created_at DESC);
