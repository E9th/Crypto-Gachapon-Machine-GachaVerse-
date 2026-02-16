"use client"

import { useState, useCallback, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { Header } from "@/components/gacha/header"
import { MachineDisplay } from "@/components/gacha/machine-display"
import { ControlPanel } from "@/components/gacha/control-panel"
import { RewardModal } from "@/components/gacha/reward-modal"
import { CollectionGrid } from "@/components/gacha/collection-grid"
import { useWallet } from "@/hooks/use-wallet"
import type { GachaItem } from "@/lib/gacha/types"

const SPIN_COST = 10

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function GachaPage() {
  const wallet = useWallet()
  const [balance, setBalance] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [showCapsule, setShowCapsule] = useState(false)
  const [rewardItem, setRewardItem] = useState<(GachaItem & { historyId?: string }) | null>(null)
  const [showReward, setShowReward] = useState(false)

  // Fetch items pool (for drop rate display)
  const { data: items } = useSWR<GachaItem[]>("/api/items", fetcher)

  // Fetch balance from server
  const { data: balanceData, mutate: mutateBalance } = useSWR(
    wallet.isConnected ? `/api/balance?wallet_address=${wallet.address}` : null,
    fetcher
  )

  // Sync balance from server
  useEffect(() => {
    if (balanceData?.balance !== undefined) {
      setBalance(Number(balanceData.balance))
    }
  }, [balanceData])

  // Fetch spin history (for recent drops & collection)
  const { data: history } = useSWR(
    wallet.isConnected ? `/api/history?wallet=${wallet.address}` : null,
    fetcher
  )

  // Derive recent won items from history
  const wonItems: Array<GachaItem & { historyId: string }> =
    history?.map((entry: { id: string; items: GachaItem }) => ({
      ...entry.items,
      historyId: entry.id,
    })) ?? []

  const handleSpin = useCallback(async () => {
    if (isSpinning || !wallet.isConnected || !wallet.address || balance < SPIN_COST) return

    setIsSpinning(true)
    setShowCapsule(false)
    setShowReward(false)
    setRewardItem(null)

    // Phase 1: Machine shakes (0-2s)
    setTimeout(async () => {
      setIsSpinning(false)
      setShowCapsule(true)

      // Phase 2: Call API, then reveal
      try {
        const res = await fetch("/api/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: wallet.address }),
        })
        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.error || "Spin failed")
        }

        // Update balance from server response
        if (result.new_balance !== undefined) {
          setBalance(result.new_balance)
        }

        setTimeout(() => {
          setRewardItem({ ...result, historyId: result.history_id })
          setShowCapsule(false)
          setShowReward(true)
          // Revalidate history so recent drops and collection update
          mutate(`/api/history?wallet=${wallet.address}`)
        }, 1200)
      } catch {
        setShowCapsule(false)
        // Refresh balance from server in case of error
        mutateBalance()
      }
    }, 2000)
  }, [isSpinning, wallet.isConnected, wallet.address, balance, mutateBalance])

  const handleCloseReward = useCallback(() => {
    setShowReward(false)
    setRewardItem(null)
  }, [])

  const handleSpinAgain = useCallback(() => {
    setShowReward(false)
    setRewardItem(null)
    setTimeout(() => {
      handleSpin()
    }, 300)
  }, [handleSpin])

  // Sell an item
  const handleSell = useCallback(async (historyId: string) => {
    if (!wallet.address) return
    try {
      const res = await fetch("/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet.address, spin_history_id: historyId }),
      })
      const result = await res.json()
      if (result.success) {
        setBalance(result.new_balance)
        mutate(`/api/history?wallet=${wallet.address}`)
      }
      return result
    } catch {
      return { error: "Network error" }
    }
  }, [wallet.address])

  // Claim NFT
  const handleClaimNFT = useCallback(async (historyId: string) => {
    if (!wallet.address) return
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet.address, spin_history_id: historyId }),
      })
      const result = await res.json()
      return result
    } catch {
      return { error: "Network error" }
    }
  }, [wallet.address])

  // Compute drop rates from items data (multiply by 100 for percentage display)
  const dropRates = items
    ? {
        Common: Math.round(
          items
            .filter((i) => i.rarity === "Common")
            .reduce((sum, i) => sum + i.drop_rate, 0) * 100
        ),
        Rare: Math.round(
          items
            .filter((i) => i.rarity === "Rare")
            .reduce((sum, i) => sum + i.drop_rate, 0) * 100
        ),
        SSR: Math.round(
          items
            .filter((i) => i.rarity === "SSR")
            .reduce((sum, i) => sum + i.drop_rate, 0) * 100
        ),
      }
    : { Common: 70, Rare: 25, SSR: 5 }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <Header
        isConnected={wallet.isConnected}
        isConnecting={wallet.isConnecting}
        address={wallet.shortAddress}
        error={wallet.error}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Decorative heading */}
        <div className="text-center mb-5 sm:mb-8">
          <p className="text-[10px] sm:text-xs font-sans tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground uppercase mb-1 sm:mb-2">
            Spin the machine, collect rare NFTs
          </p>
          <h2 className="text-2xl sm:text-3xl font-sans text-foreground text-balance">
            What will you get today?
          </h2>
        </div>

        {/* Two Column Layout - stacks on mobile */}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
          {/* Left: Machine - centered on all screen sizes */}
          <div className="flex-1 flex justify-center w-full">
            <MachineDisplay isSpinning={isSpinning} showCapsule={showCapsule} />
          </div>

          {/* Right: Controls - full width mobile, fixed width desktop */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <ControlPanel
              balance={balance}
              wonItems={wonItems}
              isSpinning={isSpinning}
              isConnected={wallet.isConnected}
              onSpin={handleSpin}
              dropRates={dropRates}
            />
          </div>
        </div>
      </main>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <div className="border-t-2 border-border" />
      </div>

      {/* Collection */}
      <CollectionGrid items={wonItems} onSell={handleSell} />

      {/* Reward Modal */}
      <RewardModal
        item={rewardItem}
        isOpen={showReward}
        onClose={handleCloseReward}
        onSpinAgain={handleSpinAgain}
        onClaimNFT={handleClaimNFT}
      />
    </div>
  )
}
