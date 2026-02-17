"use client"

import { useState, useCallback } from "react"
import { Coins, ArrowRightLeft, Plus, Loader2, ExternalLink, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { GVCOIN } from "@/lib/economy"

interface GVCoinPanelProps {
  walletAddress: string | null
  isConnected: boolean
  balance: number
  onBalanceUpdate?: (newBalance: number) => void
}

export function GVCoinPanel({ walletAddress, isConnected, balance, onBalanceUpdate }: GVCoinPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exchangeAmount, setExchangeAmount] = useState("")
  const [isExchanging, setIsExchanging] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    txHash?: string
  } | null>(null)

  const gachaAmount = Math.max(0, Math.floor(Number(exchangeAmount) || 0))
  const gvcOutput = gachaAmount >= GVCOIN.GACHA_PER_GVCOIN
    ? Math.floor(gachaAmount / GVCOIN.GACHA_PER_GVCOIN)
    : 0
  const validAmount = gvcOutput > 0 && gachaAmount <= balance

  const handleExchange = useCallback(async () => {
    if (!walletAddress || !validAmount || isExchanging) return

    const actualGacha = gvcOutput * GVCOIN.GACHA_PER_GVCOIN
    setIsExchanging(true)
    setResult(null)

    try {
      const res = await fetch("/api/gvcoin/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          gacha_amount: actualGacha,
        }),
      })
      const data = await res.json()

      if (data.success) {
        onBalanceUpdate?.(data.new_balance)
        setExchangeAmount("")
        setResult({
          success: true,
          message: `Exchanged ${data.gacha_spent} GACHA → ${data.gvc_received} GVC!`,
          txHash: data.tx_hash || undefined,
        })
      } else {
        setResult({
          success: false,
          message: data.error || "Exchange failed",
        })
      }
    } catch {
      setResult({
        success: false,
        message: "Network error. Please try again.",
      })
    } finally {
      setIsExchanging(false)
    }
  }, [walletAddress, validAmount, isExchanging, gvcOutput, onBalanceUpdate])

  const handleAddToMetaMask = useCallback(async () => {
    const ethereum = window?.ethereum
    if (!ethereum) return

    try {
      await ethereum.request({
        method: "wallet_watchAsset",
        params: [{
          type: "ERC20",
          options: {
            address: GVCOIN.CONTRACT_ADDRESS,
            symbol: GVCOIN.SYMBOL,
            decimals: GVCOIN.DECIMALS,
          },
        }] as unknown[],
      })
    } catch {
      // User rejected
    }
  }, [])

  const handleSetMax = useCallback(() => {
    const maxExchangeable = Math.floor(balance / GVCOIN.GACHA_PER_GVCOIN) * GVCOIN.GACHA_PER_GVCOIN
    setExchangeAmount(maxExchangeable.toString())
  }, [balance])

  if (!isConnected) return null

  const contractReady = GVCOIN.CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000"

  return (
    <div className="border-2 border-foreground rounded-2xl bg-card shadow-hard overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 border-2 border-foreground flex items-center justify-center shadow-hard-sm">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-sans text-sm font-bold text-card-foreground">GVCoin</h3>
            <p className="text-[10px] text-muted-foreground">On-chain Token</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[8px] px-1.5 py-0.5 rounded-full font-mono",
            contractReady
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
          )}>
            {contractReady ? "LIVE" : "TESTNET"}
          </span>
          <ArrowRightLeft className={cn(
            "w-4 h-4 transition-transform text-muted-foreground",
            isOpen && "rotate-90"
          )} />
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t-2 border-border p-4 space-y-4">
          {/* Exchange rate info */}
          <div className="text-center bg-muted/30 rounded-lg py-2 px-3">
            <p className="text-[10px] text-muted-foreground">Exchange Rate</p>
            <p className="font-mono text-sm font-bold text-card-foreground">
              {GVCOIN.GACHA_PER_GVCOIN} GACHA = 1 GVC
            </p>
          </div>

          {/* Exchange form */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-sans">Exchange GACHA → GVCoin</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={exchangeAmount}
                  onChange={(e) => setExchangeAmount(e.target.value)}
                  placeholder={`Min ${GVCOIN.GACHA_PER_GVCOIN}`}
                  min={GVCOIN.GACHA_PER_GVCOIN}
                  step={GVCOIN.GACHA_PER_GVCOIN}
                  className="w-full h-9 px-3 pr-14 rounded-lg border-2 border-border bg-background text-sm font-mono text-foreground focus:border-primary outline-none transition-colors"
                />
                <button
                  onClick={handleSetMax}
                  className="absolute right-1 top-1 h-7 px-2 rounded-md text-[10px] font-bold bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  MAX
                </button>
              </div>
              <button
                onClick={handleExchange}
                disabled={!validAmount || isExchanging}
                className={cn(
                  "h-9 px-4 rounded-lg border-2 text-xs font-sans transition-all touch-manipulation flex items-center gap-1.5",
                  validAmount && !isExchanging
                    ? "border-foreground bg-gradient-to-r from-amber-400 to-yellow-300 text-foreground shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                    : "border-border bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isExchanging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                )}
                {isExchanging ? "..." : "Swap"}
              </button>
            </div>

            {/* Preview */}
            {gachaAmount > 0 && (
              <div className={cn(
                "text-[11px] font-mono px-2 py-1 rounded",
                validAmount
                  ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50"
                  : "text-red-500 bg-red-50 dark:bg-red-950/50"
              )}>
                {validAmount
                  ? `→ You'll receive ${gvcOutput} GVC`
                  : gachaAmount > balance
                    ? `Not enough GACHA (have ${balance})`
                    : `Need at least ${GVCOIN.GACHA_PER_GVCOIN} GACHA`}
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={cn(
              "p-3 rounded-xl border-2 text-xs font-sans text-center animate-slide-up",
              result.success
                ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            )}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {result.success ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {result.message}
              </div>
              {result.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] underline mt-1"
                >
                  View on Etherscan <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          )}

          {/* Add to MetaMask */}
          {contractReady && (
            <button
              onClick={handleAddToMetaMask}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-[11px] font-sans text-muted-foreground hover:bg-muted transition-colors touch-manipulation"
            >
              <Plus className="w-3 h-3" />
              Add GVC to MetaMask
            </button>
          )}

          {/* Contract info */}
          <div className="text-[9px] text-muted-foreground text-center space-y-0.5">
            <p>Network: Sepolia Testnet (Chain ID {GVCOIN.CHAIN_ID})</p>
            {contractReady && (
              <a
                href={`https://sepolia.etherscan.io/address/${GVCOIN.CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline"
              >
                Contract: {GVCOIN.CONTRACT_ADDRESS.slice(0, 8)}...{GVCOIN.CONTRACT_ADDRESS.slice(-6)}
                <ExternalLink className="w-2 h-2" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
