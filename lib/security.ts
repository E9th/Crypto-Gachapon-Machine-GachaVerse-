import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

/**
 * Verify that a wallet address is a valid Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Generate a random nonce for wallet signature verification
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Store a nonce in the database for later verification
 */
export async function storeNonce(walletAddress: string, nonce: string) {
  const supabase = await createClient()
  await supabase.from("auth_nonces").insert({
    nonce,
    wallet_address: walletAddress.toLowerCase(),
  })
}

/**
 * Verify and consume a nonce (prevents replay attacks)
 */
export async function verifyAndConsumeNonce(
  walletAddress: string,
  nonce: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("auth_nonces")
    .select("*")
    .eq("nonce", nonce)
    .eq("wallet_address", walletAddress.toLowerCase())
    .eq("used", false)
    .single()

  if (!data) return false

  // Mark as used
  await supabase.from("auth_nonces").update({ used: true }).eq("nonce", nonce)

  // Check nonce age (max 5 minutes)
  const nonceAge = Date.now() - new Date(data.created_at).getTime()
  if (nonceAge > 5 * 60 * 1000) return false

  return true
}

/**
 * Simple in-memory rate limiter for API routes
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  entry.count++
  const remaining = Math.max(0, maxRequests - entry.count)
  return { allowed: entry.count <= maxRequests, remaining }
}

/**
 * Clean up expired rate limit entries periodically
 */
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) rateLimitMap.delete(key)
    }
  }
  // Run cleanup every 5 minutes
  setInterval(cleanup, 5 * 60 * 1000).unref?.()
}

/**
 * Validate request body fields
 */
export function validateFields<T extends Record<string, unknown>>(
  body: T,
  required: string[]
): string | null {
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `Missing required field: ${field}`
    }
  }
  return null
}

/**
 * Get sell price based on item rarity
 */
export function getSellPrice(rarity: string): number {
  switch (rarity) {
    case "SSR":
      return 50
    case "Rare":
      return 20
    case "Common":
    default:
      return 5
  }
}
