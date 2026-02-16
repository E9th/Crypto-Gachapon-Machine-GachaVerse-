"use client"

import { useState } from "react"
import Image from "next/image"
import { Package, DollarSign, Loader2 } from "lucide-react"
import type { GachaItem } from "@/lib/gacha/types"

const SELL_PRICES: Record<string, number> = {
  Common: 5,
  Rare: 20,
  SSR: 50,
}

interface CollectionGridProps {
  items: Array<GachaItem & { historyId: string }>
  onSell?: (historyId: string) => Promise<{ success?: boolean; error?: string; sold_item?: string; sell_price?: number } | undefined>
}

const rarityBadge: Record<string, string> = {
  Common: "bg-muted text-muted-foreground",
  Rare: "bg-secondary text-secondary-foreground",
  SSR: "bg-accent text-accent-foreground",
}

export function CollectionGrid({ items, onSell }: CollectionGridProps) {
  const [sellingId, setSellingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [sellResult, setSellResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSellClick = (historyId: string) => {
    if (confirmId === historyId) {
      // Already showing confirm - do the sell
      handleConfirmSell(historyId)
    } else {
      // Show confirm
      setConfirmId(historyId)
      setSellResult(null)
      // Auto-dismiss confirm after 3s
      setTimeout(() => setConfirmId((prev) => (prev === historyId ? null : prev)), 3000)
    }
  }

  const handleConfirmSell = async (historyId: string) => {
    if (!onSell) return
    setSellingId(historyId)
    setConfirmId(null)
    const result = await onSell(historyId)
    setSellingId(null)
    if (result?.success) {
      setSellResult({ success: true, message: `Sold ${result.sold_item} for ${result.sell_price} GACHA!` })
      setTimeout(() => setSellResult(null), 3000)
    } else {
      setSellResult({ success: false, message: result?.error || "Failed to sell" })
      setTimeout(() => setSellResult(null), 3000)
    }
  }

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h2 className="font-sans text-lg sm:text-xl text-foreground">My Collection</h2>
          <span className="ml-auto text-xs sm:text-sm font-sans text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Sell result toast */}
        {sellResult && (
          <div
            className={`mb-4 p-3 rounded-xl border-2 font-sans text-xs sm:text-sm text-center animate-slide-up ${
              sellResult.success
                ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {sellResult.message}
          </div>
        )}

        {items.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mb-2 sm:mb-3" />
            <p className="font-sans text-sm text-muted-foreground text-center">
              No items yet, go spin!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {items.map((item) => (
              <div
                key={item.historyId}
                className="group border-2 border-foreground rounded-xl sm:rounded-2xl bg-card overflow-hidden shadow-hard-sm hover:shadow-hard transition-all hover:-translate-y-1"
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover"
                  />
                  <span
                    className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 text-[9px] sm:text-[10px] font-sans px-1.5 sm:px-2 py-0.5 rounded-full border border-foreground ${rarityBadge[item.rarity]}`}
                  >
                    {item.rarity}
                  </span>
                </div>
                <div className="p-2 sm:p-3">
                  <p className="font-sans text-[11px] sm:text-xs text-card-foreground truncate mb-1.5 sm:mb-2">{item.name}</p>
                  <button
                    onClick={() => handleSellClick(item.historyId)}
                    disabled={sellingId === item.historyId}
                    className={`w-full flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg border text-[9px] sm:text-[10px] font-sans transition-colors touch-manipulation ${
                      confirmId === item.historyId
                        ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                        : sellingId === item.historyId
                          ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                          : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {sellingId === item.historyId ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                        Selling...
                      </>
                    ) : confirmId === item.historyId ? (
                      <>
                        <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Confirm Sell ({SELL_PRICES[item.rarity]} GACHA)?
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        Sell ({SELL_PRICES[item.rarity]} GACHA)
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
