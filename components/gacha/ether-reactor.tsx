"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Zap, ChevronUp, ChevronDown, ArrowUp, Coins } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { REACTOR, getUpgradeForLevel, getNextUpgrade } from "@/lib/economy"

interface EtherReactorProps {
  walletAddress: string | null
  isConnected: boolean
  balance: number
  onBalanceUpdate?: (newBalance: number) => void
}

export function EtherReactor({ walletAddress, isConnected, balance, onBalanceUpdate }: EtherReactorProps) {
  const [energy, setEnergy] = useState<number>(REACTOR.DEFAULT_MAX_ENERGY)
  const [maxEnergy, setMaxEnergy] = useState<number>(REACTOR.DEFAULT_MAX_ENERGY)
  const [level, setLevel] = useState(1)
  const [totalHarvested, setTotalHarvested] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [pendingClicks, setPendingClicks] = useState(0)
  const [floatingCoins, setFloatingCoins] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [sessionClicks, setSessionClicks] = useState(0)
  const [isUpgrading, setIsUpgrading] = useState(false)

  const pendingClicksRef = useRef(0)
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const coinIdRef = useRef(0)
  const regenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentUpgrade = getUpgradeForLevel(level)
  const nextUpgrade = getNextUpgrade(level)
  const clicksPerCoin = currentUpgrade.clicksPerCoin
  const regenRate = REACTOR.REGEN_PER_SECOND + currentUpgrade.regenBonus

  // Fetch initial energy from server
  useEffect(() => {
    if (!isConnected || !walletAddress) return

    fetch(`/api/reactor/energy?wallet=${walletAddress}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.energy !== undefined) {
          setEnergy(data.energy)
          setMaxEnergy(data.max_energy)
          setLevel(data.level)
          setTotalHarvested(data.total_harvested)
        }
      })
      .catch(() => {})
  }, [isConnected, walletAddress])

  // Client-side energy regen (visual only, server is source of truth)
  useEffect(() => {
    if (regenIntervalRef.current) clearInterval(regenIntervalRef.current)

    regenIntervalRef.current = setInterval(() => {
      setEnergy((prev) => {
        const next = prev + regenRate
        return Math.min(maxEnergy, Math.round(next * 100) / 100)
      })
    }, 1000)

    return () => {
      if (regenIntervalRef.current) clearInterval(regenIntervalRef.current)
    }
  }, [maxEnergy, regenRate])

  // Batch harvest: send accumulated clicks to server
  const flushHarvest = useCallback(async () => {
    const clicksToSend = pendingClicksRef.current
    if (clicksToSend <= 0 || !walletAddress) return

    pendingClicksRef.current = 0
    setPendingClicks(0)
    setIsSyncing(true)

    try {
      const res = await fetch("/api/reactor/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          clicks: clicksToSend,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setEnergy(data.energy)
        setMaxEnergy(data.max_energy)
        setLevel(data.level ?? level)
        setTotalHarvested(data.total_harvested)
        onBalanceUpdate?.(data.new_balance)
      } else if (data.energy !== undefined) {
        setEnergy(data.energy)
      }
    } catch {
      pendingClicksRef.current += clicksToSend
      setPendingClicks((prev) => prev + clicksToSend)
    } finally {
      setIsSyncing(false)
    }
  }, [walletAddress, onBalanceUpdate, level])

  // Schedule batch flush
  const scheduleBatch = useCallback(() => {
    if (batchTimerRef.current) return
    batchTimerRef.current = setTimeout(() => {
      batchTimerRef.current = null
      flushHarvest()
    }, REACTOR.BATCH_INTERVAL_SEC * 1000)
  }, [flushHarvest])

  // Flush on unmount or wallet change
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
        batchTimerRef.current = null
      }
      if (pendingClicksRef.current > 0) {
        flushHarvest()
      }
    }
  }, [flushHarvest])

  const handleCharge = useCallback(() => {
    if (energy < REACTOR.ENERGY_PER_CLICK || !isConnected) return

    // Optimistic update
    setIsClicking(true)
    setEnergy((prev) => Math.max(0, prev - REACTOR.ENERGY_PER_CLICK))
    setSessionClicks((prev) => prev + 1)
    pendingClicksRef.current += 1
    setPendingClicks((prev) => prev + 1)

    // Floating "+1" animation
    const id = ++coinIdRef.current
    const x = 30 + Math.random() * 40
    const y = 20 + Math.random() * 20
    setFloatingCoins((prev) => [...prev, { id, x, y }])
    setTimeout(() => {
      setFloatingCoins((prev) => prev.filter((c) => c.id !== id))
    }, 800)

    setTimeout(() => setIsClicking(false), 80)

    // Schedule batch send
    scheduleBatch()
  }, [energy, isConnected, scheduleBatch])

  // Upgrade handler
  const handleUpgrade = useCallback(async () => {
    if (!nextUpgrade || !walletAddress || balance < nextUpgrade.cost || isUpgrading) return

    setIsUpgrading(true)

    // Flush pending clicks first
    if (pendingClicksRef.current > 0) {
      await flushHarvest()
    }

    try {
      const res = await fetch("/api/reactor/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: walletAddress }),
      })
      const data = await res.json()

      if (data.success) {
        setLevel(data.new_level)
        setMaxEnergy(data.new_max_energy)
        setEnergy(data.energy)
        onBalanceUpdate?.(data.new_balance)
      }
    } catch {
      // ignore
    } finally {
      setIsUpgrading(false)
    }
  }, [nextUpgrade, walletAddress, balance, isUpgrading, flushHarvest, onBalanceUpdate])

  // Keyboard support — only when reactor panel is focused (not global)
  // IMPORTANT: e.repeat blocks spacebar hold
  const reactorRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code === "Space" && isOpen && !e.repeat) {
        e.preventDefault()
        handleCharge()
      }
    },
    [isOpen, handleCharge]
  )

  const energyPercent = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0
  const sessionCoins = Math.floor(sessionClicks / clicksPerCoin)
  const clicksTowardNextCoin = sessionClicks % clicksPerCoin

  if (!isConnected) return null

  return (
    <div
      ref={reactorRef}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out outline-none",
        isOpen ? "w-64 sm:w-72" : "w-auto"
      )}
    >
      <div className="bg-card border-2 border-foreground rounded-xl shadow-hard overflow-hidden">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white flex items-center justify-between cursor-pointer hover:from-blue-600 hover:to-cyan-500 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <Zap className="w-4 h-4 fill-current" />
            {isOpen ? "Ether Reactor" : "Reactor"}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-black/20 px-2 py-0.5 rounded">
              Lv.{level} · {Math.floor(energy)}/{maxEnergy}
            </span>
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </div>
        </button>

        {/* Content - Expandable */}
        {isOpen && (
          <div className="p-4 space-y-3">
            {/* Exchange rate info */}
            <div className="text-center text-[10px] text-muted-foreground font-mono bg-muted/40 rounded-lg py-1">
              {clicksPerCoin} clicks = 1 GACHA
            </div>

            {/* The Core Button */}
            <div className="flex justify-center relative">
              <button
                onClick={handleCharge}
                disabled={energy < REACTOR.ENERGY_PER_CLICK}
                className={cn(
                  "w-24 h-24 rounded-full border-4 border-foreground shadow-hard transition-all flex items-center justify-center relative group select-none touch-manipulation",
                  isClicking
                    ? "scale-95 translate-y-1 shadow-none"
                    : "hover:-translate-y-1 active:scale-95 active:translate-y-1 active:shadow-none",
                  energy >= REACTOR.ENERGY_PER_CLICK
                    ? "bg-gradient-to-br from-blue-400 to-cyan-300"
                    : "bg-gray-200 cursor-not-allowed opacity-60"
                )}
              >
                <Zap
                  className={cn(
                    "w-10 h-10 text-white transition-all",
                    energy >= REACTOR.ENERGY_PER_CLICK &&
                      "group-hover:scale-110 group-active:scale-90"
                  )}
                  fill="currentColor"
                />

                {/* Pulse ring */}
                {energy >= REACTOR.ENERGY_PER_CLICK && (
                  <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping opacity-20 pointer-events-none" />
                )}
              </button>

              {/* Floating click animations */}
              {floatingCoins.map((coin) => (
                <span
                  key={coin.id}
                  className="absolute text-cyan-500 font-bold text-sm pointer-events-none animate-float-up"
                  style={{ left: `${coin.x}%`, top: `${coin.y}%` }}
                >
                  +1
                </span>
              ))}
            </div>

            {/* Energy bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                <span>Core Energy</span>
                <span>{Math.floor(energy)}/{maxEnergy}</span>
              </div>
              <Progress
                value={energyPercent}
                className="h-2 border border-foreground/20"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Regen: {regenRate.toFixed(2)}/s</span>
                <span>Lv.{level}</span>
              </div>
            </div>

            {/* Click progress to next coin */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Progress to next coin
                </span>
                <span className="font-mono">{clicksTowardNextCoin}/{clicksPerCoin}</span>
              </div>
              <Progress
                value={(clicksTowardNextCoin / clicksPerCoin) * 100}
                className="h-1.5 border border-yellow-300/30"
              />
            </div>

            {/* Session stats */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/50 text-[10px] font-mono">
              <span className="text-muted-foreground">Session</span>
              <span className="text-foreground font-bold">
                {sessionClicks} clicks · +{sessionCoins} GACHA
              </span>
            </div>

            {/* Sync indicator */}
            {pendingClicks > 0 && (
              <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
                <div className={cn("w-1.5 h-1.5 rounded-full", isSyncing ? "bg-yellow-400 animate-pulse" : "bg-blue-400")} />
                {isSyncing ? "Syncing..." : `${pendingClicks} clicks pending`}
              </div>
            )}

            {/* Upgrade button */}
            {nextUpgrade ? (
              <button
                onClick={handleUpgrade}
                disabled={balance < nextUpgrade.cost || isUpgrading}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-sans transition-all touch-manipulation",
                  balance >= nextUpgrade.cost && !isUpgrading
                    ? "border-foreground bg-gradient-to-r from-amber-400 to-yellow-300 text-foreground shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                    : "border-border bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <ArrowUp className="w-3.5 h-3.5" />
                {isUpgrading
                  ? "Upgrading..."
                  : `Upgrade to Lv.${nextUpgrade.level} — ${nextUpgrade.cost} GACHA`}
              </button>
            ) : (
              <div className="w-full text-center text-[10px] text-muted-foreground font-sans py-1.5 rounded-lg bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-950 dark:to-yellow-950 border border-amber-300">
                ★ MAX LEVEL ★
              </div>
            )}

            {/* Next upgrade preview */}
            {nextUpgrade && (
              <div className="text-[9px] text-muted-foreground text-center space-y-0.5">
                <p>Next: Energy {currentUpgrade.maxEnergy}→{nextUpgrade.maxEnergy} · {nextUpgrade.clicksPerCoin} clicks/coin</p>
              </div>
            )}

            {/* Hint */}
            <p className="text-[9px] text-center text-muted-foreground">
              Click core or tap <kbd className="px-1 py-0.5 border rounded text-[8px] bg-muted">Space</kbd> (no hold)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
