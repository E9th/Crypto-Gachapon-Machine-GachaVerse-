// Run with: node scripts/run-migration.mjs
import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString:
    "postgres://postgres.yrcmbrraeshhcpjtjcua:MEHyKNs0seVJLXmx@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
  ssl: { rejectUnauthorized: false },
});

const statements = [
  `CREATE TABLE IF NOT EXISTS public.wallet_balances (
    wallet_address TEXT PRIMARY KEY,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_wallet TEXT NOT NULL,
    spin_history_id UUID NOT NULL REFERENCES public.spin_history(id),
    item_id INTEGER NOT NULL REFERENCES public.items(id),
    price NUMERIC(18, 2) NOT NULL CHECK (price > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
    buyer_wallet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sold_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS public.trade_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offerer_wallet TEXT NOT NULL,
    offerer_spin_history_id UUID NOT NULL REFERENCES public.spin_history(id),
    offerer_item_id INTEGER NOT NULL REFERENCES public.items(id),
    target_wallet TEXT,
    wanted_item_id INTEGER REFERENCES public.items(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    accepter_wallet TEXT,
    accepter_spin_history_id UUID REFERENCES public.spin_history(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS public.nft_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    spin_history_id UUID NOT NULL UNIQUE REFERENCES public.spin_history(id),
    item_id INTEGER NOT NULL REFERENCES public.items(id),
    token_id TEXT,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.auth_nonces (
    nonce TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  // Add owned_by column to spin_history
  `ALTER TABLE public.spin_history ADD COLUMN IF NOT EXISTS owned_by TEXT`,
  `UPDATE public.spin_history SET owned_by = wallet_address WHERE owned_by IS NULL`,
  // Enable RLS
  `ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.nft_claims ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.auth_nonces ENABLE ROW LEVEL SECURITY`,
  // Policies - marketplace
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='marketplace_public_read') THEN CREATE POLICY "marketplace_public_read" ON public.marketplace_listings FOR SELECT USING (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='marketplace_insert') THEN CREATE POLICY "marketplace_insert" ON public.marketplace_listings FOR INSERT WITH CHECK (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='marketplace_update') THEN CREATE POLICY "marketplace_update" ON public.marketplace_listings FOR UPDATE USING (true); END IF; END $$`,
  // Policies - trades
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='trades_public_read') THEN CREATE POLICY "trades_public_read" ON public.trade_offers FOR SELECT USING (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='trades_insert') THEN CREATE POLICY "trades_insert" ON public.trade_offers FOR INSERT WITH CHECK (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='trades_update') THEN CREATE POLICY "trades_update" ON public.trade_offers FOR UPDATE USING (true); END IF; END $$`,
  // Policies - nft_claims
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='nft_claims_public_read') THEN CREATE POLICY "nft_claims_public_read" ON public.nft_claims FOR SELECT USING (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='nft_claims_insert') THEN CREATE POLICY "nft_claims_insert" ON public.nft_claims FOR INSERT WITH CHECK (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='nft_claims_update') THEN CREATE POLICY "nft_claims_update" ON public.nft_claims FOR UPDATE USING (true); END IF; END $$`,
  // Policies - wallet_balances
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='balances_public_read') THEN CREATE POLICY "balances_public_read" ON public.wallet_balances FOR SELECT USING (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='balances_insert') THEN CREATE POLICY "balances_insert" ON public.wallet_balances FOR INSERT WITH CHECK (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='balances_update') THEN CREATE POLICY "balances_update" ON public.wallet_balances FOR UPDATE USING (true); END IF; END $$`,
  // Policies - nonces
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='nonces_all') THEN CREATE POLICY "nonces_all" ON public.auth_nonces FOR ALL USING (true); END IF; END $$`,
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace_listings(status)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON public.marketplace_listings(seller_wallet)`,
  `CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trade_offers(status)`,
  `CREATE INDEX IF NOT EXISTS idx_trades_offerer ON public.trade_offers(offerer_wallet)`,
  `CREATE INDEX IF NOT EXISTS idx_nft_claims_wallet ON public.nft_claims(wallet_address)`,
  `CREATE INDEX IF NOT EXISTS idx_nonces_wallet ON public.auth_nonces(wallet_address)`,
  `CREATE INDEX IF NOT EXISTS idx_spin_history_owned ON public.spin_history(owned_by)`,
];

async function main() {
  await client.connect();
  console.log("Connected to database");

  for (const sql of statements) {
    try {
      await client.query(sql);
      console.log(`OK: ${sql.substring(0, 60)}...`);
    } catch (err) {
      console.error(`ERROR: ${err.message} | SQL: ${sql.substring(0, 60)}...`);
    }
  }

  await client.end();
  console.log("Migration complete!");
}

main().catch(console.error);
