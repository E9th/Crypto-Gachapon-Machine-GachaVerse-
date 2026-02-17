"use client"

import { Zap, Trophy, Sparkles } from "lucide-react"
import Image from "next/image"
import type { GachaItem } from "@/lib/gacha/types"
import { SPIN } from "@/lib/economy"

interface ControlPanelProps {
  balance: number
  wonItems: Array<GachaItem & { historyId: string }>
  isSpinning: boolean
  isConnected: boolean
  onSpin: () => void
  dropRates: { Common: number; Rare: number; SSR: number; UR: number }
}

const rarityColors: Record<string, string> = {
  Common: "bg-muted text-muted-foreground",
  Rare: "bg-secondary text-secondary-foreground",
  SSR: "bg-accent text-accent-foreground",
  UR: "bg-purple-500 text-white",
}

export function ControlPanel({
  balance,
  wonItems,
  isSpinning,
  isConnected,
  onSpin,
  dropRates,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Balance + Drop Rates row on mobile, stacked on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-5">
        {/* Balance Card */}
        <div className="border-2 border-foreground rounded-2xl bg-card p-4 sm:p-5 shadow-hard">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <h3 className="font-sans text-xs sm:text-sm text-muted-foreground">Your Balance</h3>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-sans text-card-foreground">{balance.toLocaleString()}</span>
            <span className="text-xs sm:text-sm font-sans text-muted-foreground">GACHA</span>
          </div>
        </div>

        {/* Rate Info */}
        <div className="border-2 border-foreground rounded-2xl bg-card p-3 sm:p-4 shadow-hard-sm">
          <h4 className="font-sans text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">Drop Rates</h4>
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-sans text-card-foreground">Common</span>
              <span className="text-[10px] sm:text-xs font-sans px-1.5 sm:px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                {dropRates.Common}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-sans text-card-foreground">Rare</span>
              <span className="text-[10px] sm:text-xs font-sans px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                {dropRates.Rare}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-sans text-card-foreground">SSR</span>
              <span className="text-[10px] sm:text-xs font-sans px-1.5 sm:px-2 py-0.5 rounded-full bg-accent text-accent-foreground border border-border">
                {dropRates.SSR}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-sans text-card-foreground">UR</span>
              <span className="text-[10px] sm:text-xs font-sans px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500 text-white border border-purple-400">
                {dropRates.UR}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <button
        onClick={onSpin}
        disabled={isSpinning || !isConnected || balance < SPIN.COST}
        className={`relative w-full py-3 sm:py-4 px-6 sm:px-8 rounded-2xl border-2 border-foreground font-sans text-base sm:text-lg transition-all touch-manipulation ${
          isSpinning || !isConnected || balance < SPIN.COST
            ? "bg-muted text-muted-foreground cursor-not-allowed shadow-hard-sm"
            : "bg-primary text-primary-foreground shadow-hard hover:shadow-hard-lg active:translate-x-[4px] active:translate-y-[4px] active:shadow-none animate-pulse-glow"
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
          <span className="truncate">
            {isSpinning ? "Spinning..." : !isConnected ? "Connect Wallet First" : balance < SPIN.COST ? "Not Enough GACHA" : "SPIN NOW"}
          </span>
        </span>
      </button>

      {/* Last Won Items */}
      <div className="border-2 border-foreground rounded-2xl bg-card p-4 sm:p-5 shadow-hard">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
          <h3 className="font-sans text-xs sm:text-sm text-muted-foreground">Recent Drops</h3>
        </div>

        {wonItems.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground font-sans text-center py-3 sm:py-4">
            No drops yet, spin to win!
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3">
            {wonItems.slice(0, 5).map((item) => (
              <div
                key={item.historyId}
                className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl border border-border bg-background animate-slide-up"
              >
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 border-foreground overflow-hidden flex-shrink-0">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 32px, 40px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-sans text-card-foreground truncate">{item.name}</p>
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-sans px-1.5 sm:px-2 py-0.5 rounded-full border border-border flex-shrink-0 ${rarityColors[item.rarity]}`}
                >
                  {item.rarity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
