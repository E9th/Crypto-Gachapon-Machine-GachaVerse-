import type { GachaItem } from "./types"

/**
 * Weighted random selection from the items pool.
 * Uses the drop_rate from Supabase as relative weights.
 */
export function rollGacha(items: GachaItem[]): GachaItem {
  const totalWeight = items.reduce((sum, item) => sum + item.drop_rate, 0)
  let roll = Math.random() * totalWeight

  for (const item of items) {
    roll -= item.drop_rate
    if (roll <= 0) return item
  }

  // Fallback to last item (should never reach here)
  return items[items.length - 1]
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "SSR":
      return "hsl(45, 80%, 68%)"
    case "Rare":
      return "hsl(340, 65%, 72%)"
    default:
      return "hsl(200, 60%, 88%)"
  }
}

export function getRarityBorderClass(rarity: string): string {
  switch (rarity) {
    case "SSR":
      return "border-accent"
    case "Rare":
      return "border-primary"
    default:
      return "border-secondary"
  }
}
