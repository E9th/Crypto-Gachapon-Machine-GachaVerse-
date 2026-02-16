-- =============================================
-- 003: wallet_balances, marketplace, trades, nft_claims
-- =============================================

-- Wallet balances: track GACHA token balance per wallet
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  wallet_address TEXT PRIMARY KEY,
  balance NUMERIC(18, 2) NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marketplace listings: sell gacha items for GACHA tokens
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_wallet TEXT NOT NULL,
  spin_history_id UUID NOT NULL REFERENCES public.spin_history(id),
  item_id INTEGER NOT NULL REFERENCES public.items(id),
  price NUMERIC(18, 2) NOT NULL CHECK (price > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  buyer_wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ
);

-- Trade offers: trade gacha items between wallets
CREATE TABLE IF NOT EXISTS public.trade_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offerer_wallet TEXT NOT NULL,
  offerer_spin_history_id UUID NOT NULL REFERENCES public.spin_history(id),
  offerer_item_id INTEGER NOT NULL REFERENCES public.items(id),
  target_wallet TEXT,  -- NULL = open offer to anyone
  wanted_item_id INTEGER REFERENCES public.items(id),  -- NULL = accept anything
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  accepter_wallet TEXT,
  accepter_spin_history_id UUID REFERENCES public.spin_history(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- NFT claims: track which items have been "claimed" as NFTs
CREATE TABLE IF NOT EXISTS public.nft_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  spin_history_id UUID NOT NULL UNIQUE REFERENCES public.spin_history(id),
  item_id INTEGER NOT NULL REFERENCES public.items(id),
  token_id TEXT,  -- simulated token ID
  tx_hash TEXT,   -- simulated transaction hash
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add column to spin_history to track ownership transfers
ALTER TABLE public.spin_history ADD COLUMN IF NOT EXISTS
  owned_by TEXT;
-- Default owned_by = wallet_address (original spinner owns it)
UPDATE public.spin_history SET owned_by = wallet_address WHERE owned_by IS NULL;

-- Nonce table for replay protection
CREATE TABLE IF NOT EXISTS public.auth_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used BOOLEAN NOT NULL DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_nonces ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow server-side access (service role bypasses RLS)
-- Public read for marketplace
CREATE POLICY "marketplace_public_read" ON public.marketplace_listings
  FOR SELECT USING (true);
CREATE POLICY "marketplace_insert" ON public.marketplace_listings
  FOR INSERT WITH CHECK (true);
CREATE POLICY "marketplace_update" ON public.marketplace_listings
  FOR UPDATE USING (true);

-- Public read for trades
CREATE POLICY "trades_public_read" ON public.trade_offers
  FOR SELECT USING (true);
CREATE POLICY "trades_insert" ON public.trade_offers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "trades_update" ON public.trade_offers
  FOR UPDATE USING (true);

-- NFT claims
CREATE POLICY "nft_claims_public_read" ON public.nft_claims
  FOR SELECT USING (true);
CREATE POLICY "nft_claims_insert" ON public.nft_claims
  FOR INSERT WITH CHECK (true);
CREATE POLICY "nft_claims_update" ON public.nft_claims
  FOR UPDATE USING (true);

-- Wallet balances
CREATE POLICY "balances_public_read" ON public.wallet_balances
  FOR SELECT USING (true);
CREATE POLICY "balances_insert" ON public.wallet_balances
  FOR INSERT WITH CHECK (true);
CREATE POLICY "balances_update" ON public.wallet_balances
  FOR UPDATE USING (true);

-- Nonces
CREATE POLICY "nonces_all" ON public.auth_nonces
  FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON public.marketplace_listings(seller_wallet);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_trades_offerer ON public.trade_offers(offerer_wallet);
CREATE INDEX IF NOT EXISTS idx_nft_claims_wallet ON public.nft_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_spin_history_owned ON public.spin_history(owned_by);
CREATE INDEX IF NOT EXISTS idx_nonces_wallet ON public.auth_nonces(wallet_address);
