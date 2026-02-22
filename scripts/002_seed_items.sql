-- Seed gacha items with rarity tiers, drop rates, and unique images
-- Uses actual images from public/images/
INSERT INTO items (name, rarity, image_url, drop_rate) VALUES
  ('Little Music Lover Duck',              'Common', '/images/nft-common_01.png', 0.20),
  ('Sweet Pastel Candy',                   'Common', '/images/nft-common_02.png', 0.18),
  ('Rainbow on Fluffy Clouds',             'Common', '/images/nft-common_03.png', 0.17),
  ('Pink Heart Gem Ring',                  'Common', '/images/nft-common_04.png', 0.10),
  ('Smiling Little Star',                  'Common', '/images/nft-common_05.png', 0.05),
  ('Pink Bunny with Heart Wand',           'Rare',   '/images/nft-rare_01.png',   0.12),
  ('Little Wizard Cat',                    'Rare',   '/images/nft-rare_02.png',   0.08),
  ('Tiny Buddy Robot',                     'Rare',   '/images/nft-rare_03.png',   0.05),
  ('Joyful Friends Party',                 'SSR',    '/images/nft-ssr_01.png',    0.02),
  ('Little Rainbow Unicorn',               'SSR',    '/images/nft-ssr_02.png',    0.02),
  ('Little Fire-Breathing Golden Dragon',  'SSR',    '/images/nft-ssr_03.png',    0.01),
  ('Crystal Snow Nine-Tailed Fox',         'UR',     '/images/nft-ur_01.png',     0.005)
ON CONFLICT DO NOTHING;
