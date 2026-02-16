"use client"

import { useState, useCallback, useEffect, useRef } from "react"

// Extend Window for ethereum provider
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
    }
  }
}

interface UseWalletReturn {
  address: string | null
  shortAddress: string
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  signMessage: (message: string) => Promise<string | null>
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function useWallet(): UseWalletReturn {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Listen for account changes
  useEffect(() => {
    const ethereum = window?.ethereum
    if (!ethereum) return

    const handleAccountsChanged = (accounts: unknown) => {
      const accts = accounts as string[]
      if (accts.length === 0) {
        setAddress(null)
      } else {
        setAddress(accts[0].toLowerCase())
      }
    }

    const handleChainChanged = () => {
      // Reload on chain change for safety
      window.location.reload()
    }

    ethereum.on("accountsChanged", handleAccountsChanged)
    ethereum.on("chainChanged", handleChainChanged)

    // Check if already connected
    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const accts = accounts as string[]
        if (accts.length > 0 && mountedRef.current) {
          setAddress(accts[0].toLowerCase())
        }
      })
      .catch(() => {})

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged)
      ethereum.removeListener("chainChanged", handleChainChanged)
    }
  }, [])

  const connect = useCallback(async () => {
    const ethereum = window?.ethereum
    if (!ethereum) {
      setError("MetaMask is not installed. Please install MetaMask to continue.")
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[]

      if (accounts.length > 0 && mountedRef.current) {
        const wallet = accounts[0].toLowerCase()
        setAddress(wallet)

        // Register wallet balance on server
        await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: wallet }),
        })
      }
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string }
      if (e.code === 4001) {
        setError("Connection rejected by user.")
      } else {
        setError("Failed to connect wallet.")
      }
    } finally {
      if (mountedRef.current) setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setError(null)
  }, [])

  const signMessage = useCallback(
    async (message: string): Promise<string | null> => {
      const ethereum = window?.ethereum
      if (!ethereum || !address) return null

      try {
        const signature = (await ethereum.request({
          method: "personal_sign",
          params: [message, address],
        })) as string
        return signature
      } catch {
        return null
      }
    },
    [address]
  )

  return {
    address,
    shortAddress: address ? shortenAddress(address) : "",
    isConnected: !!address,
    isConnecting,
    error,
    connect,
    disconnect,
    signMessage,
  }
}
