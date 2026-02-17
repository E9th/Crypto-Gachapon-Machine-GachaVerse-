"use client"

import { useState } from "react"
import Image from "next/image"
import { Package, DollarSign, Loader2, Recycle, Zap, Coins } from "lucide-react"
import type { GachaItem } from "@/lib/gacha/types"
import { SELL_PRICES, CONVERTER } from "@/lib/economy"

interface CollectionGridProps {
  items: Array<GachaItem & { historyId: string }>
  onSell?: (historyId: string) => Promise<{ success?: boolean; error?: string; sold_item?: string; sell_price?: number } | undefined>
  onConvert?: (historyId: string, rewardType: "energy" | "coins") => Promise<{
    success?: boolean
    error?: string
    converted_item?: string
    reward_type?: string
    reward_amount?: number
    new_balance?: number
    new_energy?: number
  } | undefined>
}

const rarityBadge: Record<string, string> = {
  Common: "bg-muted text-muted-foreground",
  Rare: "bg-secondary text-secondary-foreground",
  SSR: "bg-accent text-accent-foreground",
  UR: "bg-purple-500 text-white",
}

export function CollectionGrid({ items, onSell, onConvert }: CollectionGridProps) {
  const [sellingId, setSellingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [sellResult, setSellResult] = useState<{ success: boolean; message: string } | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertConfirmId, setConvertConfirmId] = useState<string | null>(null)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

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
      setRemovedIds((prev) => new Set(prev).add(historyId))
      setSellResult({ success: true, message: `Sold ${result.sold_item} for ${result.sell_price} GACHA!` })
      setTimeout(() => setSellResult(null), 3000)
    } else {
      setSellResult({ success: false, message: result?.error || "Failed to sell" })
      setTimeout(() => setSellResult(null), 3000)
    }
  }

  const handleConvertClick = (historyId: string) => {
    if (convertConfirmId === historyId) {
      handleConfirmConvert(historyId, "energy")
    } else {
      setConvertConfirmId(historyId)
      // Auto-dismiss after 4s
      setTimeout(() => setConvertConfirmId((prev) => (prev === historyId ? null : prev)), 4000)
    }
  }

  const handleConfirmConvert = async (historyId: string, rewardType: "energy" | "coins") => {
    if (!onConvert) return
    setConvertingId(historyId)
    setConvertConfirmId(null)

    // Short animation delay
    await new Promise((r) => setTimeout(r, 600))

    const result = await onConvert(historyId, rewardType)
    setConvertingId(null)

    if (result?.success) {
      setRemovedIds((prev) => new Set(prev).add(historyId))
      const rewardLabel = result.reward_type === "energy"
        ? `+${result.reward_amount} Energy`
        : `+${result.reward_amount} GACHA`
      setSellResult({
        success: true,
        message: `Converted ${result.converted_item} → ${rewardLabel}`,
      })
      setTimeout(() => setSellResult(null), 3000)
    } else {
      setSellResult({ success: false, message: result?.error || "Failed to convert" })
      setTimeout(() => setSellResult(null), 3000)
    }
  }

  // Filter out sold/converted items to prevent empty grid slots
  const visibleItems = items.filter((item) => !removedIds.has(item.historyId))

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h2 className="font-sans text-lg sm:text-xl text-foreground">My Collection</h2>
          <span className="ml-auto text-xs sm:text-sm font-sans text-muted-foreground">
            {visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Result toast */}
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

        {visibleItems.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mb-2 sm:mb-3" />
            <p className="font-sans text-sm text-muted-foreground text-center">
              No items yet, go spin!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {visibleItems.map((item) => {
              const isConfirmingSell = confirmId === item.historyId
              const isSelling = sellingId === item.historyId
              const isConfirmingConvert = convertConfirmId === item.historyId
              const isConverting = convertingId === item.historyId
              const isBusy = isSelling || isConverting

              return (
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

                    {/* Convert confirm row — replaces action buttons when active */}
                    {isConfirmingConvert ? (
                      <div className="flex gap-1">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleConfirmConvert(item.historyId, "energy")}
                          onKeyDown={(e) => e.key === "Enter" && handleConfirmConvert(item.historyId, "energy")}
                          className="flex-1 flex items-center justify-center gap-0.5 py-1 sm:py-1.5 rounded-lg border border-cyan-400 bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 text-[9px] sm:text-[10px] font-sans cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-900 transition-colors touch-manipulation select-none"
                        >
                          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span>+{CONVERTER.REWARDS[item.rarity]?.energy || 15}</span>
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleConfirmConvert(item.historyId, "coins")}
                          onKeyDown={(e) => e.key === "Enter" && handleConfirmConvert(item.historyId, "coins")}
                          className="flex-1 flex items-center justify-center gap-0.5 py-1 sm:py-1.5 rounded-lg border border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 text-[9px] sm:text-[10px] font-sans cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900 transition-colors touch-manipulation select-none"
                        >
                          <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span>+{CONVERTER.REWARDS[item.rarity]?.coins || 2}</span>
                        </div>
                      </div>
                    ) : (
                      /* Normal action buttons */
                      <div className="flex gap-1">
                        {/* Sell button */}
                        <button
                          onClick={() => handleSellClick(item.historyId)}
                          disabled={isBusy}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg border text-[9px] sm:text-[10px] font-sans transition-colors touch-manipulation ${
                            isConfirmingSell
                              ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                              : isSelling
                                ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                                : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {isSelling ? (
                            <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                          ) : isConfirmingSell ? (
                            <>
                              <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span>{SELL_PRICES[item.rarity]}?</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden sm:inline">Sell</span>
                            </>
                          )}
                        </button>

                        {/* Convert button */}
                        <button
                          onClick={() => handleConvertClick(item.historyId)}
                          disabled={isBusy}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg border text-[9px] sm:text-[10px] font-sans transition-colors touch-manipulation ${
                            isConverting
                              ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                              : "border-border text-muted-foreground hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-600 dark:hover:bg-cyan-950 dark:hover:text-cyan-400"
                          }`}
                        >
                          {isConverting ? (
                            <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                          ) : (
                            <>
                              <Recycle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden sm:inline">Convert</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
