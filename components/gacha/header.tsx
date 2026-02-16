"use client"

import { Wallet, Star, Loader2, LogOut } from "lucide-react"

interface HeaderProps {
  isConnected: boolean
  isConnecting: boolean
  address: string
  error: string | null
  onConnect: () => void
  onDisconnect: () => void
}

export function Header({ isConnected, isConnecting, address, error, onConnect, onDisconnect }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-foreground bg-card">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 border-foreground bg-primary shadow-hard-sm flex-shrink-0">
          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-lg sm:text-xl font-sans tracking-tight text-card-foreground truncate">GachaVerse</h1>
      </div>

      <div className="flex items-center gap-2">
        {error && (
          <span className="hidden sm:block text-[10px] text-destructive font-sans max-w-[180px] truncate">
            {error}
          </span>
        )}

        {isConnected ? (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-foreground bg-secondary text-secondary-foreground shadow-hard-sm font-sans text-xs sm:text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="truncate max-w-[100px] sm:max-w-none">{address}</span>
            </div>
            <button
              onClick={onDisconnect}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-foreground bg-card text-card-foreground shadow-hard-sm hover:bg-muted transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation"
              aria-label="Disconnect wallet"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-foreground font-sans text-xs sm:text-sm bg-primary text-primary-foreground shadow-hard-sm hover:shadow-hard transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {isConnecting ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            ) : (
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            <span className="truncate max-w-[100px] sm:max-w-none">
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </span>
          </button>
        )}
      </div>
    </header>
  )
}
