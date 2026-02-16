import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress } from "@/lib/security"

/**
 * POST /api/auth/register
 * Register a wallet and initialize balance if new
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const walletAddress = body.wallet_address?.toLowerCase()

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if wallet already exists
  const { data: existing } = await supabase
    .from("wallet_balances")
    .select("wallet_address, balance")
    .eq("wallet_address", walletAddress)
    .single()

  if (existing) {
    return NextResponse.json({
      wallet_address: existing.wallet_address,
      balance: existing.balance,
      is_new: false,
    })
  }

  // Create new wallet with initial balance
  const { data, error } = await supabase
    .from("wallet_balances")
    .insert({ wallet_address: walletAddress, balance: 500 })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to register wallet" }, { status: 500 })
  }

  return NextResponse.json({
    wallet_address: data.wallet_address,
    balance: data.balance,
    is_new: true,
  })
}
