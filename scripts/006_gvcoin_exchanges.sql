-- =============================================
-- 006: GVCoin Exchange History
-- =============================================

-- Track GACHA → GVCoin exchanges
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

-- Enable RLS
ALTER TABLE public.gvcoin_exchanges ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "gvcoin_exchanges_public_read" ON public.gvcoin_exchanges
  FOR SELECT USING (true);
CREATE POLICY "gvcoin_exchanges_insert" ON public.gvcoin_exchanges
  FOR INSERT WITH CHECK (true);
CREATE POLICY "gvcoin_exchanges_update" ON public.gvcoin_exchanges
  FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gvcoin_exchanges_wallet ON public.gvcoin_exchanges(wallet_address);
CREATE INDEX IF NOT EXISTS idx_gvcoin_exchanges_created ON public.gvcoin_exchanges(created_at DESC);
