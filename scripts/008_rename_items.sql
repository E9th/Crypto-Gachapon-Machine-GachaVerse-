-- =============================================
-- 008: Rename NFT Items
-- Updates item names to new character names
-- Matches by image_url for reliability
-- =============================================

-- Common items
UPDATE public.items SET name = 'Little Music Lover Duck'  WHERE image_url = '/images/nft-common_01.png';
UPDATE public.items SET name = 'Sweet Pastel Candy'       WHERE image_url = '/images/nft-common_02.png';
UPDATE public.items SET name = 'Rainbow on Fluffy Clouds' WHERE image_url = '/images/nft-common_03.png';
UPDATE public.items SET name = 'Pink Heart Gem Ring'      WHERE image_url = '/images/nft-common_04.png';
UPDATE public.items SET name = 'Smiling Little Star'      WHERE image_url = '/images/nft-common_05.png';

-- Rare items
UPDATE public.items SET name = 'Pink Bunny with Heart Wand' WHERE image_url = '/images/nft-rare_01.png';
UPDATE public.items SET name = 'Little Wizard Cat'          WHERE image_url = '/images/nft-rare_02.png';
UPDATE public.items SET name = 'Tiny Buddy Robot'           WHERE image_url = '/images/nft-rare_03.png';

-- SSR items
UPDATE public.items SET name = 'Joyful Friends Party'                WHERE image_url = '/images/nft-ssr_01.png';
UPDATE public.items SET name = 'Little Rainbow Unicorn'              WHERE image_url = '/images/nft-ssr_02.png';
UPDATE public.items SET name = 'Little Fire-Breathing Golden Dragon' WHERE image_url = '/images/nft-ssr_03.png';

-- UR item
UPDATE public.items SET name = 'Crystal Snow Nine-Tailed Fox' WHERE image_url = '/images/nft-ur_01.png';
