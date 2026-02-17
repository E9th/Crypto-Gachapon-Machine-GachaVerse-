-- Seed gacha items with rarity tiers, drop rates, and unique images
-- Uses actual images from public/images/
INSERT INTO items (name, rarity, image_url, drop_rate) VALUES
  ('Blue Slime',    'Common', '/images/nft-common_01.png', 0.20),
  ('Green Sprite',  'Common', '/images/nft-common_02.png', 0.18),
  ('Cloud Puff',    'Common', '/images/nft-common_03.png', 0.17),
  ('Pink Mochi',    'Common', '/images/nft-common_04.png', 0.10),
  ('Star Jelly',    'Common', '/images/nft-common_05.png', 0.05),
  ('Sakura Fox',    'Rare',   '/images/nft-rare_01.png',   0.12),
  ('Moon Rabbit',   'Rare',   '/images/nft-rare_02.png',   0.08),
  ('Crystal Koi',   'Rare',   '/images/nft-rare_03.png',   0.05),
  ('Golden Dragon', 'SSR',    '/images/nft-ssr_01.png',    0.02),
  ('Phoenix Lord',  'SSR',    '/images/nft-ssr_02.png',    0.02),
  ('Galactic Neko', 'SSR',    '/images/nft-ssr_03.png',    0.01),
  ('Void Emperor',  'UR',     '/images/nft-ur_01.png',     0.005)
ON CONFLICT DO NOTHING;
