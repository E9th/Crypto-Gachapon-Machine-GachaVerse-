"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { X, RotateCcw, Download, Loader2, Check, ExternalLink } from "lucide-react"
import type { GachaItem } from "@/lib/gacha/types"

interface RewardModalProps {
  item: (GachaItem & { historyId?: string }) | null
  isOpen: boolean
  onClose: () => void
  onSpinAgain: () => void
  onClaimNFT?: (historyId: string) => Promise<{
    success?: boolean
    error?: string
    nft?: { token_id: number; tx_hash: string; contract_address: string }
  } | undefined>
}

const rarityConfig: Record<string, { label: string; bg: string; border: string; text: string }> = {
  Common: { label: "COMMON", bg: "bg-muted", border: "border-border", text: "text-muted-foreground" },
  Rare: { label: "RARE", bg: "bg-secondary", border: "border-secondary", text: "text-secondary-foreground" },
  SSR: { label: "SSR", bg: "bg-accent", border: "border-accent", text: "text-accent-foreground" },
}

function Confetti() {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; color: string; delay: number; size: number }>>([])

  useEffect(() => {
    const colors = [
      "hsl(340, 65%, 72%)",
      "hsl(200, 60%, 88%)",
      "hsl(45, 80%, 68%)",
      "hsl(160, 50%, 60%)",
      "hsl(0, 0%, 100%)",
    ]
    const count = typeof window !== "undefined" && window.innerWidth < 640 ? 20 : 40
    const newPieces = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      size: Math.random() * 8 + 4,
    }))
    setPieces(newPieces)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute will-change-transform"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.id % 2 === 0 ? "50%" : "2px",
            animation: `confetti-fall ${2 + (piece.id % 3)}s linear ${piece.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

export function RewardModal({ item, isOpen, onClose, onSpinAgain, onClaimNFT }: RewardModalProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<{
    success: boolean
    message: string
    txHash?: string
  } | null>(null)

  // Reset claim state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsClaiming(false)
      setClaimResult(null)
    }
  }, [isOpen])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [isOpen])

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen || !item) return null

  const rarity = rarityConfig[item.rarity]

  return (
    <>
      <Confetti />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Reward modal"
      >
        {/* Modal Card - slides up on mobile, centered on desktop */}
        <div
          className="relative w-full sm:w-auto sm:max-w-sm bg-card border-2 border-foreground rounded-t-2xl sm:rounded-2xl shadow-hard-lg animate-scale-in mx-0 sm:mx-4 max-h-[90dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle on mobile */}
          <div className="flex justify-center pt-2 pb-0 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-foreground bg-card text-card-foreground hover:bg-muted transition-colors z-10 touch-manipulation"
            aria-label="Close reward modal"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="flex flex-col items-center p-5 sm:p-6 pt-4 sm:pt-8">
            <p className="font-sans text-[10px] sm:text-xs tracking-widest text-muted-foreground mb-1">YOU GOT</p>
            <h2 className="font-sans text-xl sm:text-2xl text-card-foreground mb-4 sm:mb-5 text-balance text-center">
              Congratulations!
            </h2>

            <div className={`relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl border-2 border-foreground overflow-hidden shadow-hard mb-3 sm:mb-4 ${item.rarity === "SSR" ? "animate-float will-change-transform" : ""}`}>
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 144px, 192px"
                className="object-cover"
              />
            </div>

            <h3 className="font-sans text-base sm:text-lg text-card-foreground mb-1.5 sm:mb-2">{item.name}</h3>

            <span
              className={`px-3 sm:px-4 py-1 rounded-full border-2 border-foreground text-[10px] sm:text-xs font-sans tracking-wider ${rarity.bg} ${rarity.text} shadow-hard-sm mb-5 sm:mb-6`}
            >
              {rarity.label}
            </span>

            {/* Claim result */}
            {claimResult && (
              <div
                className={`w-full mb-3 p-2.5 rounded-xl border text-[10px] sm:text-xs font-sans text-center ${
                  claimResult.success
                    ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}
              >
                <p>{claimResult.message}</p>
                {claimResult.txHash && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-[9px] opacity-80">
                    <ExternalLink className="w-2.5 h-2.5" />
                    TX: {claimResult.txHash.slice(0, 10)}...{claimResult.txHash.slice(-6)}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 sm:gap-3 w-full">
              <button
                onClick={async () => {
                  if (!onClaimNFT || !item?.historyId || isClaiming || claimResult?.success) return
                  setIsClaiming(true)
                  setClaimResult(null)
                  const result = await onClaimNFT(item.historyId)
                  setIsClaiming(false)
                  if (result?.success && result.nft) {
                    setClaimResult({
                      success: true,
                      message: `NFT Minted! Token #${result.nft.token_id}`,
                      txHash: result.nft.tx_hash,
                    })
                  } else {
                    setClaimResult({
                      success: false,
                      message: result?.error || "Failed to claim NFT",
                    })
                  }
                }}
                disabled={isClaiming || claimResult?.success === true}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl border-2 border-foreground font-sans text-xs sm:text-sm shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none touch-manipulation ${
                  claimResult?.success
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-secondary text-secondary-foreground"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    Minting...
                  </>
                ) : claimResult?.success ? (
                  <>
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Claimed!
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Claim NFT
                  </>
                )}
              </button>
              <button
                onClick={onSpinAgain}
                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl border-2 border-foreground bg-primary text-primary-foreground font-sans text-xs sm:text-sm shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none touch-manipulation"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Spin Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
