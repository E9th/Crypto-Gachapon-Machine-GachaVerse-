"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Battery, Zap, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { REACTOR } from "@/lib/economy"

interface EtherReactorProps {
  walletAddress: string | null
  isConnected: boolean
  onBalanceUpdate?: (newBalance: number) => void
}

export function EtherReactor({ walletAddress, isConnected, onBalanceUpdate }: EtherReactorProps) {
  const [energy, setEnergy] = useState<number>(REACTOR.DEFAULT_MAX_ENERGY)
  const [maxEnergy, setMaxEnergy] = useState<number>(REACTOR.DEFAULT_MAX_ENERGY)
  const [level, setLevel] = useState(1)
  const [totalHarvested, setTotalHarvested] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [pendingClicks, setPendingClicks] = useState(0)
  const [floatingCoins, setFloatingCoins] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [sessionCoins, setSessionCoins] = useState(0)

  const pendingClicksRef = useRef(0)
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const coinIdRef = useRef(0)
  const regenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
        const next = prev + REACTOR.REGEN_PER_SECOND
        return Math.min(maxEnergy, Math.round(next * 100) / 100)
      })
    }, 1000)

    return () => {
      if (regenIntervalRef.current) clearInterval(regenIntervalRef.current)
    }
  }, [maxEnergy])

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
        setTotalHarvested(data.total_harvested)
        onBalanceUpdate?.(data.new_balance)
      } else if (data.energy !== undefined) {
        // Sync energy from server even on error
        setEnergy(data.energy)
      }
    } catch {
      // If network error, re-add clicks for next batch
      pendingClicksRef.current += clicksToSend
      setPendingClicks((prev) => prev + clicksToSend)
    } finally {
      setIsSyncing(false)
    }
  }, [walletAddress, onBalanceUpdate])

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
    setSessionCoins((prev) => prev + REACTOR.COINS_PER_CLICK)
    pendingClicksRef.current += 1
    setPendingClicks((prev) => prev + 1)

    // Floating coin animation
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

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && isOpen) {
        e.preventDefault()
        handleCharge()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, handleCharge])

  const energyPercent = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0

  if (!isConnected) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-auto"
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
              {Math.floor(energy)}/{maxEnergy}
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
          <div className="p-4 space-y-4">
            {/* The Core Button */}
            <div className="flex justify-center relative">
              <button
                onClick={handleCharge}
                disabled={energy < REACTOR.ENERGY_PER_CLICK}
                className={cn(
                  "w-24 h-24 rounded-full border-4 border-foreground shadow-hard transition-all flex items-center justify-center relative group select-none",
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

              {/* Floating coin animations */}
              {floatingCoins.map((coin) => (
                <span
                  key={coin.id}
                  className="absolute text-yellow-500 font-bold text-sm pointer-events-none animate-float-up"
                  style={{ left: `${coin.x}%`, top: `${coin.y}%` }}
                >
                  +{REACTOR.COINS_PER_CLICK}
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
                <span>Regen: {REACTOR.REGEN_PER_SECOND}/s</span>
                <span>Lv.{level}</span>
              </div>
            </div>

            {/* Session stats */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/50 text-[10px] font-mono">
              <span className="text-muted-foreground">Session</span>
              <span className="text-foreground font-bold">+{sessionCoins} GACHA</span>
            </div>

            {/* Sync indicator */}
            {pendingClicks > 0 && (
              <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
                <div className={cn("w-1.5 h-1.5 rounded-full", isSyncing ? "bg-yellow-400 animate-pulse" : "bg-blue-400")} />
                {isSyncing ? "Syncing..." : `${pendingClicks} clicks pending`}
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 border-foreground/50"
                disabled
              >
                <Battery className="w-3 h-3 mr-1" />
                Refill
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-8 border-foreground/50"
                disabled
              >
                Upgrade
              </Button>
            </div>

            {/* Hint */}
            <p className="text-[9px] text-center text-muted-foreground">
              Press <kbd className="px-1 py-0.5 border rounded text-[8px] bg-muted">Space</kbd> or click to harvest
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
