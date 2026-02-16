export type Rarity = "Common" | "Rare" | "SSR"

export interface GachaItem {
  id: string
  name: string
  rarity: Rarity
  image_url: string
  drop_rate: number
  created_at: string
}

export interface SpinHistoryEntry {
  id: string
  wallet_address: string
  item_won_id: string
  created_at: string
  items?: GachaItem
}

export interface CollectedItem extends GachaItem {
  count: number
}
