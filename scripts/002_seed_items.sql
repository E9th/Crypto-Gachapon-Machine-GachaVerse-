-- Seed gacha items with rarity tiers and drop rates
INSERT INTO items (name, rarity, image_url, drop_rate) VALUES
  ('Blue Slime', 'Common', '/images/nft-common.svg', 0.35),
  ('Green Sprite', 'Common', '/images/nft-common.svg', 0.20),
  ('Cloud Puff', 'Common', '/images/nft-common.svg', 0.15),
  ('Sakura Fox', 'Rare', '/images/nft-rare.svg', 0.12),
  ('Moon Rabbit', 'Rare', '/images/nft-rare.svg', 0.08),
  ('Crystal Koi', 'Rare', '/images/nft-rare.svg', 0.05),
  ('Golden Dragon', 'SSR', '/images/nft-ssr.svg', 0.03),
  ('Phoenix Lord', 'SSR', '/images/nft-ssr.svg', 0.02)
ON CONFLICT DO NOTHING;
